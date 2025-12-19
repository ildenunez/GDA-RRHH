
import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate, ShiftType, ShiftAssignment, Holiday, PPEType, PPERequest, RequestType } from '../types';
import { supabase } from './supabase';

const LABEL_TRANSLATIONS: Record<string, string> = {
  'overtime_pay': 'Abono en Nómina',
  'overtime_earn': 'Registro Horas Extra',
  'overtime_spend_days': 'Canje Horas por Días',
  'unjustified_absence': 'Ausencia Justificable',
  'adjustment_days': 'Ajuste Días',
  'overtime_adjustment': 'Ajuste Horas Extra',
  'vacation': 'Vacaciones',
  'sick_leave': 'Baja Médica'
};

class Store {
  users: User[] = [];
  departments: Department[] = [];
  requests: LeaveRequest[] = [];
  notifications: Notification[] = [];
  config: AppConfig = {
    leaveTypes: [],
    emailTemplates: [],
    shifts: [],
    shiftTypes: [],
    shiftAssignments: [],
    holidays: [],
    ppeTypes: [],
    ppeRequests: [],
    smtpSettings: { host: 'smtp.gmail.com', port: 587, user: 'admin@empresa.com', password: '', enabled: false }
  };

  currentUser: User | null = null;
  initialized = false;
  private listeners: (() => void)[] = [];

  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Fetch initial data from Supabase
  async init() {
    if (this.initialized) return;
    try {
        const { data: usersData } = await supabase.from('users').select('*');
        const { data: deptsData } = await supabase.from('departments').select('*');
        const { data: reqsData } = await supabase.from('requests').select('*');
        const { data: typesData } = await supabase.from('leave_types').select('*');
        const { data: shiftTypesData } = await supabase.from('shift_types').select('*');
        const { data: shiftAssignmentsData } = await supabase.from('shift_assignments').select('*');
        const { data: holidaysData } = await supabase.from('holidays').select('*');
        const { data: ppeTypes } = await supabase.from('ppe_types').select('*');
        const { data: ppeRequests } = await supabase.from('ppe_requests').select('*');
        const { data: notificationsData } = await supabase.from('notifications').select('*');
        const { data: smtpData } = await supabase.from('settings').select('value').eq('key', 'smtp').single();

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({ id: d.id, name: d.name, supervisorIds: d.supervisor_ids || [] }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        if (typesData) this.config.leaveTypes = typesData.map((t: any) => ({ id: t.id, label: t.label, subtractsDays: !!t.subtracts_days, fixed_range: t.fixed_range }));
        if (shiftTypesData) this.config.shiftTypes = shiftTypesData.map((s: any) => ({ id: s.id, name: s.name, color: s.color, segments: s.segments || [] }));
        if (shiftAssignmentsData) this.config.shiftAssignments = shiftAssignmentsData.map((a: any) => ({ id: a.id, userId: a.user_id, date: a.date, shiftTypeId: a.shift_type_id }));
        if (holidaysData) this.config.holidays = holidaysData.map((h: any) => ({ id: h.id, date: h.date, name: h.name }));
        if (ppeTypes) this.config.ppeTypes = ppeTypes.map((p: any) => ({ id: p.id, name: p.name, sizes: p.sizes || [] }));
        if (ppeRequests) this.config.ppeRequests = ppeRequests.map((r: any) => ({ id: r.id, userId: r.user_id, typeId: r.type_id, type_id: r.type_id, size: r.size, status: r.status, createdAt: r.created_at, deliveryDate: r.delivery_date }));
        if (notificationsData) this.notifications = this.mapNotificationsFromDB(notificationsData);
        if (smtpData) this.config.smtpSettings = smtpData.value;
        
        this.initialized = true;
        this.notify();
    } catch (error) {
        console.error("Error init store:", error);
    }
  }

  private mapUsersFromDB(data: any[]): User[] {
      return data.map(u => ({
          id: u.id,
          name: String(u.name || ''),
          email: String(u.email || '').trim().toLowerCase(),
          role: u.role as Role,
          departmentId: u.department_id,
          daysAvailable: Number(u.days_available || 0),
          overtimeHours: Number(u.overtime_hours || 0),
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=random`
      }));
  }

  private mapRequestsFromDB(data: any[]): LeaveRequest[] {
      return data.map(r => ({
          id: r.id, userId: r.user_id, typeId: r.type_id, label: r.label, startDate: r.start_date, endDate: r.end_date,
          hours: r.hours, reason: r.reason, status: r.status as RequestStatus, createdAt: r.created_at,
          adminComment: r.admin_comment, createdByAdmin: !!r.created_by_admin, isConsumed: !!r.is_consumed,
          consumedHours: r.consumed_hours, overtimeUsage: r.overtime_usage, isJustified: !!r.is_justified, reported_to_admin: !!r.reported_to_admin
      }));
  }

  private mapNotificationsFromDB(data: any[]): Notification[] {
    return data.map(n => ({
        id: String(n.id),
        userId: n.user_id,
        message: n.message,
        read: !!n.read,
        date: n.date
    }));
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!this.initialized) await this.init();
    const user = this.users.find(u => u.email === email.trim().toLowerCase());
    if (user) {
        const { data } = await supabase.from('users').select('password').eq('id', user.id).single();
        if (data && String(data.password) === String(pass)) {
            this.currentUser = { ...user };
            return this.currentUser;
        }
    }
    return null;
  }

  private calculateRequestImpact(typeId: string, startDate: string, endDate?: string, hours?: number) {
      let deltaDays = 0;
      let deltaHours = 0;
      const leaveType = this.config.leaveTypes.find(t => t.id === typeId);

      if (leaveType && leaveType.subtractsDays) {
          const start = new Date(startDate);
          const end = new Date(endDate || startDate);
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          deltaDays = -diffDays;
      }

      switch (typeId) {
          case RequestType.OVERTIME_EARN: deltaHours = +(hours || 0); break;
          case RequestType.OVERTIME_PAY:
          case RequestType.OVERTIME_SPEND_DAYS: deltaHours = -(hours || 0); break;
          case RequestType.ADJUSTMENT_DAYS: deltaDays = +(hours || 0); break;
          case RequestType.ADJUSTMENT_OVERTIME: deltaHours = +(hours || 0); break;
          case RequestType.WORKED_HOLIDAY: deltaDays = +1; break;
      }
      return { deltaDays, deltaHours };
  }

  async createRequest(data: any, userId: string, status: RequestStatus = RequestStatus.PENDING) {
    let label = data.label || this.config.leaveTypes.find(t => t.id === data.typeId)?.label || data.typeId;
    const { data: inserted } = await supabase.from('requests').insert({
      user_id: userId, type_id: data.typeId, label, start_date: data.startDate, end_date: data.endDate,
      hours: data.hours, reason: data.reason, status, created_at: new Date().toISOString()
    }).select().single();

    if (inserted) {
      this.requests.push(this.mapRequestsFromDB([inserted])[0]);
      if (status !== RequestStatus.REJECTED) {
          const { deltaDays, deltaHours } = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
          const u = this.users.find(usr => usr.id === userId);
          if (u) await this.updateUserBalance(userId, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
      }
      this.notify();
    }
  }

  async updateRequest(id: string, data: any) {
    const oldReq = this.requests.find(r => r.id === id);
    if (!oldReq) return;

    if (oldReq.status === RequestStatus.APPROVED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
    }

    const label = data.label || this.config.leaveTypes.find(t => t.id === data.typeId)?.label || data.typeId;
    const { data: updated } = await supabase.from('requests').update({
      type_id: data.typeId, label, start_date: data.startDate, end_date: data.endDate,
      hours: data.hours, reason: data.reason, overtime_usage: data.overtimeUsage
    }).eq('id', id).select().single();

    if (updated) {
      const idx = this.requests.findIndex(r => r.id === id);
      if (idx !== -1) {
        this.requests[idx] = this.mapRequestsFromDB([updated])[0];
        if (this.requests[idx].status === RequestStatus.APPROVED) {
            const { deltaDays, deltaHours } = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
            const u = this.users.find(usr => usr.id === oldReq.userId);
            if (u) await this.updateUserBalance(u.id, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
        }
      }
    }
    this.notify();
  }

  async updateRequestStatus(id: string, status: RequestStatus, adminId: string, adminComment?: string) {
    const oldReq = this.requests.find(r => r.id === id);
    if (!oldReq) return;

    if (oldReq.status !== RequestStatus.REJECTED && status === RequestStatus.REJECTED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
    } else if (oldReq.status === RequestStatus.REJECTED && status !== RequestStatus.REJECTED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
    }

    await supabase.from('requests').update({ status, admin_comment: adminComment }).eq('id', id);
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
        this.requests[idx].status = status;
        this.requests[idx].adminComment = adminComment;
    }
    this.notify();
  }

  async deleteRequest(id: string) {
    const req = this.requests.find(r => r.id === id);
    if (req && req.status !== RequestStatus.REJECTED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(req.typeId, req.startDate, req.endDate, req.hours);
        const u = this.users.find(usr => usr.id === req.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
    }
    await supabase.from('requests').delete().eq('id', id);
    this.requests = this.requests.filter(r => r.id !== id);
    this.notify();
  }

  async updateUserBalance(id: string, daysAvailable: number, overtimeHours: number) {
    await supabase.from('users').update({ days_available: daysAvailable, overtime_hours: overtimeHours }).eq('id', id);
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users[idx].daysAvailable = daysAvailable;
      this.users[idx].overtimeHours = overtimeHours;
      if (this.currentUser?.id === id) {
          this.currentUser = { ...this.users[idx] };
      }
    }
    this.notify();
  }

  // Mark a single notification as read in the database and local state
  async markNotificationAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    const n = this.notifications.find(notif => notif.id === id);
    if (n) n.read = true;
    this.notify();
  }

  // Mark all notifications for a specific user as read
  async markAllNotificationsAsRead(userId: string) {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    this.notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this.notify();
  }

  // Delete a specific notification
  async deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  // Create a new PPE request for a user
  async createPPERequest(userId: string, typeId: string, size: string) {
    const { data } = await supabase.from('ppe_requests').insert({
      user_id: userId,
      type_id: typeId,
      size,
      status: 'PENDIENTE',
      created_at: new Date().toISOString()
    }).select().single();
    
    if (data) {
      const mapped = { 
        id: data.id, 
        userId: data.user_id, 
        typeId: data.type_id, 
        type_id: data.type_id, 
        size: data.size, 
        status: data.status, 
        createdAt: data.created_at, 
        deliveryDate: data.delivery_date 
      };
      this.config.ppeRequests.push(mapped);
      this.notify();
    }
  }

  // Update a PPE request status to delivered
  async deliverPPERequest(id: string) {
    const deliveryDate = new Date().toISOString();
    await supabase.from('ppe_requests').update({ status: 'ENTREGADO', delivery_date: deliveryDate }).eq('id', id);
    const req = this.config.ppeRequests.find(r => r.id === id);
    if (req) {
      req.status = 'ENTREGADO';
      req.deliveryDate = deliveryDate;
      this.notify();
    }
  }

  getMyRequests() { return this.currentUser ? this.requests.filter(r => r.userId === this.currentUser!.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : []; }
  getAllUsers() { return this.users; }
  getNotificationsForUser(userId: string) { return this.notifications.filter(n => n.userId === userId).sort((a,b) => b.date.localeCompare(a.date)); }
  getPendingApprovalsForUser(userId: string) {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return [];
    const depts = u.role === Role.ADMIN ? this.departments.map(d => d.id) : this.departments.filter(d => d.supervisorIds.includes(userId)).map(d => d.id);
    return this.requests.filter(r => r.status === RequestStatus.PENDING && depts.includes(this.users.find(usr => usr.id === r.userId)?.departmentId || ''));
  }
  isOvertimeRequest(typeId: string) { return [RequestType.OVERTIME_EARN, RequestType.OVERTIME_PAY, RequestType.OVERTIME_SPEND_DAYS, RequestType.WORKED_HOLIDAY, RequestType.ADJUSTMENT_OVERTIME].includes(typeId as RequestType); }
  getAvailableOvertimeRecords(userId: string) { return this.requests.filter(r => r.userId === userId && r.status === RequestStatus.APPROVED && (r.typeId === RequestType.OVERTIME_EARN || r.typeId === RequestType.WORKED_HOLIDAY) && (Number(r.hours || 0) - Number(r.consumedHours || 0)) > 0.01); }
  getCalendarRequests(userId: string, deptId?: string) { return this.requests.filter(r => { if (this.isOvertimeRequest(r.typeId) && r.typeId !== RequestType.WORKED_HOLIDAY) return false; if (deptId) return this.users.find(u => u.id === r.userId)?.departmentId === deptId; return true; }); }
  getShiftForUserDate(userId: string, date: string) { const a = this.config.shiftAssignments.find(as => as.userId === userId && as.date === date); return a ? this.config.shiftTypes.find(s => s.id === a.shiftTypeId) : undefined; }
  getNextShift(userId: string) { const today = new Date().toISOString().split('T')[0]; const a = this.config.shiftAssignments.filter(as => as.userId === userId && as.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0]; return a ? { date: a.date, shift: this.config.shiftTypes.find(s => s.id === a.shiftTypeId)! } : null; }

  async assignShift(user_id: string, date: string, shift_type_id: string) {
    if (!shift_type_id) { await supabase.from('shift_assignments').delete().match({ user_id, date }); this.config.shiftAssignments = this.config.shiftAssignments.filter(a => !(a.userId === user_id && a.date === date)); }
    else { const { data } = await supabase.from('shift_assignments').upsert({ user_id, date, shift_type_id }).select().single(); if (data) { const idx = this.config.shiftAssignments.findIndex(a => a.userId === user_id && a.date === date); const m = { id: data.id, userId: data.user_id, date: data.date, shiftTypeId: data.shift_type_id }; if (idx !== -1) this.config.shiftAssignments[idx] = m; else this.config.shiftAssignments.push(m); } }
    this.notify();
  }

  async createUser(u: any, pass: string) { const { data } = await supabase.from('users').insert({ name: u.name, email: u.email, password: pass, role: u.role, department_id: u.departmentId, days_available: u.days_available, overtime_hours: u.overtime_hours }).select().single(); if (data) this.users.push(this.mapUsersFromDB([data])[0]); this.notify(); }
  async deleteUser(id: string) { await supabase.from('users').delete().eq('id', id); this.users = this.users.filter(u => u.id !== id); this.notify(); }
  async updateUserAdmin(id: string, data: any) { await supabase.from('users').update({ name: data.name, email: data.email, department_id: data.departmentId }).eq('id', id); const u = this.users.find(usr => usr.id === id); if(u) Object.assign(u, data); this.notify(); }
  async updateUserRole(id: string, role: Role) { await supabase.from('users').update({ role }).eq('id', id); const u = this.users.find(usr => usr.id === id); if(u) u.role = role; this.notify(); }
  async updateUserProfile(id: string, data: any) { const upd: any = { name: data.name, email: data.email, avatar: data.avatar }; if (data.password) upd.password = data.password; await supabase.from('users').update(upd).eq('id', id); const u = this.users.find(usr => usr.id === id); if (u) { Object.assign(u, { name: data.name, email: data.email, avatar: data.avatar }); if(this.currentUser?.id === id) this.currentUser = {...u}; } this.notify(); }
}

export const store = new Store();
