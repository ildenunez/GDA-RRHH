
import React, { useState } from 'react';
import { User, RequestStatus, Role, LeaveRequest } from '../types';
import { store } from '../services/store';
import { Check, X, Users, Edit2, Shield, Trash2, AlertTriangle, Briefcase, FileText, Activity, Clock, CalendarDays, ExternalLink } from 'lucide-react';

export const Approvals: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
  const [pending, setPending] = useState(store.getPendingApprovalsForUser(user.id));

  const handleAction = (reqId: string, status: RequestStatus) => {
    store.updateRequestStatus(reqId, status, user.id);
    setPending(store.getPendingApprovalsForUser(user.id));
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
                        <p className="text-sm text-slate-500 font-medium">{req.label} {req.hours ? `• ${req.hours}h` : ''}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(req.startDate).toLocaleDateString()} 
                            {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}
                        </p>
                        {req.reason && <p className="text-xs text-slate-400 italic mt-1">"{req.reason}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, RequestStatus.REJECTED)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1">
                        <X size={16} /> Rechazar
                      </button>
                      <button onClick={() => handleAction(req.id, RequestStatus.APPROVED)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-1">
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
    </div>
  );
};

export const UserManagement: React.FC<{ currentUser: User, onViewRequest: (req: LeaveRequest) => void }> = ({ currentUser, onViewRequest }) => {
  const [users, setUsers] = useState(store.getAllUsers());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Estado para los ajustes manuales en el modal
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReasonDays, setAdjustmentReasonDays] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [adjustmentReasonHours, setAdjustmentReasonHours] = useState('');

  const displayUsers = currentUser.role === Role.ADMIN 
    ? users 
    : users.filter(u => {
        const myDepts = store.departments.filter(d => d.supervisorIds.includes(currentUser.id)).map(d => d.id);
        return myDepts.includes(u.departmentId);
    });
  
  // Solicitudes del equipo (para mostrar en lista general)
  const teamUserIds = displayUsers.map(u => u.id);
  const teamRequests = store.requests.filter(r => teamUserIds.includes(r.userId)).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Solicitudes del usuario que se está editando
  const editingUserRequests = editingUser ? store.requests.filter(r => r.userId === editingUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const openEditModal = (u: User) => {
      setEditingUser({...u});
      setAdjustmentDays(0);
      setAdjustmentReasonDays('');
      setAdjustmentHours(0);
      setAdjustmentReasonHours('');
  }

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if(editingUser) {
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

        setUsers(store.getAllUsers());
        setEditingUser(null);
    }
  };

  const handleDeleteUser = (userId: string) => {
      if (confirm('¿Estás seguro de que quieres eliminar a este usuario? Esta acción no se puede deshacer.')) {
          store.deleteUser(userId);
          setUsers(store.getAllUsers());
      }
  };

  const getDeptName = (id: string) => store.departments.find(d => d.id === id)?.name || id;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECCIÓN 1: Tabla de Usuarios */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600"/> Gestión de Usuarios {currentUser.role === Role.ADMIN ? '(Global)' : '(Equipo)'}
          </h2>
          <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {displayUsers.length} Empleados
          </span>
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
                            <th className="px-6 py-3">Estado</th>
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
                                        {req.hours && ` (${req.hours}h)`}
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
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-scale-in my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="text-blue-600"/> Ficha de Empleado
                </h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
              
              {/* Datos Personales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                    <input type="text" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white transition-colors"
                        value={editingUser.name}
                        onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email Corporativo</label>
                    <input type="email" className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white transition-colors"
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
              </div>

              <hr className="border-slate-100" />

              {/* Ajuste de Saldos */}
              <div>
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-orange-500"/> Gestión de Saldos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* DÍAS */}
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-orange-800">Saldo Días Actual</span>
                              <span className="text-2xl font-bold text-orange-600">{editingUser.daysAvailable}</span>
                          </div>
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
                      </div>
                      {/* HORAS */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-blue-800">Saldo Horas Actual</span>
                              <span className="text-2xl font-bold text-blue-600">{editingUser.overtimeHours}h</span>
                          </div>
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
                      </div>
                  </div>
              </div>

              {/* LISTA DE SOLICITUDES DEL USUARIO */}
              <div>
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-slate-500"/> Historial de Solicitudes
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-500 font-semibold">
                              <tr>
                                  <th className="px-4 py-2">Tipo</th>
                                  <th className="px-4 py-2">Fecha</th>
                                  <th className="px-4 py-2">Estado</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {editingUserRequests.length === 0 ? (
                                  <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sin historial</td></tr>
                              ) : (
                                  editingUserRequests.map(req => (
                                      <tr key={req.id} className="hover:bg-slate-200 cursor-pointer" onClick={() => onViewRequest(req)}>
                                          <td className="px-4 py-2 font-medium">{req.label}</td>
                                          <td className="px-4 py-2">{new Date(req.startDate).toLocaleDateString()}</td>
                                          <td className="px-4 py-2">
                                              <span className={`px-2 py-0.5 rounded-full ${
                                                  req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                                  req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                              }`}>{req.status}</span>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={(adjustmentDays !== 0 && !adjustmentReasonDays) || (adjustmentHours !== 0 && !adjustmentReasonHours)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
