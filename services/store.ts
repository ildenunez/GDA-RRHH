

import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate } from '../types';
import { supabase } from './supabase';

const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: 'vacaciones', label: 'Vacaciones', subtractsDays: true, fixedRange: null },
  { id: 'baja', label: 'Baja Médica', subtractsDays: false, fixedRange: null },
  { id: 'asuntos', label: 'Asuntos Propios', subtractsDays: true, fixedRange: null },
  { id: 'navidad', label: 'Cierre Navidad', subtractsDays: true, fixedRange: { startDate: '2024-12-24', endDate: '2024-12-31' } }
];

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'request_created',
    label: 'Ausencia: Nueva Solicitud',
    subject: 'Nueva solicitud de {tipo} - {empleado}',
    body: 'Hola,\n\nSe ha registrado una nueva solicitud de {tipo} para el empleado {empleado}.\nFechas: {fechas}\n\nPor favor, acceda al panel para gestionarla.',
    recipients: { worker: true, supervisor: true, admin: true }
  },
  {
    id: 'request_approved',
    label: 'Ausencia: Aprobada',
    subject: 'Solicitud Aprobada: {tipo}',
    body: 'Hola {empleado},\n\nTu solicitud de {tipo} para las fechas {fechas} ha sido APROBADA.\n\nDisfruta.',
    recipients: { worker: true, supervisor: true, admin: false }
  },
  {
    id: 'request_rejected',
    label: 'Ausencia: Rechazada',
    subject: 'Solicitud Rechazada: {tipo}',
    body: 'Hola {empleado},\n\nTu solicitud de {tipo} para las fechas {fechas} ha sido RECHAZADA.\n\nContacta con tu supervisor para más detalles.',
    recipients: { worker: true, supervisor: true, admin: false }
  },
  {
    id: 'overtime_earn_created',
    label: 'Horas Extra: Registro Nuevo',
    subject: 'Registro de Horas Extra: {empleado}',
    body: 'El empleado {empleado} ha registrado {horas} horas extra realizadas el día {fecha}.\nMotivo: {motivo}',
    recipients: { worker: true, supervisor: true, admin: true }
  },
  {
    id: 'overtime_earn_approved',
    label: 'Horas Extra: Registro Aprobado',
    subject: 'Horas Extra Aprobadas',
    body: 'Hola {empleado},\n\nSe han aprobado tus {horas} horas extra del día {fecha}.\nSe han sumado a tu saldo.',
    recipients: { worker: true, supervisor: false, admin: false }
  },
  {
    id: 'overtime_earn_rejected',
    label: 'Horas Extra: Registro Rechazado',
    subject: 'Horas Extra Rechazadas',
    body: 'Hola {empleado},\n\nSe ha rechazado tu registro de horas extra del día {fecha}.',
    recipients: { worker: true, supervisor: false, admin: false }
  },
  {
    id: 'overtime_use_created',
    label: 'Consumo Horas: Nueva Solicitud',
    subject: 'Solicitud de Consumo ({tipo}): {empleado}',
    body: '{empleado} solicita {tipo} por un total de {horas} horas.\nFechas/Detalle: {fechas}\nMotivo: {motivo}',
    recipients: { worker: true, supervisor: true, admin: true }
  },
  {
    id: 'overtime_use_approved',
    label: 'Consumo Horas: Aprobado',
    subject: 'Solicitud de Consumo Aprobada',
    body: 'Hola {empleado},\n\nTu solicitud de {tipo} de {horas} horas ha sido APROBADA.\nSe han descontado de tu saldo y de los registros correspondientes.',
    recipients: { worker: true, supervisor: false, admin: false }
  },
  {
    id: 'overtime_use_rejected',
    label: 'Consumo Horas: Rechazado',
    subject: 'Solicitud de Consumo Rechazada',
    body: 'Hola {empleado},\n\nTu solicitud de {tipo} ha sido RECHAZADA.',
    recipients: { worker: true, supervisor: false, admin: false }
  },
  {
    id: 'request_cancelled',
    label: 'Solicitud Cancelada/Eliminada',
    subject: 'Solicitud Cancelada: {tipo}',
    body: 'La solicitud de {tipo} de {empleado} ha sido cancelada o eliminada del sistema.',
    recipients: { worker: true, supervisor: true, admin: true }
  }
];

class Store {
  users: User[] = [];
  departments: Department[] = [];
  requests: LeaveRequest[] = [];
  notifications: Notification[] = [];
  config: AppConfig = {
    leaveTypes: [], // Se cargarán de DB
    emailTemplates: [...DEFAULT_EMAIL_TEMPLATES],
    shifts: ['Mañana (8-15)', 'Tarde (15-22)', 'Noche (22-6)'],
    smtpSettings: { host: 'smtp.gmail.com', port: 587, user: 'admin@empresa.com', password: '', enabled: false }
  };

  currentUser: User | null = null;
  initialized = false;

  // Carga inicial de datos desde Supabase
  async init() {
    if (this.initialized) return;

    try {
        const { data: usersData } = await supabase.from('users').select('*');
        const { data: deptsData } = await supabase.from('departments').select('*');
        const { data: reqsData } = await supabase.from('requests').select('*');
        const { data: typesData } = await supabase.from('leave_types').select('*');
        const { data: notifData } = await supabase.from('notifications').select('*');

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({
            id: d.id,
            name: d.name,
            supervisorIds: d.supervisor_ids || []
        }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        if (notifData) this.notifications = this.mapNotificationsFromDB(notifData);
        
        // Cargar Tipos de Ausencia o usar defaults si la tabla está vacía
        if (typesData && typesData.length > 0) {
            this.config.leaveTypes = typesData.map((t: any) => ({
                id: t.id,
                label: t.label,
                subtractsDays: t.subtracts_days,
                fixedRange: t.fixed_range
            }));
        } else {
            this.config.leaveTypes = [...DEFAULT_LEAVE_TYPES];
            // Opcional: Podríamos persistir los defaults aquí
        }
        
        this.initialized = true;
    } catch (error) {
        console.error("Error connecting to Supabase:", error);
    }
  }

  // Mapeadores
  private mapUsersFromDB(data: any[]): User[] {
      return data.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as Role,
          departmentId: u.department_id,
          daysAvailable: u.days_available,
          overtimeHours: u.overtime_hours,
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=random`
      }));
  }

  private mapRequestsFromDB(data: any[]): LeaveRequest[] {
      return data.map(r => ({
          id: r.id,
          userId: r.user_id,
          typeId: r.type_id,
          label: r.label,
          startDate: r.start_date,
          endDate: r.end_date,
          hours: r.hours,
          reason: r.reason,
          status: r.status as RequestStatus,
          createdAt: r.created_at,
          isConsumed: r.is_consumed,
          consumedHours: r.consumed_hours,
          overtimeUsage: r.overtime_usage,
          adminComment: r.admin_comment
      }));
  }

  private mapNotificationsFromDB(data: any[]): Notification[] {
      return data.map(n => ({
          id: n.id,
          userId: n.user_id,
          message: n.message,
          read: n.read,
          date: n.created_at
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!this.initialized) await this.init();
    const user = this.users.find(u => u.email === email);
    if (user && user.id) {
        const { data } = await supabase.from('users').select('password').eq('id', user.id).single();
        if (data && (data.password === pass)) {
            this.currentUser = user;
            return user;
        }
    }
    return null;
  }

  logout() {
    this.currentUser = null;
  }

  isOvertimeRequest(typeId: string): boolean {
      return typeId.startsWith('overtime_');
  }

  getAvailableOvertimeRecords(userId: string) {
      return this.requests.filter(r => 
          r.userId === userId &&
          r.typeId === 'overtime_earn' &&
          r.status === RequestStatus.APPROVED &&
          !r.isConsumed &&
          (r.hours || 0) > (r.consumedHours || 0)
      );
  }

  getUsersByDepartment(deptId: string) {
    return this.users.filter(u => u.departmentId === deptId);
  }

  getMyRequests() {
    if (!this.currentUser) return [];
    return this.requests.filter(r => r.userId === this.currentUser!.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPendingApprovalsForUser(supervisorId: string) {
    const user = this.users.find(u => u.id === supervisorId);
    if (!user) return [];

    let requestsToShow: LeaveRequest[] = [];

    if (user.role === Role.ADMIN) {
        requestsToShow = this.requests.filter(r => r.status === RequestStatus.PENDING);
    } else {
        const myDepts = this.departments.filter(d => d.supervisorIds.includes(supervisorId)).map(d => d.id);
        const managedUserIds = this.users.filter(u => myDepts.includes(u.departmentId)).map(u => u.id);
        
        requestsToShow = this.requests.filter(r => 
          managedUserIds.includes(r.userId) && 
          r.status === RequestStatus.PENDING &&
          r.userId !== supervisorId
        );
    }
    return requestsToShow;
  }

  getCalendarRequests(viewerId: string, filterDeptId?: string): LeaveRequest[] {
    const viewer = this.users.find(u => u.id === viewerId);
    if (!viewer) return [];

    let relevantRequests = [];

    if (viewer.role === Role.ADMIN) {
      relevantRequests = this.requests.filter(r => !this.isOvertimeRequest(r.typeId)); 
    } else if (viewer.role === Role.SUPERVISOR) {
      const myDepts = this.departments.filter(d => d.supervisorIds.includes(viewerId)).map(d => d.id);
      const teamIds = this.users.filter(u => myDepts.includes(u.departmentId)).map(u => u.id);
      relevantRequests = this.requests.filter(r => 
        (r.userId === viewerId || teamIds.includes(r.userId)) &&
        (!this.isOvertimeRequest(r.typeId))
      );
    } else {
      relevantRequests = this.requests.filter(r => 
        r.userId === viewerId && 
        (!this.isOvertimeRequest(r.typeId))
      );
    }

    if (filterDeptId) {
        const deptUserIds = this.users.filter(u => u.departmentId === filterDeptId).map(u => u.id);
        relevantRequests = relevantRequests.filter(r => deptUserIds.includes(r.userId));
    }

    return relevantRequests;
  }

  getAllUsers() {
    return [...this.users].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  private sendEmailNotification(action: 'created' | 'approved' | 'rejected', req: LeaveRequest) {
      console.log(`[EMAIL] Acción: ${action} para solicitud ${req.id}`);
  }

  // --- SMTP y Emails Manuales ---
  updateSmtpSettings(settings: AppConfig['smtpSettings']) {
      this.config.smtpSettings = settings;
      // Persistir si fuera necesario (e.g. tabla settings)
  }

  async sendManualEmail(to: string | string[], subject: string, body: string) {
      console.log(`[SMTP] Enviando email a: ${Array.isArray(to) ? to.join(', ') : to}`);
      console.log(`[SMTP] Asunto: ${subject}`);
      console.log(`[SMTP] Cuerpo: ${body}`);
      return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async sendMassNotification(userIds: string[], message: string) {
      if (userIds.length === 0) return;

      const payload = userIds.map(uid => ({
          user_id: uid,
          message,
          read: false
      }));

      const { data, error } = await supabase.from('notifications').insert(payload).select();
      
      if (data && !error) {
          // Agregar al store local para actualización instantánea
          const newNotifs = this.mapNotificationsFromDB(data);
          this.notifications.unshift(...newNotifs);
      } else {
          console.error("Error enviando notificaciones masivas", error);
          alert(`Error al enviar notificaciones: ${error?.message || JSON.stringify(error)}`);
      }
  }

  async createRequest(req: Partial<LeaveRequest>) {
    if (!this.currentUser) return;
    
    const leaveType = this.config.leaveTypes.find(t => t.id === req.typeId);
    const label = leaveType ? leaveType.label : (req.typeId === 'overtime_earn' ? 'Horas Extra Generadas' : req.typeId === 'overtime_pay' ? 'Cobro Horas' : 'Canje Días por Horas');

    const newReqPayload = {
      user_id: this.currentUser.id,
      type_id: req.typeId || 'general',
      label: label,
      start_date: req.startDate!,
      end_date: req.endDate || null,
      hours: req.hours || 0,
      reason: req.reason || '',
      status: RequestStatus.PENDING,
      overtime_usage: req.overtimeUsage,
      is_consumed: false,
      consumed_hours: 0
    };

    const { data, error } = await supabase.from('requests').insert(newReqPayload).select().single();
    
    if (data && !error) {
        const realReq = this.mapRequestsFromDB([data])[0];
        this.requests.unshift(realReq);
        this.createNotification(this.currentUser.id, `Nueva solicitud creada: ${label}`);
        this.sendEmailNotification('created', realReq);
    } else {
        alert('Error al crear solicitud en base de datos');
    }
  }

  async updateRequest(reqId: string, data: Partial<LeaveRequest>) {
    const idx = this.requests.findIndex(r => r.id === reqId);
    if (idx === -1) return;

    await supabase.from('requests').update({
        start_date: data.startDate,
        end_date: data.endDate,
        hours: data.hours,
        reason: data.reason,
        overtime_usage: data.overtimeUsage
    }).eq('id', reqId);
    
    // Update local
    this.requests[idx] = { ...this.requests[idx], ...data };
    this.createNotification(this.requests[idx].userId, `Solicitud actualizada`);
  }

  async deleteRequest(reqId: string) {
      this.requests = this.requests.filter(r => r.id !== reqId);
      await supabase.from('requests').delete().eq('id', reqId);
  }

  async updateRequestStatus(reqId: string, status: RequestStatus, adminId: string, comment?: string) {
    const reqIndex = this.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;
    
    const req = this.requests[reqIndex];
    const user = this.users.find(u => u.id === req.userId);
    
    let newDays = user?.daysAvailable || 0;
    let newOvertime = user?.overtimeHours || 0;

    if (status === RequestStatus.APPROVED && user) {
      const leaveType = this.config.leaveTypes.find(t => t.id === req.typeId);

      if (leaveType) {
          if (leaveType.subtractsDays) {
            const days = req.endDate ? Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 3600 * 24)) + 1 : 1;
            newDays -= days;
          }
      } 
      else if (req.typeId === 'overtime_earn') {
        newOvertime += (req.hours || 0);
      } 
      else if (req.typeId === 'overtime_spend_days' || req.typeId === 'overtime_pay') {
         newOvertime -= (req.hours || 0);
         if (req.typeId === 'overtime_spend_days') {
            newDays += ((req.hours || 0) / 8); 
         }
         
         if (req.overtimeUsage) {
             for (const usage of req.overtimeUsage) {
                 const sourceReq = this.requests.find(r => r.id === usage.requestId);
                 if (sourceReq) {
                     const newConsumed = (sourceReq.consumedHours || 0) + usage.hoursUsed;
                     const isFullyConsumed = newConsumed >= (sourceReq.hours || 0);
                     sourceReq.consumedHours = newConsumed;
                     sourceReq.isConsumed = isFullyConsumed;
                     await supabase.from('requests').update({
                         consumed_hours: newConsumed,
                         is_consumed: isFullyConsumed
                     }).eq('id', usage.requestId);
                 }
             }
         }
      }
      
      await supabase.from('users').update({
          days_available: newDays,
          overtime_hours: newOvertime
      }).eq('id', user.id);
      
      user.daysAvailable = newDays;
      user.overtimeHours = newOvertime;
    }

    this.requests[reqIndex] = { ...req, status, adminComment: comment };
    
    // Update DB including admin_comment
    await supabase.from('requests').update({ 
        status, 
        admin_comment: comment 
    }).eq('id', reqId);

    this.createNotification(req.userId, `Tu solicitud ${req.label} ha sido ${status}`);
    
    if (status === RequestStatus.APPROVED) this.sendEmailNotification('approved', req);
    if (status === RequestStatus.REJECTED) this.sendEmailNotification('rejected', req);
  }

  async createUser(userData: Omit<User, 'id'>, password: string): Promise<void> {
      const newId = Math.random().toString(36).substr(2, 9);
      
      const payload = {
          id: newId,
          name: userData.name,
          email: userData.email,
          password: password,
          role: userData.role,
          department_id: userData.departmentId || null, 
          days_available: userData.daysAvailable,
          overtime_hours: userData.overtimeHours,
          avatar: userData.avatar
      };

      const { error } = await supabase.from('users').insert(payload);

      if (!error) {
          const newUser: User = { ...userData, id: newId };
          this.users.push(newUser);
      } else {
          console.error('Error creating user', error);
          const msg = error.message || JSON.stringify(error);
          alert('Error al crear usuario: ' + msg);
      }
  }

  // --- NUEVO: Actualización de Perfil (Usuario logueado) ---
  async updateUserProfile(userId: string, data: { name: string, email: string, password?: string, avatar?: string }) {
      const userIdx = this.users.findIndex(u => u.id === userId);
      if (userIdx === -1) return;

      const updates: any = {
          name: data.name,
          email: data.email,
          avatar: data.avatar
      };

      if (data.password && data.password.trim() !== '') {
          updates.password = data.password;
      }

      const { error } = await supabase.from('users').update(updates).eq('id', userId);

      if (!error) {
          // Actualizar estado local
          const updatedUser = { ...this.users[userIdx], name: data.name, email: data.email };
          if (data.avatar) updatedUser.avatar = data.avatar;
          
          this.users[userIdx] = updatedUser;
          if (this.currentUser && this.currentUser.id === userId) {
              this.currentUser = updatedUser;
          }
      } else {
          throw new Error(error.message);
      }
  }

  async deleteUser(userId: string) {
      this.users = this.users.filter(u => u.id !== userId);
      this.requests = this.requests.filter(r => r.userId !== userId);
      await supabase.from('users').delete().eq('id', userId);
  }

  async updateUserRole(userId: string, role: Role) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
        user.role = role;
        await supabase.from('users').update({ role }).eq('id', userId);
    }
  }

  async updateUserBalance(userId: string, days: number, hours: number) {
     const user = this.users.find(u => u.id === userId);
     if (user) {
       user.daysAvailable = days;
       user.overtimeHours = hours;
       await supabase.from('users').update({ days_available: days, overtime_hours: hours }).eq('id', userId);
     }
  }

  // --- PERSISTENCIA DE TIPOS DE AUSENCIA ---
  async addLeaveType(type: LeaveTypeConfig) {
      this.config.leaveTypes.push(type);
      await supabase.from('leave_types').insert({
          id: type.id,
          label: type.label,
          subtracts_days: type.subtractsDays,
          fixed_range: type.fixedRange
      });
  }

  async updateLeaveType(updatedType: LeaveTypeConfig) {
      const idx = this.config.leaveTypes.findIndex(t => t.id === updatedType.id);
      if (idx !== -1) this.config.leaveTypes[idx] = updatedType;
      
      await supabase.from('leave_types').update({
          label: updatedType.label,
          subtracts_days: updatedType.subtractsDays,
          fixed_range: updatedType.fixedRange
      }).eq('id', updatedType.id);
  }

  async removeLeaveType(id: string) {
      this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id);
      await supabase.from('leave_types').delete().eq('id', id);
  }

  // --- PERSISTENCIA DE DEPARTAMENTOS ---
  async addDepartment(dept: Department) {
    this.departments.push(dept);
    await supabase.from('departments').insert({
        id: dept.id,
        name: dept.name,
        supervisor_ids: dept.supervisorIds
    });
  }

  async updateDepartment(dept: Department) {
    const idx = this.departments.findIndex(d => d.id === dept.id);
    if (idx !== -1) this.departments[idx] = dept;
    await supabase.from('departments').update({
        name: dept.name,
        supervisor_ids: dept.supervisorIds
    }).eq('id', dept.id);
  }

  async removeDepartment(id: string) {
    this.departments = this.departments.filter(d => d.id !== id);
    this.users.forEach(u => { if (u.departmentId === id) u.departmentId = ''; });
    
    await supabase.from('departments').delete().eq('id', id);
    await supabase.from('users').update({ department_id: null }).eq('department_id', id);
  }

  updateEmailTemplate(template: EmailTemplate) {
      const idx = this.config.emailTemplates.findIndex(t => t.id === template.id);
      if (idx !== -1) this.config.emailTemplates[idx] = template;
  }

  // --- GESTIÓN DE NOTIFICACIONES (Persistentes) ---
  
  async createNotification(userId: string, message: string) {
    const { data } = await supabase.from('notifications').insert({
        user_id: userId,
        message,
        read: false
    }).select().single();

    if (data) {
        this.notifications.unshift({
            id: data.id,
            userId: data.user_id,
            message: data.message,
            read: data.read,
            date: data.created_at
        });
    }
  }

  getNotificationsForUser(userId: string) {
      return this.notifications.filter(n => n.userId === userId);
  }

  async markNotificationAsRead(notifId: string) {
      const notif = this.notifications.find(n => n.id === notifId);
      if (notif) {
          notif.read = true;
          await supabase.from('notifications').update({ read: true }).eq('id', notifId);
      }
  }

  async markAllNotificationsAsRead(userId: string) {
      this.notifications.forEach(n => {
          if (n.userId === userId) n.read = true;
      });
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  }

  async deleteNotification(notifId: string) {
      this.notifications = this.notifications.filter(n => n.id !== notifId);
      await supabase.from('notifications').delete().eq('id', notifId);
  }
}

export const store = new Store();
