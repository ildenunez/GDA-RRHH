
export enum Role {
  WORKER = 'TRABAJADOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum RequestStatus {
  PENDING = 'PENDIENTE',
  APPROVED = 'APROBADO',
  REJECTED = 'RECHAZADO'
}

export interface LeaveTypeConfig {
  id: string;
  label: string;
  subtractsDays: boolean;
  fixedRange?: {
    startDate: string;
    endDate: string;
  } | null;
}

export enum RequestType {
  VACATION = 'VACACIONES',
  SICKNESS = 'BAJA_MEDICA',
  PERSONAL = 'ASUNTOS_PROPIOS',
  OVERTIME_EARN = 'HORAS_EXTRA_GENERAR',
  OVERTIME_SPEND_DAYS = 'HORAS_EXTRA_CANJEAR_DIAS',
  OVERTIME_PAY = 'HORAS_EXTRA_COBRAR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  daysAvailable: number;
  overtimeHours: number;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  supervisorIds: string[];
}

export interface OvertimeUsage {
  requestId: string; // ID del registro origen (donde se ganaron las horas)
  hoursUsed: number; // Cuantas horas se consumen de ese registro específico
}

export interface LeaveRequest {
  id: string;
  userId: string;
  typeId: string;
  label: string;
  startDate: string;
  endDate?: string;
  hours?: number;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  
  // Trazabilidad de Horas
  isConsumed?: boolean; // Si true, este registro está AGOTADO totalmente
  consumedHours?: number; // Cuantas horas se han gastado ya de este registro (Acumulativo)
  
  // Para solicitudes de consumo (Spend/Pay)
  overtimeUsage?: OvertimeUsage[]; // Detalle de qué registros se usaron y cuánto
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  date: string;
}

export interface EmailTemplate {
  id: string; // e.g. 'request_created', 'request_approved'
  label: string;
  subject: string;
  body: string;
  recipients: {
    worker: boolean;
    supervisor: boolean;
    admin: boolean;
  };
}

export interface AppConfig {
  leaveTypes: LeaveTypeConfig[];
  emailTemplates: EmailTemplate[];
  shifts: string[];
  smtpSettings: {
    host: string;
    port: number;
    user: string;
    enabled: boolean;
  };
}
