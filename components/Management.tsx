
import React, { useState, useMemo } from 'react';
import { User, RequestStatus, Role, LeaveRequest } from '../types';
import { store } from '../services/store';
import ShiftScheduler from './ShiftScheduler';
import RequestFormModal from './RequestFormModal';
import { Check, X, Users, Edit2, Shield, Trash2, AlertTriangle, Briefcase, FileText, Activity, Clock, CalendarDays, ExternalLink, UserPlus, MessageSquare, PieChart, TrendingUp, Calendar, Filter, Paintbrush, Plus } from 'lucide-react';

export const Approvals: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
  const [pending, setPending] = useState(store.getPendingApprovalsForUser(user.id));
  
  // Estado para el modal de confirmación
  const [confirmAction, setConfirmAction] = useState<{reqId: string, status: RequestStatus} | null>(null);
  const [adminComment, setAdminComment] = useState('');

  const handleActionClick = (reqId: string, status: RequestStatus) => {
      setConfirmAction({ reqId, status });
      setAdminComment('');
  };

  const executeAction = async () => {
      if (!confirmAction) return;
      await store.updateRequestStatus(confirmAction.reqId, confirmAction.status, user.id, adminComment);
      setPending(store.getPendingApprovalsForUser(user.id));
      setConfirmAction(null);
  };

  const getDurationString = (req: LeaveRequest) => {
      if (req.hours && req.hours > 0) return `${req.hours}h`;
      const start = new Date(req.startDate);
      const end = req.endDate ? new Date(req.endDate) : start;
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const diff = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1; 
      return `${days} día${days !== 1 ? 's' : ''}`;
  };

  const absences = pending.filter(r => !store.isOvertimeRequest(r.typeId));
  const overtime = pending.filter(r => store.isOvertimeRequest(r.typeId));

  const RequestList = ({ requests, title, icon: Icon, colorClass }: { requests: LeaveRequest[], title: string, icon: any, colorClass: string }) => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100">
            <h2 className={`text-xl font-bold text-slate-800 flex items-center gap-2`}>
              <Icon className={colorClass}/> {title}
              <span className="text-sm font-normal text-slate-500 ml-2">({requests.length})</span>
            </h2>
          </div>
          {requests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 italic">
              No hay solicitudes pendientes en esta categoría.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => {
                const requester = store.users.find(u => u.id === req.userId);
                return (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => onViewRequest(req)}>
                      <img src={requester?.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            {requester?.name} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100"/>
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-slate-500 font-medium">{req.label}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                                {getDurationString(req)}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {new Date(req.startDate).toLocaleDateString()} 
                            {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}
                        </p>
                        {req.reason && <p className="text-xs text-slate-400 italic mt-1">"{req.reason}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleActionClick(req.id, RequestStatus.REJECTED)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1">
                        <X size={16} /> Rechazar
                      </button>
                      <button onClick={() => handleActionClick(req.id, RequestStatus.APPROVED)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-1">
                        <Check size={16} /> Aprobar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
        <RequestList 
            title="Solicitudes de Ausencia" 
            requests={absences} 
            icon={CalendarDays} 
            colorClass="text-orange-500" 
        />
        <RequestList 
            title="Gestión de Horas" 
            requests={overtime} 
            icon={Clock} 
            colorClass="text-blue-500" 
        />

        {/* Modal de Confirmación de Acción */}
        {confirmAction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {confirmAction.status === RequestStatus.APPROVED ? <Check className="text-green-500"/> : <X className="text-red-500"/>}
                            Confirmar {confirmAction.status === RequestStatus.APPROVED ? 'Aprobación' : 'Rechazo'}
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600">
                            ¿Estás seguro de que deseas <strong>{confirmAction.status === RequestStatus.APPROVED ? 'APROBAR' : 'RECHAZAR'}</strong> esta solicitud?
                        </p>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <MessageSquare size={16}/> Comentario (Opcional)
                            </label>
                            <textarea 
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                rows={3}
                                placeholder="Añade un motivo o mensaje para el empleado..."
                                value={adminComment}
                                onChange={e => setAdminComment(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                        <button 
                            onClick={() => setConfirmAction(null)} 
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={executeAction}
                            className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition-colors ${
                                confirmAction.status === RequestStatus.APPROVED ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            Confirmar Acción
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export const UserManagement: React.FC<{ currentUser: User, onViewRequest: (req: LeaveRequest) => void }> = ({ currentUser, onViewRequest }) => {
  const [viewTab, setViewTab] = useState<'list' | 'planning'>('list');
  const [users, setUsers] = useState(store.getAllUsers());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterDeptId, setFilterDeptId] = useState<string>('');
  
  // Estado para Creación
  const [newPassword, setNewPassword] = useState('');

  // Estado para los ajustes manuales en el modal
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReasonDays, setAdjustmentReasonDays] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [adjustmentReasonHours, setAdjustmentReasonHours] = useState('');

  // Estado para el modal de Crear/Editar Solicitud Manual (Admin)
  const [showAdminRequestModal, setShowAdminRequestModal] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<LeaveRequest | null>(null);

  // Lógica de Filtrado de Usuarios
  const displayUsers = useMemo(() => {
      let result = users;

      // 1. Filtrar por Rol (Si es Supervisor, solo ve su equipo)
      if (currentUser.role !== Role.ADMIN) {
          const myDepts = store.departments.filter(d => d.supervisorIds.includes(currentUser.id)).map(d => d.id);
          result = result.filter(u => myDepts.includes(u.departmentId));
      }

      // 2. Filtrar por Selección de Departamento (Solo Admin o Supervisor si quiere filtrar dentro de sus deptos)
      if (filterDeptId) {
          result = result.filter(u => u.departmentId === filterDeptId);
      }

      return result;
  }, [users, currentUser, filterDeptId]);
  
  // Estadísticas del Equipo (Se calculan sobre los usuarios visualizados)
  const teamStats = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const totalMembers = displayUsers.length;
      
      const totalPendingDays = displayUsers.reduce((sum, u) => sum + u.daysAvailable, 0);
      const totalPendingHours = displayUsers.reduce((sum, u) => sum + u.overtimeHours, 0);

      const absentMembers = displayUsers.filter(u => {
          return store.requests.some(r => 
              r.userId === u.id && 
              r.status === RequestStatus.APPROVED &&
              !store.isOvertimeRequest(r.typeId) &&
              today >= r.startDate.split('T')[0] && 
              today <= (r.endDate || r.startDate).split('T')[0]
          );
      });
      const absentPercentage = totalMembers > 0 ? (absentMembers.length / totalMembers) * 100 : 0;

      const upcomingAbsences = store.requests.filter(r => {
          const userInTeam = displayUsers.find(u => u.id === r.userId);
          const startDate = r.startDate.split('T')[0];
          return userInTeam && 
                 r.status === RequestStatus.APPROVED && 
                 !store.isOvertimeRequest(r.typeId) &&
                 startDate > today;
      }).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3);

      return { totalPendingDays, totalPendingHours, absentPercentage, upcomingAbsences };
  }, [displayUsers]);

  const teamUserIds = displayUsers.map(u => u.id);
  const teamRequests = store.requests.filter(r => teamUserIds.includes(r.userId)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const editingUserRequests = editingUser && editingUser.id ? store.requests.filter(r => r.userId === editingUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const openEditModal = (u: User) => {
      setEditingUser({...u});
      setNewPassword(''); // Reset
      setAdjustmentDays(0);
      setAdjustmentReasonDays('');
      setAdjustmentHours(0);
      setAdjustmentReasonHours('');
  }

  const openCreateModal = () => {
      setEditingUser({
          id: '', // Empty ID signifies creation
          name: '',
          email: '',
          role: Role.WORKER,
          departmentId: store.departments[0]?.id || '',
          daysAvailable: 22,
          overtimeHours: 0,
          avatar: ''
      });
      setNewPassword('');
      setAdjustmentDays(0);
      setAdjustmentReasonDays('');
      setAdjustmentHours(0);
      setAdjustmentReasonHours('');
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingUser) return;

    if (editingUser.id === '') {
        if (!newPassword) {
            alert('La contraseña es obligatoria para nuevos usuarios.');
            return;
        }
        await store.createUser(editingUser, newPassword);
    } 
    else {
        store.updateUserRole(editingUser.id, editingUser.role);
        
        const originalUser = store.users.find(u => u.id === editingUser.id);
        if(originalUser) {
            originalUser.name = editingUser.name;
            originalUser.email = editingUser.email;
            originalUser.departmentId = editingUser.departmentId;
        }

        let newBalanceDays = editingUser.daysAvailable;
        let newBalanceHours = editingUser.overtimeHours;

        if (adjustmentDays !== 0) {
            newBalanceDays += adjustmentDays;
            store.createNotification(editingUser.id, `Ajuste manual de días: ${adjustmentDays > 0 ? '+' : ''}${adjustmentDays}. Motivo: ${adjustmentReasonDays || 'Gestión Administrativa'}`);
        }

        if (adjustmentHours !== 0) {
            newBalanceHours += adjustmentHours;
            store.createNotification(editingUser.id, `Ajuste manual de horas: ${adjustmentHours > 0 ? '+' : ''}${adjustmentHours}h. Motivo: ${adjustmentReasonHours || 'Gestión Administrativa'}`);
        }
        
        store.updateUserBalance(editingUser.id, newBalanceDays, newBalanceHours);
    }

    setUsers(store.getAllUsers());
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: string) => {
      if (confirm('¿Estás seguro de que quieres eliminar a este usuario? Esta acción no se puede deshacer.')) {
          store.deleteUser(userId);
          setUsers(store.getAllUsers());
      }
  };
  
  const handleEditRequest = (req: LeaveRequest) => {
      setRequestToEdit(req);
      setShowAdminRequestModal(true);
  };

  const handleDeleteRequest = async (reqId: string) => {
      if(confirm('¿Borrar solicitud? Si está aprobada se devolverán los saldos correspondientes al usuario.')) {
          await store.deleteRequest(reqId);
          setUsers([...store.getAllUsers()]); // Force update in case balance changed
          // Update local editing user to reflect balance changes immediately
          if (editingUser) {
              const updated = store.users.find(u => u.id === editingUser.id);
              if (updated) setEditingUser({...updated});
          }
      }
  };

  const getDeptName = (id: string) => store.departments.find(d => d.id === id)?.name || id;

  const getDurationString = (req: LeaveRequest) => {
      if (req.hours && req.hours > 0) return `${req.hours}h`;
      const start = new Date(req.startDate);
      const end = req.endDate ? new Date(req.endDate) : start;
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const diff = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1; 
      return `${days} día${days !== 1 ? 's' : ''}`;
  };

  const isCreating = editingUser && editingUser.id === '';
  const isAdmin = currentUser.role === Role.ADMIN;

  const availableDeptsForFilter = currentUser.role === Role.ADMIN 
        ? store.departments 
        : store.departments.filter(d => d.supervisorIds.includes(currentUser.id));

  // Determine user for the Request Modal (either from full edit modal or from selected request)
  const requestModalTargetUser = editingUser || (requestToEdit ? store.users.find(u => u.id === requestToEdit.userId) : null);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECCIÓN 0: Estadísticas de Equipo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ausencia Actual</h3>
                  <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-slate-800">{teamStats.absentPercentage.toFixed(0)}%</span>
                      <PieChart size={18} className="text-blue-500 mb-1"/>
                  </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${teamStats.absentPercentage}%` }}></div>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm col-span-1 md:col-span-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Próximas Ausencias</h3>
              <div className="space-y-2">
                  {teamStats.upcomingAbsences.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No hay ausencias programadas pronto.</p>
                  ) : (
                      teamStats.upcomingAbsences.map(req => (
                          <div key={req.id} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                  <img src={store.users.find(u=>u.id===req.userId)?.avatar} className="w-5 h-5 rounded-full"/>
                                  <span className="font-medium truncate max-w-[80px]">{store.users.find(u=>u.id===req.userId)?.name.split(' ')[0]}</span>
                              </div>
                              <span className="text-slate-500">{new Date(req.startDate).getDate()}/{new Date(req.startDate).getMonth()+1}</span>
                          </div>
                      ))
                  )}
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Días Pendientes (Total)</h3>
              <div className="flex items-center gap-2 mt-1">
                  <Calendar className="text-orange-500" size={20}/>
                  <span className="text-2xl font-bold text-slate-800">{teamStats.totalPendingDays}</span>
                  <span className="text-xs text-slate-500">días en total</span>
              </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horas Pendientes (Total)</h3>
              <div className="flex items-center gap-2 mt-1">
                  <Clock className="text-blue-500" size={20}/>
                  <span className="text-2xl font-bold text-slate-800">{teamStats.totalPendingHours}h</span>
                  <span className="text-xs text-slate-500">horas a disfrutar</span>
              </div>
          </div>
      </div>

      {/* Tabs List / Planning */}
      <div className="flex border-b border-slate-200">
         <button onClick={() => setViewTab('list')} className={`px-6 py-2 text-sm font-bold border-b-2 transition-colors ${viewTab==='list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            <Users size={16} className="inline mr-2"/> Lista de Empleados
         </button>
         <button onClick={() => setViewTab('planning')} className={`px-6 py-2 text-sm font-bold border-b-2 transition-colors ${viewTab==='planning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            <Paintbrush size={16} className="inline mr-2"/> Planificación de Turnos
         </button>
      </div>

      {viewTab === 'list' ? (
      <>
        {/* SECCIÓN 1: Tabla de Usuarios */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-blue-600"/> Gestión de Usuarios {currentUser.role === Role.ADMIN ? '(Global)' : '(Equipo)'}
            </h2>
            
            <div className="flex gap-3 items-center w-full md:w-auto">
                {/* FILTRO DEPARTAMENTO */}
                <div className="relative flex-1 md:flex-none">
                    <Filter className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <select 
                        className="w-full md:w-48 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors"
                        value={filterDeptId}
                        onChange={(e) => setFilterDeptId(e.target.value)}
                    >
                        <option value="">Todos los Dptos.</option>
                        {availableDeptsForFilter.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                    {displayUsers.length} Emp.
                </span>
                
                {currentUser.role === Role.ADMIN && (
                    <button onClick={openCreateModal} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors whitespace-nowrap">
                        <UserPlus size={16} /> Nuevo
                    </button>
                )}
            </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                <tr>
                    <th className="px-6 py-4">Empleado</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4">Dpto.</th>
                    <th className="px-6 py-4 text-center">Días</th>
                    <th className="px-6 py-4 text-center">Horas</th>
                    <th className="px-6 py-4">Acciones</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {displayUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                        <img src={u.avatar} className="w-8 h-8 rounded-full" />
                        <div>
                            <div className="font-bold">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                        u.role === Role.SUPERVISOR ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {u.role}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-xs">{getDeptName(u.departmentId)}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-orange-600 bg-orange-50/50 rounded-lg">{u.daysAvailable}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-blue-600 bg-blue-50/50 rounded-lg">{u.overtimeHours}h</td>
                    <td className="px-6 py-4">
                        <div className="flex gap-2">
                            <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Ficha">
                            <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Borrar">
                            <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>

        {/* SECCIÓN 2: Historial General del Equipo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="text-indigo-500" /> Actividad Reciente del Equipo
                </h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {teamRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No hay actividad reciente.</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                            <tr>
                                <th className="px-6 py-3">Empleado</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Fechas</th>
                                <th className="px-6 py-3">Duración</th>
                                <th className="px-6 py-3">Estado</th>
                                {isAdmin && <th className="px-6 py-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teamRequests.map(req => {
                                const user = store.users.find(u => u.id === req.userId);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewRequest(req)}>
                                        <td className="px-6 py-3 font-medium text-slate-700">{user?.name}</td>
                                        <td className="px-6 py-3">{req.label}</td>
                                        <td className="px-6 py-3 text-slate-500">
                                            {new Date(req.startDate).toLocaleDateString()}
                                            {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs font-bold text-slate-600">
                                            {getDurationString(req)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' :
                                                req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => handleEditRequest(req)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded transition-colors mr-1" title="Editar"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteRequest(req.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded transition-colors" title="Borrar y Devolver Saldo"><Trash2 size={16}/></button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </>
      ) : (
          /* VISTA PLANIFICACIÓN */
          <div className="animate-fade-in">
              <div className="mb-4 flex items-center justify-between">
                 <h2 className="text-xl font-bold text-slate-800">Planificador de Turnos</h2>
                 <div className="flex items-center gap-2 text-sm text-slate-500">
                     <Filter size={16}/>
                     <select className="bg-white border border-slate-200 rounded-lg p-2" value={filterDeptId} onChange={e=>setFilterDeptId(e.target.value)}>
                         <option value="">Todos mis departamentos</option>
                         {availableDeptsForFilter.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                     </select>
                 </div>
              </div>
              <ShiftScheduler users={displayUsers} />
          </div>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {isCreating ? <UserPlus className="text-blue-600"/> : <Briefcase className="text-blue-600"/>}
                    {isCreating ? 'Nuevo Empleado' : 'Ficha de Empleado'}
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
              
              {/* Datos Personales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                    <input type="text" required className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white transition-colors"
                        value={editingUser.name}
                        onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Corporativo</label>
                    <input type="email" required className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white transition-colors"
                        value={editingUser.email}
                        onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Departamento</label>
                    <select 
                        className="w-full p-2.5 border border-slate-200 rounded-lg"
                        value={editingUser.departmentId}
                        onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}
                    >
                        {store.departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Rol del Sistema</label>
                    <select 
                      className="w-full p-2.5 border border-slate-200 rounded-lg disabled:opacity-50 disabled:bg-slate-100" 
                      value={editingUser.role} 
                      onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})}
                      disabled={currentUser.role !== Role.ADMIN}
                    >
                      <option value={Role.WORKER}>Trabajador</option>
                      <option value={Role.SUPERVISOR}>Supervisor</option>
                      <option value={Role.ADMIN}>Admin</option>
                    </select>
                  </div>
                  
                  {isCreating && (
                      <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                              <Shield size={16}/> Contraseña de Acceso (Obligatoria)
                          </label>
                          <input 
                              type="text" 
                              required 
                              placeholder="Definir contraseña inicial..."
                              className="w-full p-2.5 border border-blue-200 rounded-lg bg-blue-50 focus:bg-white transition-colors"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                          />
                      </div>
                  )}
              </div>

              <hr className="border-slate-100" />

              {/* Ajuste de Saldos */}
              <div>
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-orange-500"/> {isCreating ? 'Saldos Iniciales' : 'Gestión de Saldos'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* DÍAS */}
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-orange-800">Saldo Días Actual</span>
                              <span className="text-2xl font-bold text-orange-600">{editingUser.daysAvailable}</span>
                          </div>
                          {!isCreating && (
                              <div className="space-y-2">
                                  <div className="flex gap-2">
                                      <input 
                                        type="number" step="0.5" placeholder="0"
                                        className="w-20 p-2 text-center rounded-lg border border-orange-200"
                                        value={adjustmentDays}
                                        onChange={e => setAdjustmentDays(parseFloat(e.target.value) || 0)}
                                      />
                                      <input 
                                        type="text" placeholder="Motivo ajuste..."
                                        className="flex-1 p-2 rounded-lg border border-orange-200 text-sm"
                                        value={adjustmentReasonDays}
                                        onChange={e => setAdjustmentReasonDays(e.target.value)}
                                      />
                                  </div>
                              </div>
                          )}
                          {isCreating && (
                               <input 
                                  type="number" step="0.5" 
                                  className="w-full p-2 text-center rounded-lg border border-orange-200"
                                  value={editingUser.daysAvailable}
                                  onChange={e => setEditingUser({...editingUser, daysAvailable: parseFloat(e.target.value)})}
                                />
                          )}
                      </div>
                      {/* HORAS */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-blue-800">Saldo Horas Actual</span>
                              <span className="text-2xl font-bold text-blue-600">{editingUser.overtimeHours}h</span>
                          </div>
                          {!isCreating && (
                              <div className="space-y-2">
                                  <div className="flex gap-2">
                                      <input 
                                        type="number" step="0.5" placeholder="0"
                                        className="w-20 p-2 text-center rounded-lg border border-blue-200"
                                        value={adjustmentHours}
                                        onChange={e => setAdjustmentHours(parseFloat(e.target.value) || 0)}
                                      />
                                      <input 
                                        type="text" placeholder="Motivo ajuste..."
                                        className="flex-1 p-2 rounded-lg border border-blue-200 text-sm"
                                        value={adjustmentReasonHours}
                                        onChange={e => setAdjustmentReasonHours(e.target.value)}
                                      />
                                  </div>
                              </div>
                          )}
                          {isCreating && (
                               <input 
                                  type="number" step="0.5" 
                                  className="w-full p-2 text-center rounded-lg border border-blue-200"
                                  value={editingUser.overtimeHours}
                                  onChange={e => setEditingUser({...editingUser, overtimeHours: parseFloat(e.target.value)})}
                                />
                          )}
                      </div>
                  </div>
              </div>

              {!isCreating && (
                  <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={18} className="text-slate-500"/> Historial de Solicitudes
                        </h4>
                        <button 
                            type="button"
                            onClick={() => { setRequestToEdit(null); setShowAdminRequestModal(true); }}
                            className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={12}/> Crear Solicitud para {editingUser.name.split(' ')[0]}
                        </button>
                      </div>
                      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                          <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100 text-slate-500 font-semibold sticky top-0">
                                  <tr>
                                      <th className="px-4 py-2">Tipo</th>
                                      <th className="px-4 py-2">Fecha</th>
                                      <th className="px-4 py-2">Estado</th>
                                      <th className="px-4 py-2 text-right">Acciones</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                  {editingUserRequests.length === 0 ? (
                                      <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin historial</td></tr>
                                  ) : (
                                      editingUserRequests.map(req => (
                                          <tr key={req.id} className="hover:bg-slate-200 cursor-pointer" onClick={() => onViewRequest(req)}>
                                              <td className="px-4 py-2 font-medium">
                                                  {req.label}
                                                  {req.createdByAdmin && <span className="ml-1 text-[10px] text-purple-600 font-bold">(Admin)</span>}
                                              </td>
                                              <td className="px-4 py-2">{new Date(req.startDate).toLocaleDateString()}</td>
                                              <td className="px-4 py-2">
                                                  <span className={`px-2 py-0.5 rounded-full ${
                                                      req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                                      req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                  }`}>{req.status}</span>
                                              </td>
                                              <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                                                  <button onClick={() => handleEditRequest(req)} className="text-blue-500 hover:bg-blue-100 p-1 rounded transition-colors mr-1" title="Editar"><Edit2 size={14}/></button>
                                                  <button onClick={() => handleDeleteRequest(req.id)} className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors" title="Borrar y Devolver Saldo"><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={(!isCreating && ((adjustmentDays !== 0 && !adjustmentReasonDays) || (adjustmentHours !== 0 && !adjustmentReasonHours)))}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreating ? 'Crear Usuario' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Creación/Edición Manual (Admin) */}
      {showAdminRequestModal && requestModalTargetUser && (
          <RequestFormModal 
             onClose={() => { setShowAdminRequestModal(false); setRequestToEdit(null); }}
             user={currentUser}
             targetUser={requestModalTargetUser}
             initialTab={requestToEdit && store.isOvertimeRequest(requestToEdit.typeId) ? 'overtime' : 'absence'}
             editingRequest={requestToEdit}
          />
      )}
    </div>
  );
};
