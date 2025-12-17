
import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate, ShiftType, ShiftAssignment, Holiday, PPEType, PPERequest } from '../types';
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
    leaveTypes: [],
    emailTemplates: [...DEFAULT_EMAIL_TEMPLATES],
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

  async init() {
    if (this.initialized) return;

    try {
        const { data: usersData } = await supabase.from('users').select('*');
        const { data: deptsData } = await supabase.from('departments').select('*');
        const { data: reqsData } = await supabase.from('requests').select('*');
        const { data: typesData } = await supabase.from('leave_types').select('*');
        const { data: notifData } = await supabase.from('notifications').select('*');
        const { data: shiftTypesData } = await supabase.from('shift_types').select('*');
        const { data: shiftAssignmentsData } = await supabase.from('shift_assignments').select('*');
        const { data: holidaysData } = await supabase.from('holidays').select('*');
        
        // Cargar EPIS
        const { data: ppeTypes } = await supabase.from('ppe_types').select('*');
        const { data: ppeRequests } = await supabase.from('ppe_requests').select('*');

        if (usersData) this.users = this.mapUsersFromDB(usersData);
        if (deptsData) this.departments = deptsData.map((d: any) => ({
            id: d.id,
            name: d.name,
            supervisorIds: d.supervisor_ids || []
        }));
        if (reqsData) this.requests = this.mapRequestsFromDB(reqsData);
        if (notifData) this.notifications = this.mapNotificationsFromDB(notifData);
        
        if (typesData && typesData.length > 0) {
            this.config.leaveTypes = typesData.map((t: any) => ({
                id: t.id,
                label: t.label,
                subtractsDays: t.subtracts_days,
                fixed_range: t.fixed_range
            }));
        } else {
            this.config.leaveTypes = [...DEFAULT_LEAVE_TYPES];
        }

        if (shiftTypesData) {
            this.config.shiftTypes = shiftTypesData.map((s: any) => ({
                id: s.id,
                name: s.name,
                color: s.color,
                segments: s.segments
            }));
        }

        if (shiftAssignmentsData) {
            this.config.shiftAssignments = shiftAssignmentsData.map((a: any) => ({
                id: a.id,
                userId: a.user_id,
                date: a.date,
                shiftTypeId: a.shift_type_id
            }));
        }

        if (holidaysData) {
            this.config.holidays = holidaysData.map((h: any) => ({
                id: h.id,
                date: h.date,
                name: h.name
            }));
        }

        if (ppeTypes) {
            this.config.ppeTypes = ppeTypes.map((p: any) => ({
                id: p.id,
                name: p.name,
                sizes: p.sizes
            }));
        }

        if (ppeRequests) {
            this.config.ppeRequests = ppeRequests.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                typeId: r.type_id,
                size: r.size,
                status: r.status,
                createdAt: r.created_at,
                deliveryDate: r.delivery_date
            })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
          type_id: r.type_id, // kept for raw db mapping reference if needed, but mainly we map to camelCase below
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
          adminComment: r.admin_comment,
          createdByAdmin: r.created_by_admin
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
      return typeId.startsWith('overtime_') || typeId === 'festivo_trabajado' || typeId === 'overtime_adjustment';
  }

  getAvailableOvertimeRecords(userId: string) {
      // Modificado para incluir también festivos trabajados y registros creados por admin (siempre que sean positivos)
      return this.requests.filter(r => 
          r.userId === userId &&
          (
            r.typeId === 'overtime_earn' || 
            r.typeId === 'festivo_trabajado' || 
            (r.typeId === 'overtime_adjustment' && (r.hours || 0) > 0)
          ) && 
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

  // --- CONFLICT DETECTION FOR A SINGLE REQUEST ---
  getRequestConflicts(req: LeaveRequest): LeaveRequest[] {
      const user = this.users.find(u => u.id === req.userId);
      if (!user) return [];

      // Find other users in the same department
      const deptUserIds = this.users
          .filter(u => u.departmentId === user.departmentId && u.id !== user.id)
          .map(u => u.id);

      if (deptUserIds.length === 0) return [];

      const start = new Date(req.startDate);
      const end = new Date(req.endDate || req.startDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      // Filter requests that are Approved or Pending, overlap in date, belong to dept members, and are NOT overtime logs
      return this.requests.filter(other => {
          if (!deptUserIds.includes(other.userId)) return false;
          if (other.status !== RequestStatus.APPROVED && other.status !== RequestStatus.PENDING) return false;
          if (this.isOvertimeRequest(other.typeId)) return false; // Usually only absences conflict

          const otherStart = new Date(other.startDate);
          const otherEnd = new Date(other.endDate || other.startDate);
          otherStart.setHours(0,0,0,0);
          otherEnd.setHours(0,0,0,0);

          return (start <= otherEnd && end >= otherStart);
      });
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

    // Filter out regularizations from calendar
    return relevantRequests.filter(r => r.typeId !== 'adjustment_days');
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
  }

  async sendManualEmail(to: string | string[], subject: string, body: string) {
      console.log(`[SMTP] Enviando email a: ${Array.isArray(to) ? to.join(', ') : to}`);
      return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async sendMassNotification(userIds: string[], message: string) {
      if (userIds.length === 0) return;
      const payload = userIds.map(uid => ({ user_id: uid, message, read: false }));
      const { data, error } = await supabase.from('notifications').insert(payload).select();
      if (data && !error) {
          const newNotifs = this.mapNotificationsFromDB(data);
          this.notifications.unshift(...newNotifs);
      } else {
           console.error("Error sending mass notification", error);
           alert(`Error enviando notificaciones: ${error?.message || JSON.stringify(error)}`);
      }
  }

  async createRequest(req: Partial<LeaveRequest>, targetUserId?: string, initialStatus: RequestStatus = RequestStatus.PENDING) {
    if (!this.currentUser) return;
    
    // Determine target user (current user or admin-selected user)
    const userId = targetUserId || this.currentUser.id;
    const isCreatedByAdmin = !!targetUserId && targetUserId !== this.currentUser.id;

    const leaveType = this.config.leaveTypes.find(t => t.id === req.typeId);
    let label = req.label || '';
    
    if (!label) {
        if (leaveType) label = leaveType.label;
        else if (req.typeId === 'overtime_earn') label = 'Horas Extra Generadas';
        else if (req.typeId === 'overtime_pay') label = 'Cobro Horas';
        else if (req.typeId === 'overtime_spend_days') label = 'Canje Días por Horas';
        else if (req.typeId === 'festivo_trabajado') label = 'Festivo Trabajado';
        else label = 'Solicitud';
    }
    
    const newReqPayload = {
      user_id: userId,
      type_id: req.typeId || 'general',
      label: label,
      start_date: req.startDate!,
      end_date: req.endDate || null,
      hours: req.hours || 0,
      reason: req.reason || '',
      status: initialStatus,
      overtime_usage: req.overtimeUsage,
      is_consumed: false,
      consumed_hours: 0,
      created_by_admin: isCreatedByAdmin
    };

    const { data, error } = await supabase.from('requests').insert(newReqPayload).select().single();
    if (data && !error) {
        const realReq = this.mapRequestsFromDB([data])[0];
        this.requests.unshift(realReq);
        
        // Notify User
        if (isCreatedByAdmin) {
             this.createNotification(userId, `Nueva registro administrativo: ${label}`);
        } else {
             this.createNotification(userId, `Nueva solicitud creada: ${label}`);
        }
        
        // Send Email
        this.sendEmailNotification('created', realReq);

        // If created as APPROVED, trigger balance updates immediately
        if (initialStatus === RequestStatus.APPROVED) {
            await this.updateRequestStatus(realReq.id, RequestStatus.APPROVED, this.currentUser.id, "Aprobada automáticamente al crear por Admin");
        }

    } else {
        alert('Error al crear solicitud en base de datos');
        console.error(error);
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
    this.requests[idx] = { ...this.requests[idx], ...data };
    this.createNotification(this.requests[idx].userId, `Solicitud actualizada`);
  }

  async deleteRequest(reqId: string) {
      const req = this.requests.find(r => r.id === reqId);
      if (!req) return;

      // Si la solicitud estaba APROBADA, debemos revertir los saldos
      if (req.status === RequestStatus.APPROVED) {
          const user = this.users.find(u => u.id === req.userId);
          if (user) {
              let newDays = user.daysAvailable;
              let newOvertime = user.overtimeHours;
              const type = this.config.leaveTypes.find(t => t.id === req.typeId);

              // 1. Revertir saldos al usuario
              if (type && type.subtractsDays) {
                   const days = req.endDate ? Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 3600 * 24)) + 1 : 1;
                   newDays += days;
              } else if (req.typeId === 'overtime_earn') {
                   // Si generó horas, se las quitamos
                   newOvertime -= (req.hours || 0);
              } else if (req.typeId === 'festivo_trabajado') {
                   // Si trabajó un festivo (generó 1 día y 4 horas), se los quitamos
                   newDays -= 1;
                   newOvertime -= 4;
              } else if (req.typeId === 'overtime_spend_days') {
                   // Si canjeó días (gastó horas), se las devolvemos y le quitamos los días ganados
                   newOvertime += (req.hours || 0);
                   newDays -= ((req.hours || 0) / 8); 
              } else if (req.typeId === 'overtime_pay') {
                   // Si cobró horas, se las devolvemos al saldo
                   newOvertime += (req.hours || 0);
              } else if (req.typeId === 'adjustment_days') {
                   // Si era regularización, revertimos el ajuste (restamos lo que se sumó)
                   newDays -= (req.hours || 0);
              } else if (req.typeId === 'overtime_adjustment') {
                   newOvertime -= (req.hours || 0);
              }

              // Guardar cambios en usuario
              user.daysAvailable = newDays;
              user.overtimeHours = newOvertime;
              await supabase.from('users').update({ 
                  days_available: newDays, 
                  overtime_hours: newOvertime 
              }).eq('id', user.id);
          }

          // 2. Revertir uso de horas extra en registros originales (Trazabilidad)
          if (req.overtimeUsage && req.overtimeUsage.length > 0) {
              for (const usage of req.overtimeUsage) {
                  const sourceReq = this.requests.find(r => r.id === usage.requestId);
                  if (sourceReq) {
                      const newConsumed = (sourceReq.consumedHours || 0) - usage.hoursUsed;
                      sourceReq.consumedHours = Math.max(0, newConsumed);
                      sourceReq.isConsumed = false; // Ya no puede estar agotado si le devolvemos horas
                      
                      await supabase.from('requests').update({ 
                          consumed_hours: sourceReq.consumedHours, 
                          is_consumed: false 
                      }).eq('id', sourceReq.id);
                  }
              }
          }
      }

      // 3. Borrar la solicitud
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
      else if (req.typeId === 'festivo_trabajado') {
          // Festivo Trabajado suma 1 día y 4 horas
          newDays += 1;
          newOvertime += 4;
      }
      else if (req.typeId === 'overtime_spend_days' || req.typeId === 'overtime_pay') {
         newOvertime -= (req.hours || 0);
         if (req.typeId === 'overtime_spend_days') newDays += ((req.hours || 0) / 8); 
         if (req.overtimeUsage) {
             for (const usage of req.overtimeUsage) {
                 const sourceReq = this.requests.find(r => r.id === usage.requestId);
                 if (sourceReq) {
                     const newConsumed = (sourceReq.consumedHours || 0) + usage.hoursUsed;
                     const isFullyConsumed = newConsumed >= (sourceReq.hours || 0);
                     sourceReq.consumedHours = newConsumed;
                     sourceReq.isConsumed = isFullyConsumed;
                     await supabase.from('requests').update({ consumed_hours: newConsumed, is_consumed: isFullyConsumed }).eq('id', usage.requestId);
                 }
             }
         }
      }
      // NOTA: 'adjustment_days' y 'overtime_adjustment' no actualizan saldo aquí si vienen de Management.handleUpdateUser
      // ya que allí se llama a updateUserBalance explícitamente con los valores calculados por el admin.
      // Sin embargo, si borramos, sí usamos la lógica de reversión.
      
      await supabase.from('users').update({ days_available: newDays, overtime_hours: newOvertime }).eq('id', user.id);
      user.daysAvailable = newDays;
      user.overtimeHours = newOvertime;
    }
    this.requests[reqIndex] = { ...req, status, adminComment: comment };
    await supabase.from('requests').update({ status, admin_comment: comment }).eq('id', reqId);
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
          alert('Error al crear usuario: ' + (error.message || JSON.stringify(error)));
      }
  }

  // Actualización de perfil propio (nombre, email, password, avatar)
  async updateUserProfile(userId: string, data: { name: string, email: string, password?: string, avatar?: string }) {
      const userIdx = this.users.findIndex(u => u.id === userId);
      if (userIdx === -1) return;
      const updates: any = { name: data.name, email: data.email, avatar: data.avatar };
      if (data.password && data.password.trim() !== '') updates.password = data.password;
      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (!error) {
          const updatedUser = { ...this.users[userIdx], name: data.name, email: data.email };
          if (data.avatar) updatedUser.avatar = data.avatar;
          this.users[userIdx] = updatedUser;
          if (this.currentUser && this.currentUser.id === userId) this.currentUser = updatedUser;
      } else {
          throw new Error(error.message);
      }
  }

  // Actualización de datos administrativos (nombre, email, departamento)
  async updateUserAdmin(userId: string, data: { name: string, email: string, departmentId: string }) {
     const userIdx = this.users.findIndex(u => u.id === userId);
     if (userIdx === -1) return;
     
     const updates = { 
         name: data.name, 
         email: data.email, 
         department_id: data.departmentId 
     };
     
     const { error } = await supabase.from('users').update(updates).eq('id', userId);
     
     if (!error) {
         const updatedUser = { 
             ...this.users[userIdx], 
             name: data.name, 
             email: data.email,
             departmentId: data.departmentId
         };
         this.users[userIdx] = updatedUser;
     } else {
         console.error("Error updating user admin details", error);
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

  async addLeaveType(type: LeaveTypeConfig) {
      this.config.leaveTypes.push(type);
      await supabase.from('leave_types').insert({ id: type.id, label: type.label, subtracts_days: type.subtractsDays, fixed_range: type.fixedRange });
  }

  async updateLeaveType(updatedType: LeaveTypeConfig) {
      const idx = this.config.leaveTypes.findIndex(t => t.id === updatedType.id);
      if (idx !== -1) this.config.leaveTypes[idx] = updatedType;
      await supabase.from('leave_types').update({ label: updatedType.label, subtracts_days: updatedType.subtractsDays, fixed_range: updatedType.fixedRange }).eq('id', updatedType.id);
  }

  async removeLeaveType(id: string) {
      this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id);
      await supabase.from('leave_types').delete().eq('id', id);
  }

  async addDepartment(dept: Department) {
    this.departments.push(dept);
    await supabase.from('departments').insert({ id: dept.id, name: dept.name, supervisor_ids: dept.supervisorIds });
  }

  async updateDepartment(dept: Department) {
    const idx = this.departments.findIndex(d => d.id === dept.id);
    if (idx !== -1) this.departments[idx] = dept;
    await supabase.from('departments').update({ name: dept.name, supervisor_ids: dept.supervisorIds }).eq('id', dept.id);
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

  async createNotification(userId: string, message: string) {
    const { data } = await supabase.from('notifications').insert({ user_id: userId, message, read: false }).select().single();
    if (data) {
        this.notifications.unshift({ id: data.id, userId: data.user_id, message: data.message, read: data.read, date: data.created_at });
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
      this.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  }

  async deleteNotification(notifId: string) {
      this.notifications = this.notifications.filter(n => n.id !== notifId);
      await supabase.from('notifications').delete().eq('id', notifId);
  }

  // --- GESTIÓN DE TURNOS ---
  async addShiftType(st: ShiftType) {
      this.config.shiftTypes.push(st);
      await supabase.from('shift_types').insert({
          id: st.id,
          name: st.name,
          color: st.color,
          segments: st.segments
      });
  }

  async updateShiftType(st: ShiftType) {
      const idx = this.config.shiftTypes.findIndex(s => s.id === st.id);
      if (idx !== -1) this.config.shiftTypes[idx] = st;
      await supabase.from('shift_types').update({
          name: st.name,
          color: st.color,
          segments: st.segments
      }).eq('id', st.id);
  }

  async deleteShiftType(id: string) {
      this.config.shiftTypes = this.config.shiftTypes.filter(s => s.id !== id);
      await supabase.from('shift_types').delete().eq('id', id);
  }

  async assignShift(userId: string, date: string, shiftTypeId: string) {
      // Remover asignación existente para ese día si existe (upsert lógico)
      const existingIdx = this.config.shiftAssignments.findIndex(a => a.userId === userId && a.date === date);
      if (existingIdx !== -1) {
          if (shiftTypeId === '') {
              // Borrar
              const assignmentId = this.config.shiftAssignments[existingIdx].id;
              this.config.shiftAssignments.splice(existingIdx, 1);
              await supabase.from('shift_assignments').delete().eq('id', assignmentId);
              return;
          } else {
              // Actualizar local
              this.config.shiftAssignments[existingIdx].shiftTypeId = shiftTypeId;
          }
      } else if (shiftTypeId !== '') {
          // Crear local placeholder (DB generará ID real, pero para UI sirve)
          this.config.shiftAssignments.push({ id: 'temp-'+Math.random(), userId, date, shiftTypeId });
      }

      // Persistir
      if (shiftTypeId !== '') {
          // Upsert en DB
          const { data } = await supabase.from('shift_assignments').upsert({
              user_id: userId,
              date: date,
              shift_type_id: shiftTypeId
          }, { onConflict: 'user_id,date' }).select().single();
          
          // Actualizar con ID real si volvió
          if (data) {
              const localIdx = this.config.shiftAssignments.findIndex(a => a.userId === userId && a.date === date);
              if (localIdx !== -1) this.config.shiftAssignments[localIdx].id = data.id;
          }
      }
  }

  getShiftForUserDate(userId: string, date: string): ShiftType | undefined {
      const assignment = this.config.shiftAssignments.find(a => a.userId === userId && a.date === date);
      if (!assignment) return undefined;
      return this.config.shiftTypes.find(t => t.id === assignment.shiftTypeId);
  }

  getNextShift(userId: string): { date: string, shift: ShiftType } | undefined {
      // FIX: Use local today string to avoid timezone offset issues
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const futureAssignments = this.config.shiftAssignments
          .filter(a => a.userId === userId && a.date >= today)
          .sort((a,b) => a.date.localeCompare(b.date));
      
      if (futureAssignments.length > 0) {
          const shift = this.config.shiftTypes.find(t => t.id === futureAssignments[0].shiftTypeId);
          if (shift) return { date: futureAssignments[0].date, shift };
      }
      return undefined;
  }

  // --- FESTIVOS ---
  async addHoliday(date: string, name: string) {
      const { data } = await supabase.from('holidays').insert({ date, name }).select().single();
      if (data) {
          this.config.holidays.push({ id: data.id, date: data.date, name: data.name });
      }
  }

  async updateHoliday(id: string, date: string, name: string) {
      await supabase.from('holidays').update({ date, name }).eq('id', id);
      const idx = this.config.holidays.findIndex(h => h.id === id);
      if (idx !== -1) {
          this.config.holidays[idx] = { id, date, name };
      }
  }

  async deleteHoliday(id: string) {
      await supabase.from('holidays').delete().eq('id', id);
      this.config.holidays = this.config.holidays.filter(h => h.id !== id);
  }

  // --- EPIS (PPE) ---
  async addPPEType(type: Partial<PPEType>) {
      if (!type.name || !type.sizes) return;
      const id = type.id || type.name.toLowerCase().replace(/\s+/g, '_');
      const { data } = await supabase.from('ppe_types').insert({ id, name: type.name, sizes: type.sizes }).select().single();
      if (data) {
          this.config.ppeTypes.push({ id: data.id, name: data.name, sizes: data.sizes });
      }
  }

  async deletePPEType(id: string) {
      await supabase.from('ppe_types').delete().eq('id', id);
      this.config.ppeTypes = this.config.ppeTypes.filter(p => p.id !== id);
  }

  async createPPERequest(userId: string, typeId: string, size: string) {
      const { data } = await supabase.from('ppe_requests').insert({
          user_id: userId,
          type_id: typeId,
          size,
          status: 'PENDIENTE'
      }).select().single();
      
      if (data) {
          this.config.ppeRequests.unshift({
              id: data.id,
              userId: data.user_id,
              typeId: data.type_id,
              size: data.size,
              status: data.status,
              createdAt: data.created_at
          });
          
          // Notify Admin
          // this.sendMassNotification(this.users.filter(u=>u.role!==Role.WORKER).map(u=>u.id), `Nueva solicitud de EPI de ${this.users.find(u=>u.id===userId)?.name}`);
      }
  }

  async deliverPPERequest(reqId: string) {
      const now = new Date().toISOString();
      const { data } = await supabase.from('ppe_requests').update({ 
          status: 'ENTREGADO', 
          delivery_date: now 
      }).eq('id', reqId).select().single();

      if (data) {
          const idx = this.config.ppeRequests.findIndex(r => r.id === reqId);
          if (idx !== -1) {
              this.config.ppeRequests[idx].status = 'ENTREGADO';
              this.config.ppeRequests[idx].deliveryDate = now;
              this.createNotification(this.config.ppeRequests[idx].userId, `Tu solicitud de EPI ha sido marcada como ENTREGADA.`);
          }
      }
  }
}

export const store = new Store();
