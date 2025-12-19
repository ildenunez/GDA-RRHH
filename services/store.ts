
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

  // Sistema de suscripción para que los componentes reaccionen a cambios en el store
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
        const { data: smtpData } = await supabase.from('settings').select('value').eq('key', 'smtp').single();

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({ id: d.id, name: d.name, supervisorIds: d.supervisor_ids || [] }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        if (typesData) this.config.leaveTypes = typesData.map((t: any) => ({ id: t.id, label: t.label, subtracts_days: !!t.subtracts_days, fixed_range: t.fixed_range }));
        if (shiftTypesData) this.config.shiftTypes = shiftTypesData.map((s: any) => ({ id: s.id, name: s.name, color: s.color, segments: s.segments || [] }));
        if (shiftAssignmentsData) this.config.shiftAssignments = shiftAssignmentsData.map((a: any) => ({ id: a.id, userId: a.user_id, date: a.date, shiftTypeId: a.shift_type_id }));
        if (holidaysData) this.config.holidays = holidaysData.map((h: any) => ({ id: h.id, date: h.date, name: h.name }));
        if (ppeTypes) this.config.ppeTypes = ppeTypes.map((p: any) => ({ id: p.id, name: p.name, sizes: p.sizes || [] }));
        if (ppeRequests) this.config.ppeRequests = ppeRequests.map((r: any) => ({ id: r.id, userId: r.user_id, typeId: r.type_id, type_id: r.type_id, size: r.size, status: r.status, createdAt: r.created_at, deliveryDate: r.delivery_date }));
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

  // Mapper for notifications from DB
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
            this.currentUser = user;
            return user;
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
    const { data: inserted, error } = await supabase.from('requests').insert({
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

  // Update an existing request
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
      type_id: data.typeId,
      label,
      start_date: data.startDate,
      end_date: data.endDate,
      hours: data.hours,
      reason: data.reason,
      overtime_usage: data.overtimeUsage
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
      if (this.currentUser?.id === id) this.currentUser = { ...this.users[idx] };
    }
    this.notify();
  }

  // Get available overtime records for consumption
  getAvailableOvertimeRecords(userId: string): LeaveRequest[] {
    return this.requests.filter(r => 
      r.userId === userId && 
      r.status === RequestStatus.APPROVED && 
      (r.typeId === RequestType.OVERTIME_EARN || r.typeId === RequestType.WORKED_HOLIDAY) &&
      (Number(r.hours || 0) - Number(r.consumedHours || 0)) > 0.01
    );
  }

  // Métodos de acceso rápido
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
  getShiftForUserDate(userId: string, date: string) {
    const a = this.config.shiftAssignments.find(as => as.userId === userId && as.date === date);
    return a ? this.config.shiftTypes.find(s => s.id === a.shiftTypeId) : undefined;
  }
  getNextShift(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const a = this.config.shiftAssignments.filter(as => as.userId === userId && as.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0];
    return a ? { date: a.date, shift: this.config.shiftTypes.find(s => s.id === a.shiftTypeId)! } : null;
  }
  getCalendarRequests(userId: string, deptId?: string) {
      return this.requests.filter(r => {
          if (this.isOvertimeRequest(r.typeId) && r.typeId !== RequestType.WORKED_HOLIDAY) return false;
          if (deptId) return this.users.find(u => u.id === r.userId)?.departmentId === deptId;
          return true;
      });
  }

  // Gestión de turnos y otros
  async assignShift(user_id: string, date: string, shift_type_id: string) {
    if (!shift_type_id) {
        await supabase.from('shift_assignments').delete().match({ user_id, date });
        this.config.shiftAssignments = this.config.shiftAssignments.filter(a => !(a.userId === user_id && a.date === date));
    } else {
        const { data } = await supabase.from('shift_assignments').upsert({ user_id, date, shift_type_id }).select().single();
        if (data) {
            const idx = this.config.shiftAssignments.findIndex(a => a.userId === user_id && a.date === date);
            const m = { id: data.id, userId: data.user_id, date: data.date, shiftTypeId: data.shift_type_id };
            if (idx !== -1) this.config.shiftAssignments[idx] = m; else this.config.shiftAssignments.push(m);
        }
    }
    this.notify();
  }

  async markNotificationAsRead(id: string) { await supabase.from('notifications').update({ read: true }).eq('id', id); const n = this.notifications.find(not => not.id === id); if(n) n.read = true; this.notify(); }
  async deleteNotification(id: string) { await supabase.from('notifications').delete().eq('id', id); this.notifications = this.notifications.filter(n => n.id !== id); this.notify(); }
  async markAllNotificationsAsRead(userId: string) { await supabase.from('notifications').update({ read: true }).eq('user_id', userId); this.notifications.forEach(n => { if(n.userId === userId) n.read = true; }); this.notify(); }

  async updateUserProfile(id: string, data: any) {
    const upd: any = { name: data.name, email: data.email, avatar: data.avatar };
    if (data.password) upd.password = data.password;
    await supabase.from('users').update(upd).eq('id', id);
    const u = this.users.find(usr => usr.id === id);
    if (u) { Object.assign(u, { name: data.name, email: data.email, avatar: data.avatar }); if(this.currentUser?.id === id) this.currentUser = {...u}; }
    this.notify();
  }

  async createUser(u: any, pass: string) {
      const { data } = await supabase.from('users').insert({ name: u.name, email: u.email, password: pass, role: u.role, department_id: u.departmentId, days_available: u.daysAvailable, overtime_hours: u.overtimeHours }).select().single();
      if (data) this.users.push(this.mapUsersFromDB([data])[0]);
      this.notify();
  }
  async deleteUser(id: string) { await supabase.from('users').delete().eq('id', id); this.users = this.users.filter(u => u.id !== id); this.notify(); }
  async updateUserAdmin(id: string, data: any) { await supabase.from('users').update({ name: data.name, email: data.email, department_id: data.departmentId }).eq('id', id); const u = this.users.find(usr => usr.id === id); if(u) Object.assign(u, data); this.notify(); }
  async updateUserRole(id: string, role: Role) { await supabase.from('users').update({ role }).eq('id', id); const u = this.users.find(usr => usr.id === id); if(u) u.role = role; this.notify(); }

  async updateJustification(id: string, is_justified: boolean, reported_to_admin: boolean) {
      await supabase.from('requests').update({ is_justified, reported_to_admin }).eq('id', id);
      const r = this.requests.find(req => req.id === id);
      if(r) { r.isJustified = is_justified; r.reportedToAdmin = reported_to_admin; }
      this.notify();
  }

  async startNewYear() {
      const year = new Date().getFullYear() + 1;
      for (const u of this.users) {
          await this.createRequest({ typeId: RequestType.ADJUSTMENT_DAYS, label: `Vacaciones ${year}`, startDate: new Date().toISOString(), hours: 31, reason: 'Inicio de año' }, u.id, RequestStatus.APPROVED);
      }
  }

  getRequestConflicts(req: LeaveRequest) {
    const r = this.users.find(u => u.id === req.userId);
    if (!r) return [];
    return this.requests.filter(o => {
        if (o.id === req.id || o.status === RequestStatus.REJECTED || this.isOvertimeRequest(o.typeId)) return false;
        const uo = this.users.find(u => u.id === o.userId);
        if (!uo || uo.departmentId !== r.departmentId) return false;
        const s1 = new Date(req.startDate).getTime(); const e1 = new Date(req.endDate || req.startDate).getTime();
        const s2 = new Date(o.startDate).getTime(); const e2 = new Date(o.endDate || o.startDate).getTime();
        return s1 <= e2 && s2 <= e1;
    });
  }

  async addLeaveType(t: any) { await supabase.from('leave_types').insert({ id: t.id, label: t.label, subtracts_days: t.subtractsDays, fixed_range: t.fixedRange }); this.config.leaveTypes.push(t); this.notify(); }
  async updateLeaveType(t: any) { await supabase.from('leave_types').update({ label: t.label, subtracts_days: t.subtractsDays, fixed_range: t.fixedRange }).eq('id', t.id); const idx = this.config.leaveTypes.findIndex(i => i.id === t.id); if(idx !== -1) this.config.leaveTypes[idx] = t; this.notify(); }
  async removeLeaveType(id: string) { await supabase.from('leave_types').delete().eq('id', id); this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id); this.notify(); }
  async addDepartment(d: any) { const { data } = await supabase.from('departments').insert({ name: d.name, supervisor_ids: d.supervisorIds }).select().single(); if(data) this.departments.push({ id: data.id, name: data.name, supervisorIds: data.supervisor_ids || [] }); this.notify(); }
  async updateDepartment(d: any) { await supabase.from('departments').update({ name: d.name, supervisor_ids: d.supervisorIds }).eq('id', d.id); const idx = this.departments.findIndex(i => i.id === d.id); if(idx !== -1) this.departments[idx] = d; this.notify(); }
  async removeDepartment(id: string) { await supabase.from('departments').delete().eq('id', id); this.departments = this.departments.filter(d => d.id !== id); this.notify(); }
  async addShiftType(s: any) { const { data } = await supabase.from('shift_types').insert({ name: s.name, color: s.color, segments: s.segments }).select().single(); if(data) this.config.shiftTypes.push({ id: data.id, name: data.name, color: data.color, segments: data.segments || [] }); this.notify(); }
  async updateShiftType(s: any) { await supabase.from('shift_types').update({ name: s.name, color: s.color, segments: s.segments }).eq('id', s.id); const idx = this.config.shiftTypes.findIndex(i => i.id === s.id); if(idx !== -1) this.config.shiftTypes[idx] = s; this.notify(); }
  async deleteShiftType(id: string) { await supabase.from('shift_types').delete().eq('id', id); this.config.shiftTypes = this.config.shiftTypes.filter(s => s.id !== id); this.notify(); }
  async addHoliday(date: string, name: string) { const { data } = await supabase.from('holidays').insert({ date, name }).select().single(); if(data) this.config.holidays.push({ id: data.id, date: data.date, name: data.name }); this.notify(); }
  async updateHoliday(id: string, date: string, name: string) { await supabase.from('holidays').update({ date, name }).eq('id', id); const idx = this.config.holidays.findIndex(i => i.id === id); if(idx !== -1) this.config.holidays[idx] = { id, date, name }; this.notify(); }
  async deleteHoliday(id: string) { await supabase.from('holidays').delete().eq('id', id); this.config.holidays = this.config.holidays.filter(h => h.id !== id); this.notify(); }
  async addPPEType(p: any) { const { data } = await supabase.from('ppe_types').insert(p).select().single(); if(data) this.config.ppeTypes.push({ id: data.id, name: data.name, sizes: data.sizes }); this.notify(); }
  async deletePPEType(id: string) { await supabase.from('ppe_types').delete().eq('id', id); this.config.ppeTypes = this.config.ppeTypes.filter(p => p.id !== id); this.notify(); }
  async createPPERequest(user_id: string, type_id: string, size: string) { const { data } = await supabase.from('ppe_requests').insert({ user_id, type_id, size, status: 'PENDIENTE', created_at: new Date().toISOString() }).select().single(); if(data) this.config.ppeRequests.unshift({ id: data.id, userId: data.user_id, typeId: data.type_id, type_id: data.type_id, size: data.size, status: data.status, createdAt: data.created_at }); this.notify(); }
  async deliverPPERequest(id: string) { const d = new Date().toISOString(); await supabase.from('ppe_requests').update({ status: 'ENTREGADO', delivery_date: d }).eq('id', id); const r = this.config.ppeRequests.find(req => req.id === id); if(r) { r.status = 'ENTREGADO'; r.deliveryDate = d; } this.notify(); }
  async updateSmtpSettings(s: any) { this.config.smtpSettings = s; await supabase.from('settings').upsert({ key: 'smtp', value: s }); this.notify(); }
  async sendMassNotification(users: string[], message: string) { const ns = users.map(uid => ({ user_id: uid, message, date: new Date().toISOString(), read: false })); const { data } = await supabase.from('notifications').insert(ns).select(); if(data) this.notifications.push(...this.mapNotificationsFromDB(data)); this.notify(); }
  
  async sendTestEmail(to: string): Promise<any> {
      try {
          const { data, error } = await supabase.functions.invoke('send-test-email', { body: { to, config: this.config.smtpSettings } });
          if(error) return { success: false, log: [error.message] };
          return { success: data?.success, log: data?.success ? ["OK"] : [data?.error] };
      } catch(e: any) { return { success: false, log: [e.message] }; }
  }
}

export const store = new Store();
