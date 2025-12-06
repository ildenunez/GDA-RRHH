
import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate } from '../types';
import { supabase } from './supabase';

const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: 'vacaciones', label: 'Vacaciones', subtractsDays: true, fixedRange: null },
  { id: 'baja', label: 'Baja Médica', subtractsDays: false, fixedRange: null },
  { id: 'asuntos', label: 'Asuntos Propios', subtractsDays: true, fixedRange: null },
  { id: 'navidad', label: 'Cierre Navidad', subtractsDays: true, fixedRange: { startDate: '2024-12-24', endDate: '2024-12-31' } }
];

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  // ... (Manteniendo las plantillas por defecto para la configuración inicial)
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
    leaveTypes: [...DEFAULT_LEAVE_TYPES],
    emailTemplates: [...DEFAULT_EMAIL_TEMPLATES],
    shifts: ['Mañana (8-15)', 'Tarde (15-22)', 'Noche (22-6)'],
    smtpSettings: { host: 'smtp.gmail.com', port: 587, user: 'admin@empresa.com', enabled: false }
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

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({
            id: d.id,
            name: d.name,
            supervisorIds: d.supervisor_ids || []
        }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        
        this.initialized = true;
    } catch (error) {
        console.error("Error connecting to Supabase:", error);
        // Fallback a datos vacíos o manejar error visualmente
    }
  }

  // Mapeadores para convertir snake_case de DB a camelCase de TS
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
          overtimeUsage: r.overtime_usage
      }));
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!this.initialized) await this.init();

    // En producción usaríamos supabase.auth.signInWithPassword
    // Aquí simulamos auth contra nuestra tabla de usuarios personalizada
    const user = this.users.find(u => u.email === email);
    
    // Validación simplificada (en real comparar hash)
    // Para el demo aceptamos contraseña maestra 1234 o la específica
    if (user && (pass === '1234' || pass === '8019')) { 
      this.currentUser = user;
      return user;
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
      // Simulación: en una app real esto llamaría a una Edge Function de Supabase
      console.log(`[EMAIL] Acción: ${action} para solicitud ${req.id}`);
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

    // Actualización Optimista
    const tempId = Math.random().toString();
    const optimisticReq: LeaveRequest = {
        id: tempId,
        userId: this.currentUser.id,
        typeId: newReqPayload.type_id,
        label: label,
        startDate: newReqPayload.start_date,
        endDate: newReqPayload.end_date || undefined,
        hours: newReqPayload.hours,
        reason: newReqPayload.reason,
        status: RequestStatus.PENDING,
        createdAt: new Date().toISOString(),
        overtimeUsage: req.overtimeUsage
    };
    this.requests.unshift(optimisticReq);

    // Persistencia DB
    const { data, error } = await supabase.from('requests').insert(newReqPayload).select().single();
    
    if (data && !error) {
        // Reemplazar optimista con real
        const realReq = this.mapRequestsFromDB([data])[0];
        const idx = this.requests.findIndex(r => r.id === tempId);
        if (idx !== -1) this.requests[idx] = realReq;
        
        this.createNotification(this.currentUser.id, `Nueva solicitud creada: ${label}`);
        this.sendEmailNotification('created', realReq);
    } else {
        // Rollback
        this.requests = this.requests.filter(r => r.id !== tempId);
        alert('Error al crear solicitud en base de datos');
    }
  }

  async updateRequest(reqId: string, data: Partial<LeaveRequest>) {
    const idx = this.requests.findIndex(r => r.id === reqId);
    if (idx === -1) return;

    // Solo optimista por brevedad, en prod manejar error
    const updatedLocal = { ...this.requests[idx], ...data };
    this.requests[idx] = updatedLocal;

    await supabase.from('requests').update({
        start_date: data.startDate,
        end_date: data.endDate,
        hours: data.hours,
        reason: data.reason,
        overtime_usage: data.overtimeUsage
    }).eq('id', reqId);
    
    this.createNotification(updatedLocal.userId, `Solicitud actualizada`);
  }

  async deleteRequest(reqId: string) {
      this.requests = this.requests.filter(r => r.id !== reqId);
      await supabase.from('requests').delete().eq('id', reqId);
  }

  async updateRequestStatus(reqId: string, status: RequestStatus, adminId: string) {
    const reqIndex = this.requests.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return;
    
    const req = this.requests[reqIndex];
    const user = this.users.find(u => u.id === req.userId);
    
    // Calcular nuevos saldos
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
         
         // Actualizar registros consumidos (Trazabilidad)
         if (req.overtimeUsage) {
             for (const usage of req.overtimeUsage) {
                 const sourceReq = this.requests.find(r => r.id === usage.requestId);
                 if (sourceReq) {
                     const newConsumed = (sourceReq.consumedHours || 0) + usage.hoursUsed;
                     const isFullyConsumed = newConsumed >= (sourceReq.hours || 0);
                     
                     sourceReq.consumedHours = newConsumed;
                     sourceReq.isConsumed = isFullyConsumed;
                     
                     // Update DB Source Request
                     await supabase.from('requests').update({
                         consumed_hours: newConsumed,
                         is_consumed: isFullyConsumed
                     }).eq('id', usage.requestId);
                 }
             }
         }
      }
      
      // Update User Balance in DB
      await supabase.from('users').update({
          days_available: newDays,
          overtime_hours: newOvertime
      }).eq('id', user.id);
      
      user.daysAvailable = newDays;
      user.overtimeHours = newOvertime;
    }

    // Update Request Status in DB
    this.requests[reqIndex] = { ...req, status };
    await supabase.from('requests').update({ status }).eq('id', reqId);

    this.createNotification(req.userId, `Tu solicitud ${req.label} ha sido ${status}`);
    
    if (status === RequestStatus.APPROVED) this.sendEmailNotification('approved', req);
    if (status === RequestStatus.REJECTED) this.sendEmailNotification('rejected', req);
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

  addLeaveType(type: LeaveTypeConfig) {
      this.config.leaveTypes.push(type);
      // En una implementación real, guardaríamos config en DB
  }

  updateLeaveType(updatedType: LeaveTypeConfig) {
      const idx = this.config.leaveTypes.findIndex(t => t.id === updatedType.id);
      if (idx !== -1) this.config.leaveTypes[idx] = updatedType;
  }

  removeLeaveType(id: string) {
      this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id);
  }

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
    // Unlink users
    await supabase.from('users').update({ department_id: null }).eq('department_id', id);
  }

  updateEmailTemplate(template: EmailTemplate) {
      const idx = this.config.emailTemplates.findIndex(t => t.id === template.id);
      if (idx !== -1) this.config.emailTemplates[idx] = template;
  }

  createNotification(userId: string, message: string) {
    this.notifications.unshift({
      id: Math.random().toString(),
      userId,
      message,
      read: false,
      date: new Date().toISOString()
    });
  }
}

export const store = new Store();
