
import { User, Role, Department, LeaveRequest, RequestStatus, AppConfig, Notification, LeaveTypeConfig, EmailTemplate, ShiftType, ShiftAssignment, Holiday, PPEType, PPERequest, RequestType } from '../types';
import { supabase } from './supabase';

const DEFAULT_LEAVE_TYPES: LeaveTypeConfig[] = [
  { id: 'vacaciones', label: 'Vacaciones', subtractsDays: true, fixedRange: null },
  { id: 'baja_medica', label: 'Baja Médica', subtractsDays: false, fixedRange: null },
  { id: 'asuntos_propios', label: 'Asuntos Propios', subtractsDays: true, fixedRange: null },
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
        const { data: usersData, error: uErr } = await supabase.from('users').select('*');
        if (uErr) throw uErr;
        
        const { data: deptsData } = await supabase.from('departments').select('*');
        const { data: reqsData } = await supabase.from('requests').select('*');
        const { data: typesData } = await supabase.from('leave_types').select('*');
        const { data: notifData } = await supabase.from('notifications').select('*');
        const { data: shiftTypesData } = await supabase.from('shift_types').select('*');
        const { data: shiftAssignmentsData } = await supabase.from('shift_assignments').select('*');
        const { data: holidaysData } = await supabase.from('holidays').select('*');
        const { data: ppeTypes } = await supabase.from('ppe_types').select('*');
        const { data: ppeRequests } = await supabase.from('ppe_requests').select('*');
        
        const { data: smtpData } = await supabase.from('settings').select('value').eq('key', 'smtp').single();
        if (smtpData && smtpData.value) {
            this.config.smtpSettings = smtpData.value;
        }

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
                label: String(t.label || ''),
                subtractsDays: !!t.subtracts_days,
                fixedRange: t.fixed_range
            }));
        } else {
            this.config.leaveTypes = [...DEFAULT_LEAVE_TYPES];
        }

        if (shiftTypesData) {
            this.config.shiftTypes = shiftTypesData.map((s: any) => ({
                id: s.id,
                name: String(s.name || ''),
                color: s.color,
                segments: s.segments || []
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
                name: String(h.name || '')
            }));
        }

        if (ppeTypes) {
            this.config.ppeTypes = ppeTypes.map((p: any) => ({
                id: p.id,
                name: String(p.name || ''),
                sizes: p.sizes || []
            }));
        }

        if (ppeRequests) {
            this.config.ppeRequests = ppeRequests.map((r: any) => ({
                id: r.id,
                userId: r.user_id,
                typeId: r.type_id,
                type_id: r.type_id,
                size: r.size,
                status: r.status,
                createdAt: r.created_at,
                deliveryDate: r.delivery_date
            })).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        
        this.initialized = true;
    } catch (error: any) {
        console.error("Error fatal de inicialización:", error);
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
      return data.map(r => {
          let typeId = r.type_id;
          if (typeId === 'overtime_earn') typeId = RequestType.OVERTIME_EARN;
          if (typeId === 'overtime_pay') typeId = RequestType.OVERTIME_PAY;
          if (typeId === 'overtime_spend_days') typeId = RequestType.OVERTIME_SPEND_DAYS;
          if (typeId === 'unjustified_absence') typeId = RequestType.UNJUSTIFIED;
          if (typeId === 'adjustment_days') typeId = RequestType.ADJUSTMENT_DAYS;
          if (typeId === 'overtime_adjustment') typeId = RequestType.ADJUSTMENT_OVERTIME;

          let label = String(r.label || '');
          if (LABEL_TRANSLATIONS[label]) {
              label = LABEL_TRANSLATIONS[label];
          } else if (LABEL_TRANSLATIONS[typeId]) {
              if (!label || label === typeId) {
                  label = LABEL_TRANSLATIONS[typeId];
              }
          }

          return {
            id: r.id,
            userId: r.user_id,
            typeId: typeId,
            label: label,
            startDate: r.start_date,
            endDate: r.end_date,
            hours: r.hours,
            reason: r.reason,
            status: r.status as RequestStatus,
            createdAt: r.created_at,
            adminComment: r.admin_comment,
            createdByAdmin: !!r.created_by_admin,
            isConsumed: !!r.is_consumed,
            consumedHours: r.consumed_hours,
            overtimeUsage: r.overtime_usage,
            isJustified: !!r.is_justified,
            reportedToAdmin: !!r.reported_to_admin
          };
      });
  }

  private mapNotificationsFromDB(data: any[]): Notification[] {
    return data.map(n => ({
      id: n.id,
      userId: n.user_id,
      message: String(n.message || ''),
      read: !!n.read,
      date: n.date || n.created_at
    }));
  }

  async login(email: string, pass: string): Promise<User | null> {
    if (!this.initialized) await this.init();
    const user = this.users.find(u => u.email === email.trim().toLowerCase());
    if (user) {
        const { data, error } = await supabase.from('users').select('password').eq('id', user.id).single();
        if (!error && data && String(data.password) === String(pass)) {
            this.currentUser = user;
            return user;
        }
    }
    return null;
  }

  getMyRequests(): LeaveRequest[] {
    if (!this.currentUser) return [];
    return this.requests.filter(r => r.userId === this.currentUser!.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  getAllUsers(): User[] {
    return this.users;
  }

  getUsersByDepartment(deptId: string): User[] {
    return this.users.filter(u => u.departmentId === deptId);
  }

  getNotificationsForUser(userId: string): Notification[] {
    return this.notifications.filter(n => n.userId === userId).sort((a,b) => b.date.localeCompare(a.date));
  }

  getPendingApprovalsForUser(userId: string): LeaveRequest[] {
    const user = this.users.find(u => u.id === userId);
    if (!user) return [];
    
    let targetDeptIds: string[] = [];
    if (user.role === Role.ADMIN) {
        targetDeptIds = this.departments.map(d => d.id);
    } else if (user.role === Role.SUPERVISOR) {
        targetDeptIds = this.departments.filter(d => d.supervisorIds.includes(userId)).map(d => d.id);
    }

    return this.requests.filter(r => {
        if (r.status !== RequestStatus.PENDING) return false;
        const requester = this.users.find(u => u.id === r.userId);
        return requester && targetDeptIds.includes(requester.departmentId);
    });
  }

  isOvertimeRequest(typeId: string): boolean {
    const overtimeIds = [
        RequestType.OVERTIME_EARN,
        RequestType.OVERTIME_PAY,
        RequestType.OVERTIME_SPEND_DAYS,
        RequestType.WORKED_HOLIDAY,
        RequestType.ADJUSTMENT_OVERTIME
    ];
    return overtimeIds.includes(typeId as RequestType) || typeId.startsWith('overtime_');
  }

  // Helper para calcular el impacto de una solicitud en los saldos
  private calculateRequestImpact(typeId: string, startDate: string, endDate?: string, hours?: number) {
      let deltaDays = 0;
      let deltaHours = 0;

      const leaveType = this.config.leaveTypes.find(t => t.id === typeId);

      // Casos de AUSENCIA
      if (leaveType && leaveType.subtractsDays) {
          const start = new Date(startDate);
          const end = new Date(endDate || startDate);
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          deltaDays = -diffDays;
      }

      // Casos de HORAS EXTRA / AJUSTES
      switch (typeId) {
          case RequestType.OVERTIME_EARN:
              deltaHours = +(hours || 0);
              break;
          case RequestType.OVERTIME_PAY:
              deltaHours = -(hours || 0);
              break;
          case RequestType.OVERTIME_SPEND_DAYS:
              deltaHours = -(hours || 0);
              // Si es canje, solemos sumar días (ej: 8h = 1 día), pero aquí el usuario 
              // suele crear la solicitud de ausencia aparte o el admin lo ajusta.
              // Por ahora solo descontamos las horas.
              break;
          case RequestType.ADJUSTMENT_DAYS:
              deltaDays = +(hours || 0); // En ajustes de días, usamos el campo hours para el valor
              break;
          case RequestType.ADJUSTMENT_OVERTIME:
              deltaHours = +(hours || 0);
              break;
          case RequestType.WORKED_HOLIDAY:
              // Por defecto, festivo trabajado suma 1 día o 4h, configurable.
              // Implementamos +1 día por defecto
              deltaDays = +1;
              break;
      }

      return { deltaDays, deltaHours };
  }

  async createRequest(data: any, userId: string, status: RequestStatus = RequestStatus.PENDING) {
    let finalLabel = data.label;
    if (!finalLabel) {
        if (data.typeId === RequestType.UNJUSTIFIED) {
            finalLabel = 'Ausencia Justificable';
        } else if (data.typeId === RequestType.OVERTIME_PAY) {
            finalLabel = 'Abono en Nómina';
        } else if (data.typeId === RequestType.OVERTIME_EARN) {
            finalLabel = 'Registro Horas Extra';
        } else if (data.typeId === RequestType.OVERTIME_SPEND_DAYS) {
            finalLabel = 'Canje Horas por Días';
        } else if (data.typeId === RequestType.WORKED_HOLIDAY) {
            finalLabel = 'Festivo Trabajado';
        } else {
            finalLabel = this.config.leaveTypes.find(t => t.id === data.typeId)?.label || data.typeId;
        }
    }

    const newReq = {
      user_id: userId,
      type_id: data.typeId,
      label: finalLabel,
      start_date: data.startDate,
      end_date: data.endDate,
      hours: data.hours,
      reason: data.reason,
      status: status,
      created_at: new Date().toISOString(),
      overtime_usage: data.overtimeUsage,
      is_justified: data.isJustified || false,
      reported_to_admin: data.reported_to_admin || false
    };

    const { data: inserted, error } = await supabase.from('requests').insert(newReq).select().single();
    if (error) throw error;
    
    if (inserted) {
      const mapped = this.mapRequestsFromDB([inserted])[0];
      this.requests.push(mapped);

      // DESCUENTO INMEDIATO: Si la solicitud no es rechazada de entrada, aplicamos impacto
      if (status !== RequestStatus.REJECTED) {
          const { deltaDays, deltaHours } = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
          const user = this.users.find(u => u.id === userId);
          if (user) {
              await this.updateUserBalance(userId, user.daysAvailable + deltaDays, user.overtimeHours + deltaHours);
          }
      }
      
      await this.refreshUserBalances();
    }
  }

  async startNewYear() {
      const nextYear = new Date().getFullYear() + 1;
      const concept = `Vacaciones ${nextYear}`;
      
      for (const user of this.users) {
          const newBalance = (user.daysAvailable || 0) + 31;
          await this.updateUserBalance(user.id, newBalance, user.overtimeHours);
          await this.createRequest({
              typeId: RequestType.ADJUSTMENT_DAYS,
              label: concept,
              startDate: new Date().toISOString(),
              hours: 31,
              reason: 'Carga automática de inicio de año'
          }, user.id, RequestStatus.APPROVED);
      }
      await this.refreshUserBalances();
  }

  async updateRequest(id: string, data: any) {
    // Para simplificar, si se edita, revertimos el impacto viejo y aplicamos el nuevo
    const oldReq = this.requests.find(r => r.id === id);
    if (oldReq && oldReq.status !== RequestStatus.REJECTED) {
        const oldImpact = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const user = this.users.find(u => u.id === oldReq.userId);
        if (user) {
            // Revertir
            await this.updateUserBalance(user.id, user.daysAvailable - oldImpact.deltaDays, user.overtimeHours - oldImpact.deltaHours);
        }
    }

    const { error } = await supabase.from('requests').update({
      type_id: data.typeId,
      start_date: data.startDate,
      end_date: data.endDate,
      hours: data.hours,
      reason: data.reason,
      overtime_usage: data.overtimeUsage
    }).eq('id', id);
    if (error) throw error;

    // Aplicar nuevo impacto (si no es rechazado)
    if (oldReq && oldReq.status !== RequestStatus.REJECTED) {
        const newImpact = this.calculateRequestImpact(data.typeId, data.startDate, data.endDate, data.hours);
        const user = this.users.find(u => u.id === oldReq.userId);
        if (user) {
            await this.updateUserBalance(user.id, user.daysAvailable + newImpact.deltaDays, user.overtimeHours + newImpact.deltaHours);
        }
    }

    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.requests[idx] = { ...this.requests[idx], ...data };
    }
    await this.refreshUserBalances();
  }

  async updateRequestStatus(id: string, status: RequestStatus, adminId: string, adminComment?: string) {
    const oldReq = this.requests.find(r => r.id === id);
    if (!oldReq) return;

    // Si pasa a RECHAZADO, devolvemos el saldo que se descontó al crearla (PENDIENTE)
    if (oldReq.status !== RequestStatus.REJECTED && status === RequestStatus.REJECTED) {
        const impact = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const user = this.users.find(u => u.id === oldReq.userId);
        if (user) {
            // Devolver: restamos el delta negativo (que es sumar)
            await this.updateUserBalance(user.id, user.daysAvailable - impact.deltaDays, user.overtimeHours - impact.deltaHours);
        }
    } 
    // Si estaba RECHAZADA y pasa a aprobada/pendiente, volvemos a descontar
    else if (oldReq.status === RequestStatus.REJECTED && status !== RequestStatus.REJECTED) {
        const impact = this.calculateRequestImpact(oldReq.typeId, oldReq.startDate, oldReq.endDate, oldReq.hours);
        const user = this.users.find(u => u.id === oldReq.userId);
        if (user) {
            await this.updateUserBalance(user.id, user.daysAvailable + impact.deltaDays, user.overtimeHours + impact.deltaHours);
        }
    }

    const { error } = await supabase.from('requests').update({ status, admin_comment: adminComment }).eq('id', id);
    if (error) throw error;
    
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.requests[idx].status = status;
      this.requests[idx].adminComment = adminComment;
    }
    await this.refreshUserBalances();
  }

  async deleteRequest(id: string) {
    const req = this.requests.find(r => r.id === id);
    
    // Si la solicitud estaba aprobada o pendiente (descontada), devolvemos el saldo antes de borrar
    if (req && req.status !== RequestStatus.REJECTED) {
        const impact = this.calculateRequestImpact(req.typeId, req.startDate, req.endDate, req.hours);
        const user = this.users.find(u => u.id === req.userId);
        if (user) {
            await this.updateUserBalance(user.id, user.daysAvailable - impact.deltaDays, user.overtimeHours - impact.deltaHours);
        }
    }

    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) throw error;
    this.requests = this.requests.filter(r => r.id !== id);
    await this.refreshUserBalances();
  }

  async refreshUserBalances() {
    const { data: usersData } = await supabase.from('users').select('*');
    if (usersData) {
        this.users = this.mapUsersFromDB(usersData);
        if (this.currentUser) {
            const updated = this.users.find(u => u.id === this.currentUser!.id);
            if (updated) this.currentUser = updated;
        }
    }
  }

  async updateJustification(id: string, isJustified: boolean, reportedToAdmin: boolean) {
    await supabase.from('requests').update({ is_justified: isJustified, reported_to_admin: reportedToAdmin }).eq('id', id);
    const idx = this.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.requests[idx].isJustified = isJustified;
      this.requests[idx].reportedToAdmin = reportedToAdmin;
    }
  }

  getRequestConflicts(req: LeaveRequest): LeaveRequest[] {
    const requester = this.users.find(u => u.id === req.userId);
    if (!requester) return [];
    
    return this.requests.filter(r => {
      if (r.id === req.id || r.status === RequestStatus.REJECTED || this.isOvertimeRequest(r.typeId)) return false;
      const otherUser = this.users.find(u => u.id === r.userId);
      if (!otherUser || otherUser.departmentId !== requester.departmentId) return false;
      
      const s1 = new Date(req.startDate).getTime();
      const e1 = new Date(req.endDate || req.startDate).getTime();
      const s2 = new Date(r.startDate).getTime();
      const e2 = new Date(r.endDate || r.startDate).getTime();
      
      return s1 <= e2 && s2 <= e1;
    });
  }

  getShiftForUserDate(userId: string, date: string): ShiftType | undefined {
    const assignment = this.config.shiftAssignments.find(a => a.userId === userId && a.date === date);
    return assignment ? this.config.shiftTypes.find(s => s.id === assignment.shiftTypeId) : undefined;
  }

  getNextShift(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const assignments = this.config.shiftAssignments
      .filter(a => a.userId === userId && a.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date));
    
    if (assignments.length > 0) {
      const shift = this.config.shiftTypes.find(s => s.id === assignments[0].shiftTypeId);
      if (shift) return { date: assignments[0].date, shift };
    }
    return null;
  }

  async assignShift(user_id: string, date: string, shift_type_id: string) {
    if (!shift_type_id) {
      await supabase.from('shift_assignments').delete().match({ user_id, date });
      this.config.shiftAssignments = this.config.shiftAssignments.filter(a => !(a.userId === user_id && a.date === date));
    } else {
      const { data, error } = await supabase.from('shift_assignments').upsert({ user_id, date, shift_type_id }).select().single();
      if (data) {
        const idx = this.config.shiftAssignments.findIndex(a => a.userId === user_id && a.date === date);
        const mapped = { id: data.id, userId: data.user_id, date: data.date, shiftTypeId: data.shift_type_id };
        if (idx !== -1) this.config.shiftAssignments[idx] = mapped;
        else this.config.shiftAssignments.push(mapped);
      }
    }
  }

  async addLeaveType(t: LeaveTypeConfig) { 
    await supabase.from('leave_types').insert({ id: t.id, label: t.label, subtracts_days: t.subtractsDays, fixed_range: t.fixedRange });
    this.config.leaveTypes.push(t);
  }
  async updateLeaveType(t: LeaveTypeConfig) { 
    await supabase.from('leave_types').update({ label: t.label, subtracts_days: t.subtractsDays, fixed_range: t.fixedRange }).eq('id', t.id);
    const idx = this.config.leaveTypes.findIndex(lt => lt.id === t.id);
    if (idx !== -1) this.config.leaveTypes[idx] = t;
  }
  async removeLeaveType(id: string) {
    await supabase.from('leave_types').delete().eq('id', id);
    this.config.leaveTypes = this.config.leaveTypes.filter(t => t.id !== id);
  }

  async addDepartment(d: Department) {
    const { data } = await supabase.from('departments').insert({ name: d.name, supervisor_ids: d.supervisorIds }).select();
    if (data) this.departments = data.map(dept => ({ id: dept.id, name: dept.name, supervisorIds: dept.supervisor_ids || [] }));
  }
  async updateDepartment(d: Department) {
    await supabase.from('departments').update({ name: d.name, supervisor_ids: d.supervisorIds }).eq('id', d.id);
    const idx = this.departments.findIndex(dept => dept.id === d.id);
    if (idx !== -1) this.departments[idx] = d;
  }
  async removeDepartment(id: string) {
    await supabase.from('departments').delete().eq('id', id);
    this.departments = this.departments.filter(d => d.id !== id);
  }

  async addShiftType(s: ShiftType) {
    await supabase.from('shift_types').insert({ name: s.name, color: s.color, segments: s.segments });
    this.config.shiftTypes.push(s);
  }
  async updateShiftType(s: ShiftType) {
    await supabase.from('shift_types').update({ name: s.name, color: s.color, segments: s.segments }).eq('id', s.id);
    const idx = this.config.shiftTypes.findIndex(st => st.id === s.id);
    if (idx !== -1) this.config.shiftTypes[idx] = s;
  }
  async deleteShiftType(id: string) {
    await supabase.from('shift_types').delete().eq('id', id);
    this.config.shiftTypes = this.config.shiftTypes.filter(s => s.id !== id);
  }

  async addHoliday(date: string, name: string) {
    const { data } = await supabase.from('holidays').insert({ date, name }).select().single();
    if (data) this.config.holidays.push({ id: data.id, date: data.date, name: data.name });
  }
  async updateHoliday(id: string, date: string, name: string) {
    await supabase.from('holidays').update({ date, name }).eq('id', id);
    const idx = this.config.holidays.findIndex(h => h.id === id);
    if (idx !== -1) this.config.holidays[idx] = { id, date, name };
  }
  async deleteHoliday(id: string) {
    await supabase.from('holidays').delete().eq('id', id);
    this.config.holidays = this.config.holidays.filter(h => h.id !== id);
  }

  async addPPEType(p: { name: string, sizes: string[] }) {
    const { data } = await supabase.from('ppe_types').insert(p).select().single();
    if (data) this.config.ppeTypes.push({ id: data.id, name: data.name, sizes: data.sizes });
  }
  async deletePPEType(id: string) {
    await supabase.from('ppe_types').delete().eq('id', id);
    this.config.ppeTypes = this.config.ppeTypes.filter(p => p.id !== id);
  }

  async createPPERequest(user_id: string, type_id: string, size: string) {
    const { data } = await supabase.from('ppe_requests').insert({ user_id, type_id, size, status: 'PENDIENTE', created_at: new Date().toISOString() }).select().single();
    if (data) this.config.ppeRequests.unshift({
        id: data.id,
        userId: data.user_id,
        typeId: data.type_id,
        type_id: data.type_id,
        size: data.size,
        status: data.status,
        createdAt: data.created_at
    });
  }

  async deliverPPERequest(id: string) {
    const delivery_date = new Date().toISOString();
    await supabase.from('ppe_requests').update({ status: 'ENTREGADO', delivery_date }).eq('id', id);
    const idx = this.config.ppeRequests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.config.ppeRequests[idx].status = 'ENTREGADO';
      this.config.ppeRequests[idx].deliveryDate = delivery_date;
    }
  }

  async createUser(u: Partial<User>, pass: string) {
    const { data } = await supabase.from('users').insert({
        name: u.name,
        email: u.email,
        password: pass,
        role: u.role,
        department_id: u.departmentId,
        days_available: u.daysAvailable,
        overtime_hours: u.overtimeHours
    }).select().single();
    if (data) this.users.push(this.mapUsersFromDB([data])[0]);
  }
  async updateUserAdmin(id: string, data: any) {
    await supabase.from('users').update({
        name: data.name,
        email: data.email,
        department_id: data.departmentId
    }).eq('id', id);
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) this.users[idx] = { ...this.users[idx], ...data };
  }
  async updateUserRole(id: string, role: Role) {
    await supabase.from('users').update({ role }).eq('id', id);
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) this.users[idx].role = role;
  }
  async updateUserBalance(id: string, daysAvailable: number, overtimeHours: number) {
    const { error } = await supabase.from('users').update({ 
        days_available: daysAvailable, 
        overtime_hours: overtimeHours 
    }).eq('id', id);
    
    if (error) {
        console.error("Error al actualizar balance:", error);
        return;
    }

    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users[idx].daysAvailable = daysAvailable;
      this.users[idx].overtimeHours = overtimeHours;
    }
  }
  async updateUserProfile(id: string, data: any) {
    const updates: any = {
        name: data.name,
        email: data.email,
        avatar: data.avatar
    };
    if (data.password) updates.password = data.password;
    
    await supabase.from('users').update(updates).eq('id', id);
    const idx = this.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], name: data.name, email: data.email, avatar: data.avatar };
      if (this.currentUser?.id === id) this.currentUser = this.users[idx];
    }
  }
  async deleteUser(id: string) {
    await supabase.from('users').delete().eq('id', id);
    this.users = this.users.filter(u => u.id !== id);
  }

  async markNotificationAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx !== -1) this.notifications[idx].read = true;
  }
  async markAllNotificationsAsRead(userId: string) {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    this.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
  }
  async deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    this.notifications = this.notifications.filter(n => n.id !== id);
  }
  async sendMassNotification(recipients: string[], message: string) {
    const notifs = recipients.map(uid => ({ user_id: uid, message, date: new Date().toISOString(), read: false }));
    const { data } = await supabase.from('notifications').insert(notifs).select();
    if (data) this.notifications.push(...this.mapNotificationsFromDB(data));
  }

  getAvailableOvertimeRecords(userId: string): LeaveRequest[] {
    return this.requests.filter(r => 
        r.userId === userId && 
        r.status === RequestStatus.APPROVED && 
        (r.typeId === RequestType.OVERTIME_EARN || r.typeId === RequestType.ADJUSTMENT_OVERTIME) &&
        !r.isConsumed &&
        (r.hours || 0) > (r.consumedHours || 0)
    );
  }

  getCalendarRequests(userId: string, deptId?: string): LeaveRequest[] {
    return this.requests.filter(r => {
        if (this.isOvertimeRequest(r.typeId) && r.typeId !== RequestType.WORKED_HOLIDAY) return false;
        if (deptId) {
            const u = this.users.find(usr => usr.id === r.userId);
            return u && u.departmentId === deptId;
        }
        return true;
    });
  }

  async updateSmtpSettings(settings: any) {
    this.config.smtpSettings = settings;
    await supabase.from('settings').upsert({ key: 'smtp', value: settings });
  }

  updateEmailTemplate(tpl: EmailTemplate) {
    const idx = this.config.emailTemplates.findIndex(t => t.id === tpl.id);
    if (idx !== -1) this.config.emailTemplates[idx] = tpl;
  }

  async sendTestEmail(toEmail: string): Promise<{success: boolean, log: string[]}> {
      const logs: string[] = ["⚙️ Iniciando diagnóstico...", "Cargando configuración persistente..."];
      
      try {
          logs.push(`🚀 Llamando a pasarela de Supabase...`);
          
          const { data, error } = await supabase.functions.invoke('send-test-email', {
              body: { 
                  to: toEmail, 
                  config: this.config.smtpSettings 
              }
          });

          if (error) {
              logs.push(`❌ ERROR DE FUNCIÓN: ${error.message || 'Error desconocido'}`);
              if (error.message?.includes('404')) {
                  logs.push("CONSEJO: La función 'send-test-email' no parece estar desplegada en Supabase.");
              }
              return { success: false, log: logs };
          }

          if (data && data.success) {
              logs.push("✅ CONEXIÓN SMTP EXITOSA.");
              logs.push(`📧 Email enviado correctamente a ${toEmail}.`);
              return { success: true, log: logs };
          } else {
              logs.push(`❌ EL SERVIDOR SMTP RECHAZÓ EL ENVÍO: ${data?.error || 'Error desconocido del servidor de correo'}`);
              logs.push(`DETALLE TÉCNICO: ${data?.details || 'No hay detalles adicionales'}`);
              return { success: false, log: logs };
          }

      } catch (e: any) {
          logs.push(`🔥 FALLO CRÍTICO DE RED: ${e.message}`);
          logs.push("CONSEJO: Verifica que la URL de Supabase y la ANON KEY sean correctas.");
          return { success: false, log: logs };
      }
  }
}

export const store = new Store();
