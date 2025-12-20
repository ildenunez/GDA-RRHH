
import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate, ShiftType, ShiftAssignment, Holiday, PPEType, PPERequest, RequestType, OvertimeUsage } from '../types';
import { supabase } from './supabase';

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
        const { data: smtpData } = await supabase.from('settings').select('value').eq('key', 'smtp').maybeSingle();

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({ id: d.id, name: String(d.name || ''), supervisorIds: d.supervisor_ids || [] }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        if (typesData) this.config.leaveTypes = typesData.map((t: any) => ({ id: t.id, label: String(t.label || ''), subtractsDays: !!t.subtracts_days, fixedRange: t.fixed_range }));
        if (shiftTypesData) this.config.shiftTypes = shiftTypesData.map((s: any) => ({ id: s.id, name: String(s.name || ''), color: String(s.color || '#cccccc'), segments: s.segments || [] }));
        if (shiftAssignmentsData) this.config.shiftAssignments = shiftAssignmentsData.map((a: any) => ({ id: a.id, userId: a.user_id, date: String(a.date || ''), shiftTypeId: a.shift_type_id }));
        if (holidaysData) this.config.holidays = holidaysData.map((h: any) => ({ id: h.id, date: String(h.date || ''), name: String(h.name || '') }));
        if (ppeTypes) this.config.ppeTypes = ppeTypes.map((p: any) => ({ id: p.id, name: String(p.name || ''), sizes: p.sizes || [] }));
        if (ppeRequests) this.config.ppeRequests = ppeRequests.map((r: any) => ({ id: r.id, userId: r.user_id, typeId: r.type_id, type_id: r.type_id, size: String(r.size || ''), status: r.status, createdAt: String(r.created_at || ''), deliveryDate: r.delivery_date }));
        if (notificationsData) this.notifications = this.mapNotificationsFromDB(notificationsData);
        if (smtpData) this.config.smtpSettings = smtpData.value;
        
        const savedUser = localStorage.getItem('gda_session');
        if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);
              const freshUser = this.users.find(u => u.id === parsed.id);
              if (freshUser) this.currentUser = freshUser;
            } catch(e) { localStorage.removeItem('gda_session'); }
        }

        this.initialized = true;
        this.notify();
    } catch (error) {
        console.error("Critical Store Init Error:", error);
    }
  }

  private mapUsersFromDB(data: any[]): User[] {
      return data.map(u => ({
          id: u.id,
          name: String(u.name || 'Usuario'),
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
          id: r.id, 
          userId: r.user_id, 
          typeId: r.type_id, 
          label: String(r.label || 'Solicitud'), 
          startDate: String(r.start_date || ''), 
          endDate: r.end_date,
          hours: r.hours, 
          reason: r.reason, 
          status: r.status as RequestStatus, 
          createdAt: String(r.created_at || ''),
          adminComment: r.admin_comment, 
          createdByAdmin: !!r.created_by_admin, 
          isConsumed: !!r.is_consumed,
          consumedHours: r.consumed_hours, 
          overtimeUsage: r.overtime_usage, 
          isJustified: !!r.is_justified, 
          reportedToAdmin: !!r.reported_to_admin
      }));
  }

  private mapNotificationsFromDB(data: any[]): Notification[] {
    return data.map(n => ({
        id: String(n.id),
        userId: n.user_id,
        message: String(n.message || ''),
        read: !!n.read,
        date: String(n.date || n.created_at || '')
    }));
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!this.initialized) await this.init();
    const user = this.users.find(u => u.email === email.trim().toLowerCase());
    if (user) {
        const { data } = await supabase.from('users').select('password').eq('id', user.id).maybeSingle();
        if (data && String(data.password) === String(pass)) {
            this.currentUser = { ...user };
            localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
            return this.currentUser;
        }
    }
    return null;
  }

  logout() {
      this.currentUser = null;
      localStorage.removeItem('gda_session');
      this.notify();
  }

  private calculateRequestImpact(typeId: string, startDate: string, endDate?: string, hours?: number) {
      let deltaDays = 0;
      let deltaHours = 0;
      const leaveType = this.config.leaveTypes.find(t => t.id === typeId);

      if (leaveType && leaveType.subtractsDays) {
          const start = new Date(startDate);
          const end = new Date(endDate || startDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            deltaDays = -diffDays;
          }
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
      hours: data.hours, reason: data.reason, status, created_at: new Date().toISOString(),
      overtime_usage: data.overtimeUsage, is_justified: data.isJustified, reported_to_admin: data.reportedToAdmin
    }).select().single();

    if (inserted) {
      this.requests.push(this.mapRequestsFromDB([inserted])[0]);
      if (status === RequestStatus.APPROVED || (data.typeId === RequestType.ADJUSTMENT_DAYS || data.typeId === RequestType.ADJUSTMENT_OVERTIME)) {
          const { deltaDays, deltaHours } = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
          const u = this.users.find(usr => usr.id === userId);
          if (u) await this.updateUserBalance(userId, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
      }
      this.notify();
    }
  }

  async updateRequest(id: string, data: any) {
    let label = data.label || this.config.leaveTypes.find(t => t.id === data.typeId)?.label || data.typeId;
    const { data: updated } = await supabase.from('requests').update({
      type_id: data.typeId, label, start_date: data.startDate, end_date: data.endDate,
      hours: data.hours, reason: data.reason, is_justified: data.isJustified,
      reported_to_admin: data.reportedToAdmin, overtime_usage: data.overtimeUsage
    }).eq('id', id).select().single();

    if (updated) {
        const idx = this.requests.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.requests[idx] = this.mapRequestsFromDB([updated])[0];
        }
        this.notify();
    }
  }

  async updateRequestStatus(id: string, status: RequestStatus, adminId: string, adminComment?: string) {
    const oldReq = this.requests.find(r => r.id === id);
    if (!oldReq) return;

    if (oldReq.status !== RequestStatus.APPROVED && status === RequestStatus.APPROVED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
    } else if (oldReq.status === RequestStatus.APPROVED && status !== RequestStatus.APPROVED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
    }

    await supabase.from('requests').update({ status, admin_comment: adminComment }).eq('id', id);
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
        this.requests[idx].status = status;
        this.requests[idx].adminComment = adminComment;
    }
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
          localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
      }
    }
    this.notify();
  }

  async createUser(user: Partial<User>, password: string) {
    const { data } = await supabase.from('users').insert({
      name: user.name,
      email: user.email?.trim().toLowerCase(),
      role: user.role,
      department_id: user.departmentId,
      days_available: user.daysAvailable || 22,
      overtime_hours: user.overtimeHours || 0,
      password: password || '123456'
    }).select().single();

    if (data) {
      const newUser = this.mapUsersFromDB([data])[0];
      this.users.push(newUser);
      this.notify();
    }
  }

  async updateUserAdmin(userId: string, data: Partial<User>) {
    const { data: updated } = await supabase.from('users').update({
      name: data.name, email: data.email?.trim().toLowerCase(), department_id: data.departmentId
    }).eq('id', userId).select().single();

    if (updated) {
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...this.mapUsersFromDB([updated])[0] };
        if (this.currentUser?.id === userId) {
          this.currentUser = { ...this.users[idx] };
          localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
        }
      }
      this.notify();
    }
  }

  async updateUserRole(userId: string, role: Role) {
    const { data: updated } = await supabase.from('users').update({ role }).eq('id', userId).select().single();
    if (updated) {
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        this.users[idx].role = role;
        if (this.currentUser?.id === userId) {
          this.currentUser.role = role;
          localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
        }
      }
      this.notify();
    }
  }

  async updateUserProfile(userId: string, data: { name: string; email: string; password?: string; avatar?: string }) {
    const updateData: any = { name: data.name, email: data.email.trim().toLowerCase(), avatar: data.avatar };
    if (data.password) updateData.password = data.password;

    const { data: updated } = await supabase.from('users').update(updateData).eq('id', userId).select().single();
    if (updated) {
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        this.users[idx] = { ...this.users[idx], ...this.mapUsersFromDB([updated])[0] };
        if (this.currentUser?.id === userId) {
          this.currentUser = { ...this.users[idx] };
          localStorage.setItem('gda_session', JSON.stringify(this.currentUser));
        }
      }
      this.notify();
    }
  }

  async deleteRequest(id: string) {
    const req = this.requests.find(r => r.id === id);
    if (req && req.status === RequestStatus.APPROVED) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(req.typeId, req.startDate, req.endDate, req.hours);
        const u = this.users.find(usr => usr.id === req.userId);
        if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
    }
    await supabase.from('requests').delete().eq('id', id);
    this.requests = this.requests.filter(r => r.id !== id);
    this.notify();
  }

  getMyRequests() { 
    if (!this.currentUser) return [];
    return this.requests
      .filter(r => r.userId === this.currentUser!.id)
      .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')); 
  }

  getAllUsers() { return this.users; }

  getNotificationsForUser(userId: string) { 
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a,b) => (b.date || '').localeCompare(a.date || '')); 
  }

  getPendingApprovalsForUser(userId: string) {
    const u = this.users.find(usr => usr.id === userId);
    if (!u) return [];
    const depts = u.role === Role.ADMIN ? this.departments.map(d => d.id) : this.departments.filter(d => d.supervisorIds.includes(userId)).map(d => d.id);
    return this.requests.filter(r => r.status === RequestStatus.PENDING && depts.includes(this.users.find(usr => usr.id === r.userId)?.departmentId || ''));
  }

  isOvertimeRequest(typeId: string) { return [RequestType.OVERTIME_EARN, RequestType.OVERTIME_PAY, RequestType.OVERTIME_SPEND_DAYS, RequestType.WORKED_HOLIDAY, RequestType.ADJUSTMENT_OVERTIME].includes(typeId as RequestType); }
  
  getAvailableOvertimeRecords(userId: string) { return this.requests.filter(r => r.userId === userId && r.status === RequestStatus.APPROVED && (r.typeId === RequestType.OVERTIME_EARN || r.typeId === RequestType.WORKED_HOLIDAY) && (Number(r.hours || 0) - Number(r.consumedHours || 0)) > 0.01); }
  
  getCalendarRequests(userId: string, deptId?: string) { return this.requests.filter(r => { if (this.isOvertimeRequest(r.typeId) && r.typeId !== RequestType.WORKED_HOLIDAY) return false; if (deptId) return this.users.find(u => u.id === r.userId)?.departmentId === deptId; return true; }); }
  
  getShiftForUserDate(userId: string, date: string) { 
    const a = this.config.shiftAssignments.find(as => as.userId === userId && as.date === date); 
    if (!a) return undefined;
    return this.config.shiftTypes.find(s => s.id === a.shiftTypeId);
  }

  getNextShift(userId: string) { 
    const today = new Date().toISOString().split('T')[0]; 
    const a = this.config.shiftAssignments
      .filter(as => as.userId === userId && as.date >= today)
      .sort((a,b) => (a.date || '').localeCompare(b.date || ''))[0]; 
    
    if (!a) return null;
    const shift = this.config.shiftTypes.find(s => s.id === a.shiftTypeId);
    if (!shift) return null;
    return { date: a.date, shift }; 
  }

  async assignShift(user_id: string, date: string, shift_type_id: string) {
    if (!shift_type_id) { await supabase.from('shift_assignments').delete().match({ user_id, date }); this.config.shiftAssignments = this.config.shiftAssignments.filter(a => !(a.userId === user_id && a.date === date)); }
    else { const { data } = await supabase.from('shift_assignments').upsert({ user_id, date, shift_type_id }).select().single(); if (data) { const idx = this.config.shiftAssignments.findIndex(a => a.userId === user_id && a.date === date); const m = { id: data.id, userId: data.user_id, date: data.date, shiftTypeId: data.shift_type_id }; if (idx !== -1) this.config.shiftAssignments[idx] = m; else this.config.shiftAssignments.push(m); } }
    this.notify();
  }

  async markNotificationAsRead(id: string) { await supabase.from('notifications').update({ read: true }).eq('id', id); const n = this.notifications.find(notif => notif.id === id); if (n) n.read = true; this.notify(); }
  async markAllNotificationsAsRead(userId: string) { await supabase.from('notifications').update({ read: true }).eq('user_id', userId); this.notifications.forEach(n => { if (n.userId === userId) n.read = true; }); this.notify(); }
  async deleteNotification(id: string) { await supabase.from('notifications').delete().eq('id', id); this.notifications = this.notifications.filter(n => n.id !== id); this.notify(); }
  
  async createPPERequest(userId: string, typeId: string, size: string) {
    const { data } = await supabase.from('ppe_requests').insert({ user_id: userId, type_id: typeId, size, status: 'PENDIENTE', created_at: new Date().toISOString() }).select().single();
    if (data) { const mapped = { id: data.id, userId: data.user_id, typeId: data.type_id, type_id: data.type_id, size: data.size, status: data.status, createdAt: data.created_at, deliveryDate: data.delivery_date }; this.config.ppeRequests.push(mapped); this.notify(); }
  }
  async deliverPPERequest(id: string) { const d = new Date().toISOString(); await supabase.from('ppe_requests').update({ status: 'ENTREGADO', delivery_date: d }).eq('id', id); const req = this.config.ppeRequests.find(r => r.id === id); if (req) { req.status = 'ENTREGADO'; req.deliveryDate = d; this.notify(); } }
}

export const store = new Store();
