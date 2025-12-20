
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
        const { data: settingsData } = await supabase.from('settings').select('*');

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
        
        // Load Settings
        if (settingsData) {
            const smtp = settingsData.find(s => s.key === 'smtp');
            if (smtp) this.config.smtpSettings = smtp.value;

            const templates = settingsData.find(s => s.key === 'email_templates');
            if (templates && Array.isArray(templates.value)) {
                this.config.emailTemplates = templates.value;
                const defaults = this.getDefaultEmailTemplates();
                defaults.forEach(d => {
                    if (!this.config.emailTemplates.find(t => t.id === d.id)) {
                        this.config.emailTemplates.push(d);
                    }
                });
            } else {
                this.config.emailTemplates = this.getDefaultEmailTemplates();
            }
        } else {
             this.config.emailTemplates = this.getDefaultEmailTemplates();
        }
        
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

  private getDefaultEmailTemplates(): EmailTemplate[] {
      return [
          {
              id: 'request_created',
              label: 'Ausencia: Nueva Solicitud',
              subject: 'Nueva solicitud de {tipo} - {empleado}',
              body: 'Hola,\n\nSe ha registrado una nueva solicitud de {tipo} para el empleado {empleado}.\n\nFechas: {fechas}\nMotivo: {motivo}\n\nPor favor, acceda al panel para gestionarla.',
              recipients: { worker: true, supervisor: true, admin: false }
          },
          {
              id: 'request_approved',
              label: 'Ausencia: Aprobada',
              subject: 'Solicitud Aprobada: {tipo}',
              body: 'Hola {empleado},\n\nTu solicitud de {tipo} para las fechas {fechas} ha sido APROBADA por {supervisor}.\n\nObservaciones: {comentario_admin}\n\nDisfruta de tu tiempo.',
              recipients: { worker: true, supervisor: false, admin: false }
          },
          {
              id: 'request_rejected',
              label: 'Ausencia: Rechazada',
              subject: 'Solicitud Rechazada: {tipo}',
              body: 'Hola {empleado},\n\nTu solicitud de {tipo} para las fechas {fechas} ha sido RECHAZADA.\n\nMotivo del rechazo: {comentario_admin}\n\nContacta con tu supervisor para más detalles.',
              recipients: { worker: true, supervisor: false, admin: false }
          },
          {
              id: 'overtime_created',
              label: 'Horas: Nuevo Registro',
              subject: 'Nuevo registro de horas - {empleado}',
              body: 'Hola,\n\nEl empleado {empleado} ha registrado horas extra / festivo trabajado.\n\nCantidad: {horas}h\nFecha: {fechas}\n\nPendiente de aprobación.',
              recipients: { worker: true, supervisor: true, admin: false }
          },
          {
              id: 'overtime_approved',
              label: 'Horas: Aprobadas',
              subject: 'Horas Extra Aprobadas',
              body: 'Hola {empleado},\n\nTu registro de horas del día {fechas} ha sido validado correctamente y añadido a tu saldo.\n\nSaldo actual: {saldo_horas}h',
              recipients: { worker: true, supervisor: false, admin: false }
          },
          {
              id: 'overtime_consumed',
              label: 'Horas: Canje por Días',
              subject: 'Solicitud de Canje de Horas',
              body: 'Hola,\n\n{empleado} solicita canjear {horas}h de su saldo por descanso el día {fechas}.\n\nPor favor, valide la solicitud.',
              recipients: { worker: true, supervisor: true, admin: false }
          },
          {
              id: 'adjustment_applied',
              label: 'Regularización Admin',
              subject: 'Ajuste de Saldo en su cuenta',
              body: 'Hola {empleado},\n\nSe ha realizado una regularización manual en su saldo de vacaciones/horas.\n\nMotivo: {motivo}\n\nConsulte su perfil para ver el saldo actualizado.',
              recipients: { worker: true, supervisor: false, admin: false }
          }
      ];
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
          id: String(r.id), // Ensure ID is string for strict equality checks
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

  // Helper function to calculate Days/Hours impact
  private calculateRequestImpact(typeId: string, startDate: string, endDate?: string, hours?: number) {
      let deltaDays = 0;
      let deltaHours = 0;
      const leaveType = this.config.leaveTypes.find(t => t.id === typeId);

      // 1. Absences
      if (leaveType && leaveType.subtractsDays) {
          const start = new Date(startDate);
          const end = new Date(endDate || startDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            deltaDays = -diffDays; // Subtract days
          }
      }

      // 2. Overtime Logic
      switch (typeId) {
          case RequestType.OVERTIME_EARN: deltaHours = +(hours || 0); break;
          case RequestType.OVERTIME_PAY:
          case RequestType.OVERTIME_SPEND_DAYS: deltaHours = -(hours || 0); break;
          case RequestType.ADJUSTMENT_DAYS: deltaDays = +(hours || 0); break; // Add/Sub based on sign
          case RequestType.ADJUSTMENT_OVERTIME: deltaHours = +(hours || 0); break; // Add/Sub based on sign
          case RequestType.WORKED_HOLIDAY: deltaDays = +1; break; // Add 1 day
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
      
      // LOGIC CHANGE: Deduct balance on PENDING or APPROVED.
      if (status === RequestStatus.PENDING || status === RequestStatus.APPROVED) {
          const { deltaDays, deltaHours } = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
          const isEarning = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY, RequestType.ADJUSTMENT_DAYS, RequestType.ADJUSTMENT_OVERTIME].includes(data.typeId);
          
          if (!isEarning || status === RequestStatus.APPROVED) {
             const u = this.users.find(usr => usr.id === userId);
             if (u) await this.updateUserBalance(userId, u.daysAvailable + deltaDays, u.overtimeHours + deltaHours);
          }
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

  async updateRequestStatus(id: string, newStatus: RequestStatus, adminId: string, adminComment?: string) {
    const oldReq = this.requests.find(r => r.id === id);
    if (!oldReq) return;
    const oldStatus = oldReq.status;

    // Calculate Impact
    const { deltaDays, deltaHours } = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
    const isEarning = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(oldReq.typeId as RequestType);
    
    let applyChange = false;
    let multiplier = 0; // 1 = Add Impact, -1 = Revert Impact

    if (oldStatus === RequestStatus.PENDING && newStatus === RequestStatus.APPROVED) {
        if (isEarning) { applyChange = true; multiplier = 1; }
    } 
    else if ((oldStatus === RequestStatus.PENDING || oldStatus === RequestStatus.APPROVED) && newStatus === RequestStatus.REJECTED) {
        if (!isEarning || oldStatus === RequestStatus.APPROVED) {
            applyChange = true; multiplier = -1; 
        }
    }
    else if (oldStatus === RequestStatus.REJECTED && (newStatus === RequestStatus.APPROVED || newStatus === RequestStatus.PENDING)) {
        if (!isEarning || newStatus === RequestStatus.APPROVED) {
            applyChange = true; multiplier = 1;
        }
    }

    if (applyChange) {
        const u = this.users.find(usr => usr.id === oldReq.userId);
        if (u) {
            await this.updateUserBalance(u.id, u.daysAvailable + (deltaDays * multiplier), u.overtimeHours + (deltaHours * multiplier));
        }
    }

    await supabase.from('requests').update({ status: newStatus, admin_comment: adminComment }).eq('id', id);
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
        this.requests[idx].status = newStatus;
        this.requests[idx].adminComment = adminComment;
    }
    this.notify();
  }

  async updateJustification(id: string, isJustified: boolean, reportedToAdmin: boolean) {
      await supabase.from('requests').update({ is_justified: isJustified, reported_to_admin: reportedToAdmin }).eq('id', id);
      const req = this.requests.find(r => r.id === id);
      if (req) {
          req.isJustified = isJustified;
          req.reportedToAdmin = reportedToAdmin;
          this.notify();
      }
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

  async deleteUser(id: string) {
      await supabase.from('users').delete().eq('id', id);
      this.users = this.users.filter(u => u.id !== id);
      this.notify();
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
    if (!req) return;

    // Refund logic on delete if status was Pending or Approved
    if (req.status === RequestStatus.APPROVED || req.status === RequestStatus.PENDING) {
        const { deltaDays, deltaHours } = this.calculateRequestImpact(req.typeId, req.startDate, req.endDate, req.hours);
        const isEarning = [RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(req.typeId as RequestType);
        
        // If it was Pending Earning, no balance was added yet, so nothing to revert.
        // Otherwise (Pending Spending, Approved Spending, Approved Earning), revert impact.
        if (!isEarning || req.status === RequestStatus.APPROVED) {
            const u = this.users.find(usr => usr.id === req.userId);
            // Invert delta to refund
            if (u) await this.updateUserBalance(u.id, u.daysAvailable - deltaDays, u.overtimeHours - deltaHours);
        }
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

  // --- Admin Config Methods ---
  
  // Department Methods
  async createDepartment(name: string, supervisorIds: string[]) {
      const { data } = await supabase.from('departments').insert({ name, supervisor_ids: supervisorIds }).select().single();
      if(data) { this.departments.push({ id: data.id, name: data.name, supervisorIds: data.supervisor_ids }); this.notify(); }
  }
  async updateDepartment(id: string, name: string, supervisorIds: string[]) {
      await supabase.from('departments').update({ name, supervisor_ids: supervisorIds }).eq('id', id);
      const d = this.departments.find(dep => dep.id === id);
      if(d) { d.name = name; d.supervisorIds = supervisorIds; this.notify(); }
  }
  async deleteDepartment(id: string) {
      await supabase.from('departments').delete().eq('id', id);
      this.departments = this.departments.filter(d => d.id !== id);
      this.notify();
  }

  // Holiday Methods
  async createHoliday(date: string, name: string) {
    const { data } = await supabase.from('holidays').insert({ date, name }).select().single();
    if (data) { this.config.holidays.push({ id: data.id, date: data.date, name: data.name }); this.notify(); }
  }
  async updateHoliday(id: string, date: string, name: string) {
      await supabase.from('holidays').update({ date, name }).eq('id', id);
      const h = this.config.holidays.find(ho => ho.id === id);
      if(h) { h.date = date; h.name = name; this.notify(); }
  }
  async deleteHoliday(id: string) {
    await supabase.from('holidays').delete().eq('id', id);
    this.config.holidays = this.config.holidays.filter(h => h.id !== id);
    this.notify();
  }

  // Leave Type Methods
  async createLeaveType(label: string, subtractsDays: boolean, fixedRange?: {startDate: string, endDate: string} | null) {
     const { data } = await supabase.from('leave_types').insert({ label, subtracts_days: subtractsDays, fixed_range: fixedRange }).select().single();
     if(data) { this.config.leaveTypes.push({ id: data.id, label: data.label, subtractsDays: !!data.subtracts_days, fixedRange: data.fixed_range }); this.notify(); }
  }
  async deleteLeaveType(id: string) {
    await supabase.from('leave_types').delete().eq('id', id);
    this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id);
    this.notify();
  }

  // Shift Type Methods
  async createShiftType(name: string, color: string, start: string, end: string) {
    const segments = [{ start, end }];
    const { data } = await supabase.from('shift_types').insert({ name, color, segments }).select().single();
    if (data) {
        this.config.shiftTypes.push({ id: data.id, name: data.name, color: data.color, segments: data.segments });
        this.notify();
    }
  }
  async deleteShiftType(id: string) {
      await supabase.from('shift_types').delete().eq('id', id);
      this.config.shiftTypes = this.config.shiftTypes.filter(s => s.id !== id);
      this.notify();
  }

  // PPE Type Methods
  async createPPEType(name: string, sizes: string[]) {
      const { data } = await supabase.from('ppe_types').insert({ name, sizes }).select().single();
      if(data) { this.config.ppeTypes.push({ id: data.id, name: data.name, sizes: data.sizes }); this.notify(); }
  }
  async updatePPEType(id: string, name: string, sizes: string[]) {
      const { data } = await supabase.from('ppe_types').update({ name, sizes }).eq('id', id).select().single();
      if (data) {
          const idx = this.config.ppeTypes.findIndex(p => p.id === id);
          if (idx !== -1) {
              this.config.ppeTypes[idx] = { id: data.id, name: data.name, sizes: data.sizes };
              this.notify();
          }
      }
  }
  async deletePPEType(id: string) {
      await supabase.from('ppe_types').delete().eq('id', id);
      this.config.ppeTypes = this.config.ppeTypes.filter(p => p.id !== id);
      this.notify();
  }

  // SMTP & Communications Methods
  async saveSmtpSettings(settings: AppConfig['smtpSettings']) {
      const { error } = await supabase.from('settings').upsert({ key: 'smtp', value: settings });
      if (!error) {
          this.config.smtpSettings = settings;
          this.notify();
      }
  }

  async saveEmailTemplates(templates: EmailTemplate[]) {
      const { error } = await supabase.from('settings').upsert({ key: 'email_templates', value: templates });
      if (!error) {
          this.config.emailTemplates = templates;
          this.notify();
      }
  }

  async sendMassNotification(userIds: string[], message: string) {
      const notifications = userIds.map(uid => ({
          user_id: uid,
          message,
          read: false,
          created_at: new Date().toISOString()
      }));
      
      const { error } = await supabase.from('notifications').insert(notifications);
      if(!error) {
          userIds.forEach(uid => {
               this.notifications.push({
                   id: crypto.randomUUID(),
                   userId: uid,
                   message,
                   read: false,
                   date: new Date().toISOString()
               });
          });
          this.notify();
      }
  }

  getRequestConflicts(request: LeaveRequest) {
    const user = this.users.find(u => u.id === request.userId);
    if (!user) return [];
    
    // Check conflicts with Approved requests AND Pending requests (excluding self)
    // Only check absences, not earning overtime records
    return this.requests.filter(r => {
        if (r.id === request.id) return false;
        if (this.isOvertimeRequest(r.typeId)) return false; 
        
        // Only consider APPROVED or PENDING conflicts
        if (r.status === RequestStatus.REJECTED) return false;

        const otherUser = this.users.find(u => u.id === r.userId);
        if (!otherUser || otherUser.departmentId !== user.departmentId) return false;

        const startA = request.startDate.split('T')[0];
        const endA = request.endDate ? request.endDate.split('T')[0] : startA;
        const startB = r.startDate.split('T')[0];
        const endB = r.endDate ? r.endDate.split('T')[0] : startB;

        return (startA <= endB && endA >= startB);
    });
  }

  async startNewYear() {
      for (const u of this.users) {
          await this.updateUserBalance(u.id, (u.daysAvailable || 0) + 31, u.overtimeHours);
      }
  }
}

export const store = new Store();
