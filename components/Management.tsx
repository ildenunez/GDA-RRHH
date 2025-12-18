
import React, { useState, useMemo } from 'react';
import { User, RequestStatus, Role, LeaveRequest } from '../types';
import { store } from '../services/store';
import ShiftScheduler from './ShiftScheduler';
import RequestFormModal from './RequestFormModal';
import { Check, X, Users, Edit2, Shield, Trash2, AlertTriangle, Briefcase, FileText, Activity, Clock, CalendarDays, ExternalLink, UserPlus, MessageSquare, PieChart, Calendar, Filter, Paintbrush, Plus, CalendarClock, Search, CheckCircle, FileWarning, Printer, CheckSquare, Square } from 'lucide-react';

export const JustificationControl: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
    const [filterDeptId, setFilterDeptId] = useState<string>('');
    const [filterUserId, setFilterUserId] = useState<string>('');
    const [filterStart, setFilterStart] = useState<string>('');
    const [filterEnd, setFilterEnd] = useState<string>('');
    const [showOnlyUnjustified, setShowOnlyUnjustified] = useState(true);
    const [refresh, setRefresh] = useState(0);

    const availableDepts = useMemo(() => {
        if (user.role === Role.ADMIN) return store.departments;
        return store.departments.filter(d => d.supervisorIds.includes(user.id));
    }, [user]);

    const availableUsers = useMemo(() => {
        let users = store.users;
        if (user.role === Role.SUPERVISOR) {
             const myDeptIds = availableDepts.map(d => d.id);
             users = users.filter(u => myDeptIds.includes(u.departmentId));
        }
        if (filterDeptId) users = users.filter(u => u.departmentId === filterDeptId);
        return users.sort((a,b) => a.name.localeCompare(b.name));
    }, [user, availableDepts, filterDeptId]);

    const filteredRequests = useMemo(() => {
        return store.requests.filter(r => {
            if (r.typeId !== 'unjustified_absence') return false;
            const reqUser = store.users.find(u => u.id === r.userId);
            if (!reqUser) return false;
            if (user.role === Role.SUPERVISOR) {
                const myDeptIds = availableDepts.map(d => d.id);
                if (!myDeptIds.includes(reqUser.departmentId)) return false;
            }
            if (filterDeptId && reqUser.departmentId !== filterDeptId) return false;
            if (filterUserId && r.userId !== filterUserId) return false;
            if (filterStart && r.startDate < filterStart) return false;
            if (filterEnd && r.startDate > filterEnd) return false;
            if (showOnlyUnjustified && r.isJustified) return false;
            return true;
        }).sort((a,b) => b.startDate.localeCompare(a.startDate));
    }, [refresh, filterDeptId, filterUserId, filterStart, filterEnd, showOnlyUnjustified, store.requests.length]);

    const handleToggleJustified = async (reqId: string, current: boolean, reported: boolean) => {
        await store.updateJustification(reqId, !current, reported);
        setRefresh(prev => prev + 1);
    };

    const handleToggleReported = async (reqId: string, current: boolean, justified: boolean) => {
        await store.updateJustification(reqId, justified, !current);
        setRefresh(prev => prev + 1);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 print:hidden">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileWarning className="text-orange-500"/> Control de Justificantes
                    </h2>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all">
                        <Printer size={16}/> Imprimir Reporte
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
                        <select className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={filterDeptId} onChange={e => setFilterDeptId(e.target.value)}>
                            <option value="">Todos</option>
                            {availableDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Empleado</label>
                        <select className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={filterUserId} onChange={e => setFilterUserId(e.target.value)}>
                            <option value="">Todos</option>
                            {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Desde</label>
                        <input type="date" className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hasta</label>
                        <input type="date" className="w-full p-2.5 border rounded-xl text-sm bg-slate-50" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                    </div>
                    <div className="flex items-end pb-1 px-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer font-medium">
                            <input type="checkbox" checked={showOnlyUnjustified} onChange={e => setShowOnlyUnjustified(e.target.checked)} className="w-4 h-4 rounded text-orange-600" />
                            Solo pendientes
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="hidden print:block p-8 border-b-2 mb-6 text-center">
                    <h1 className="text-2xl font-bold">Reporte de Ausencias y Justificantes</h1>
                    <p className="text-sm">Emitido el: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Empleado / Dpto.</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Notas</th>
                                <th className="px-6 py-4 text-center">Justificada</th>
                                <th className="px-6 py-4 text-center">Reportada Admin</th>
                                <th className="px-6 py-4 text-right print:hidden">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No hay registros encontrados.</td></tr>
                            ) : filteredRequests.map(req => {
                                const u = store.users.find(usr => usr.id === req.userId);
                                return (
                                    <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${!req.isJustified ? 'bg-orange-50/20' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{String(u?.name || 'N/A')}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{String(store.departments.find(d=>d.id===u?.departmentId)?.name || '')}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                                            {new Date(req.startDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 max-w-xs truncate">{String(req.reason || '-')}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleToggleJustified(req.id, !!req.isJustified, !!req.reportedToAdmin)} className={`p-1 rounded-lg transition-all print:hidden ${req.isJustified ? 'text-green-600 bg-green-100' : 'text-slate-300 bg-slate-100 hover:bg-orange-100 hover:text-orange-500'}`}>
                                                    {req.isJustified ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                </button>
                                                <span className="hidden print:inline font-bold">{req.isJustified ? 'SÍ' : 'NO'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button onClick={() => handleToggleReported(req.id, !!req.reportedToAdmin, !!req.isJustified)} className={`p-1 rounded-lg transition-all print:hidden ${req.reportedToAdmin ? 'text-blue-600 bg-blue-100' : 'text-slate-300 bg-slate-100 hover:bg-blue-100 hover:text-blue-500'}`}>
                                                    {req.reportedToAdmin ? <CheckSquare size={24}/> : <Square size={24}/>}
                                                </button>
                                                <span className="hidden print:inline font-bold">{req.reportedToAdmin ? 'SÍ' : 'NO'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right print:hidden">
                                            <button onClick={() => onViewRequest(req)} className="text-slate-400 hover:text-blue-600 p-2"><ExternalLink size={18}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const Approvals: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
  const [pending, setPending] = useState(store.getPendingApprovalsForUser(user.id));
  const [confirmAction, setConfirmAction] = useState<{reqId: string, status: RequestStatus} | null>(null);
  const [adminComment, setAdminComment] = useState('');

  const executeAction = async () => {
      if (!confirmAction) return;
      await store.updateRequestStatus(confirmAction.reqId, confirmAction.status, user.id, adminComment);
      setPending(store.getPendingApprovalsForUser(user.id));
      setConfirmAction(null);
  };

  const getDurationString = (req: LeaveRequest): string => {
      if (req.typeId === 'adjustment_days') return `${(req.hours || 0) > 0 ? '+' : ''}${req.hours || 0} días`;
      if (req.typeId === 'overtime_adjustment') return `${(req.hours || 0) > 0 ? '+' : ''}${req.hours || 0}h (Reg.)`;
      if (req.hours && req.hours > 0) return `${req.hours}h`;
      const start = new Date(req.startDate);
      const end = req.endDate ? new Date(req.endDate) : start;
      const diff = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diff / (1000 * 3600 * 24)) + 1; 
      return `${days} día${days !== 1 ? 's' : ''}`;
  };

  const RequestList = ({ requests, title, icon: Icon, colorClass }: { requests: LeaveRequest[], title: string, icon: any, colorClass: string }) => (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Icon className={colorClass}/> {title} 
                <span className="text-sm font-normal text-slate-500 ml-2">({requests.length})</span>
            </h2>
          </div>
          {requests.length === 0 ? <div className="p-8 text-center text-slate-400 italic">No hay solicitudes pendientes en esta categoría.</div> : (
            <div className="divide-y divide-slate-100">
              {requests.map((req) => {
                const requester = store.users.find(u => u.id === req.userId);
                const conflicts = store.getRequestConflicts(req);
                return (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => onViewRequest(req)}>
                      <img src={requester?.avatar} className="w-10 h-10 rounded-full bg-slate-200" />
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            {String(requester?.name || 'N/A')} <ExternalLink size={12}/>
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-slate-500 font-medium">{String(req.label)}</p>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                                {getDurationString(req)}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{new Date(req.startDate).toLocaleDateString()}{req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}</p>
                        {conflicts.length > 0 && (
                            <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg p-2 max-w-sm animate-fade-in">
                                <div className="text-xs font-bold text-orange-700 flex items-center gap-1 mb-1"><AlertTriangle size={12}/> Conflicto Dpto. ({conflicts.length})</div>
                                <div className="space-y-1">{conflicts.map(c => {
                                    const cUser = store.users.find(u => u.id === c.userId);
                                    return (
                                        <div key={c.id} className="text-[10px] text-orange-800 flex items-center gap-1">
                                            <span className="font-semibold">{String(cUser?.name || '').split(' ')[0]}:</span> 
                                            <span>{String(c.label)} ({c.status})</span>
                                        </div>
                                    );
                                })}</div>
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmAction({reqId: req.id, status: RequestStatus.REJECTED})} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"><X size={16} /> Rechazar</button>
                      <button onClick={() => setConfirmAction({reqId: req.id, status: RequestStatus.APPROVED})} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"><Check size={16} /> Aprobar</button>
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
        <RequestList title="Solicitudes de Ausencia" requests={pending.filter(r => !store.isOvertimeRequest(r.typeId))} icon={CalendarDays} colorClass="text-orange-500" />
        <RequestList title="Gestión de Horas" requests={pending.filter(r => store.isOvertimeRequest(r.typeId))} icon={Clock} colorClass="text-blue-500" />
        {confirmAction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                    <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Confirmar {confirmAction.status === RequestStatus.APPROVED ? 'Aprobación' : 'Rechazo'}</h3></div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-slate-600">¿Estás seguro de que deseas realizar esta acción?</p>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><MessageSquare size={16}/> Comentario (Opcional)</label>
                            <textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Añade un motivo o mensaje para el empleado..." value={adminComment} onChange={e => setAdminComment(e.target.value)}/>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                        <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancelar</button>
                        <button onClick={executeAction} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition-colors ${confirmAction.status === RequestStatus.APPROVED ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar Acción</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export const UpcomingAbsences: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
    const [filterDeptId, setFilterDeptId] = useState<string>('');
    const [filterUserId, setFilterUserId] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [confirmAction, setConfirmAction] = useState<{reqId: string, status: RequestStatus} | null>(null);
    const [adminComment, setAdminComment] = useState('');
    const [refresh, setRefresh] = useState(0);

    const upcomingRequests = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return store.requests.filter(r => {
             if (store.isOvertimeRequest(r.typeId) || r.typeId === 'adjustment_days' || r.status === RequestStatus.REJECTED) return false;
             const reqUser = store.users.find(u => u.id === r.userId);
             if (!reqUser) return false;
             const myDepts = user.role === Role.ADMIN ? store.departments.map(d=>d.id) : store.departments.filter(d=>d.supervisorIds.includes(user.id)).map(d=>d.id);
             if (!myDepts.includes(reqUser.departmentId)) return false;
             if (filterDeptId && reqUser.departmentId !== filterDeptId) return false;
             if (filterUserId && r.userId !== filterUserId) return false;
             if (filterStatus && r.status !== filterStatus) return false;
             return (r.endDate || r.startDate) >= today;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [user, filterDeptId, filterUserId, filterStatus, refresh, store.requests.length]);

    const executeAction = async () => {
        if (!confirmAction) return;
        await store.updateRequestStatus(confirmAction.reqId, confirmAction.status, user.id, adminComment);
        setConfirmAction(null);
        setRefresh(prev => prev + 1);
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CalendarClock className="text-blue-600"/> Próximas Ausencias</h2>
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    <select className="pl-4 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-all" value={filterDeptId} onChange={(e) => { setFilterDeptId(e.target.value); setFilterUserId(''); }}><option value="">Todos los Dptos.</option>{(user.role === Role.ADMIN ? store.departments : store.departments.filter(d => d.supervisorIds.includes(user.id))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                    <select className="pl-4 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white transition-all" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}><option value="">Todos los Usuarios</option>{store.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                </div>
             </div>

             <div className="space-y-4">
                 {upcomingRequests.length === 0 ? <div className="text-center py-12 text-slate-400 italic">No se han encontrado ausencias próximas.</div> : (
                     upcomingRequests.map(req => {
                         const reqUser = store.users.find(u => u.id === req.userId);
                         const conflicts = store.getRequestConflicts(req);
                         return (
                             <div key={req.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all flex flex-col md:flex-row gap-6">
                                 <div className="flex-1">
                                     <div className="flex items-center justify-between mb-2">
                                         <div className="flex items-center gap-3">
                                            <img src={reqUser?.avatar} className="w-10 h-10 rounded-full border border-slate-100"/>
                                            <div><h4 className="font-bold text-slate-800">{String(reqUser?.name || 'N/A')}</h4><p className="text-xs text-slate-500">{String(store.departments.find(d=>d.id===reqUser?.departmentId)?.name || '')}</p></div>
                                         </div>
                                         <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                     </div>
                                     <div className="mt-4 grid grid-cols-2 gap-4">
                                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase block mb-1">Ausencia</span><span className="text-sm font-semibold text-slate-800">{String(req.label)}</span></div>
                                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-xs font-bold text-slate-400 uppercase block mb-1">Fechas</span><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Calendar size={14} className="text-blue-500"/>{new Date(req.startDate).toLocaleDateString()}{req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}</div></div>
                                     </div>
                                 </div>
                                 <div className="md:w-72 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 gap-4">
                                     {conflicts.length > 0 ? (
                                         <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex-1"><div className="text-xs font-bold text-red-700 flex items-center gap-1 mb-2"><AlertTriangle size={14}/> Conflictos detectados</div><div className="space-y-2 max-h-32 overflow-y-auto">{conflicts.map(c => <div key={c.id} className="text-xs bg-white p-2 rounded border border-red-100 shadow-sm"><div className="font-bold text-slate-700">{String(store.users.find(u=>u.id===c.userId)?.name || '').split(' ')[0]}</div><div className="text-slate-500">{String(c.label)}</div></div>)}</div></div>
                                     ) : <div className="flex-1 flex items-center justify-center text-slate-300 text-sm italic border border-dashed border-slate-200 rounded-lg bg-slate-50">Sin conflictos</div>}
                                     {req.status === RequestStatus.PENDING && (
                                         <div className="flex gap-2"><button onClick={() => setConfirmAction({reqId: req.id, status: RequestStatus.REJECTED})} className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-bold transition-all">Rechazar</button><button onClick={() => setConfirmAction({reqId: req.id, status: RequestStatus.APPROVED})} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold shadow-md transition-all">Aprobar</button></div>
                                     )}
                                 </div>
                             </div>
                         );
                     })
                 )}
             </div>
             {confirmAction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                        <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-800">Confirmar {confirmAction.status === RequestStatus.APPROVED ? 'Aprobación' : 'Rechazo'}</h3></div>
                        <div className="p-6 space-y-4"><p className="text-sm text-slate-600">¿Estás seguro de realizar esta acción administrativa?</p><div><label className="block text-sm font-semibold text-slate-700 mb-2">Comentario (Opcional)</label><textarea className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Mensaje para el empleado..." value={adminComment} onChange={e => setAdminComment(e.target.value)}/></div></div>
                        <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3"><button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-all font-medium">Cancelar</button><button onClick={executeAction} className={`px-4 py-2 text-white font-bold rounded-lg shadow-md transition-all ${confirmAction.status === RequestStatus.APPROVED ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export const UserManagement: React.FC<{ currentUser: User, onViewRequest: (req: LeaveRequest) => void }> = ({ currentUser, onViewRequest }) => {
  const [viewTab, setViewTab] = useState<'list' | 'planning' | 'justifications'>('list');
  const [users, setUsers] = useState(store.getAllUsers());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterDeptId, setFilterDeptId] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  
  // States para ajustes de saldo
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReasonDays, setAdjustmentReasonDays] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [adjustmentReasonHours, setAdjustmentReasonHours] = useState('');

  const [showAdminRequestModal, setShowAdminRequestModal] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<LeaveRequest | null>(null);

  const displayUsers = useMemo(() => {
      let result = users;
      if (currentUser.role !== Role.ADMIN) {
          const myDepts = store.departments.filter(d => d.supervisorIds.includes(currentUser.id)).map(d => d.id);
          result = result.filter(u => myDepts.includes(u.departmentId));
      }
      if (filterDeptId) result = result.filter(u => u.departmentId === filterDeptId);
      return result;
  }, [users, currentUser, filterDeptId]);

  const teamStats = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const totalMembers = displayUsers.length;
      const totalPendingDays = displayUsers.reduce((sum, u) => sum + (u.daysAvailable || 0), 0);
      const totalPendingHours = displayUsers.reduce((sum, u) => sum + (u.overtimeHours || 0), 0);
      const absentMembers = displayUsers.filter(u => {
          return store.requests.some(r => 
              r.userId === u.id && 
              r.status === RequestStatus.APPROVED &&
              !store.isOvertimeRequest(r.typeId) &&
              r.typeId !== 'adjustment_days' &&
              today >= r.startDate.split('T')[0] && 
              today <= (r.endDate || r.startDate).split('T')[0]
          );
      });
      const absentPercentage = totalMembers > 0 ? (absentMembers.length / totalMembers) * 100 : 0;
      const upcomingAbsences = store.requests.filter(r => {
          const userInTeam = displayUsers.find(u => u.id === r.userId);
          const startDate = r.startDate.split('T')[0];
          return userInTeam && r.status === RequestStatus.APPROVED && !store.isOvertimeRequest(r.typeId) && r.typeId !== 'adjustment_days' && startDate > today;
      }).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3);

      return { totalPendingDays, totalPendingHours, absentPercentage, upcomingAbsences };
  }, [displayUsers, refreshTick]);

  const teamRequests = useMemo(() => {
     const teamIds = displayUsers.map(u => u.id);
     return store.requests.filter(r => teamIds.includes(r.userId)).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }, [displayUsers, store.requests.length]);

  const editingUserRequests = useMemo(() => {
    return editingUser && editingUser.id ? store.requests.filter(r => r.userId === editingUser.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : [];
  }, [editingUser, store.requests.length]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingUser) return;

    if (editingUser.id === '') {
        if (!newPassword) return alert('La contraseña es obligatoria para nuevos usuarios.');
        await store.createUser(editingUser, newPassword);
    } 
    else {
        await store.updateUserAdmin(editingUser.id, { 
            name: editingUser.name, 
            email: editingUser.email, 
            departmentId: editingUser.departmentId 
        });
        store.updateUserRole(editingUser.id, editingUser.role);
        
        let newBalanceDays = editingUser.daysAvailable;
        let newBalanceHours = editingUser.overtimeHours;

        if (adjustmentDays !== 0) {
            newBalanceDays += adjustmentDays;
            await store.createRequest({ 
                typeId: 'adjustment_days', 
                label: 'Regularización Días', 
                startDate: new Date().toISOString(), 
                hours: adjustmentDays, 
                reason: adjustmentReasonDays || 'Ajuste manual Admin' 
            }, editingUser.id, RequestStatus.APPROVED);
        }
        if (adjustmentHours !== 0) {
            newBalanceHours += adjustmentHours;
            await store.createRequest({ 
                typeId: 'overtime_adjustment', 
                label: 'Regularización Horas', 
                startDate: new Date().toISOString(), 
                hours: adjustmentHours, 
                reason: adjustmentReasonHours || 'Ajuste manual Admin' 
            }, editingUser.id, RequestStatus.APPROVED);
        }
        store.updateUserBalance(editingUser.id, newBalanceDays, newBalanceHours);
    }
    setUsers(store.getAllUsers());
    setEditingUser(null);
    setRefreshTick(t => t + 1);
  };

  const getDurationString = (req: LeaveRequest): string => {
      if (req.typeId === 'adjustment_days') return `${(req.hours || 0) > 0 ? '+' : ''}${req.hours || 0}d`;
      if (req.typeId === 'overtime_adjustment') return `${(req.hours || 0) > 0 ? '+' : ''}${req.hours || 0}h`;
      if (req.hours && req.hours > 0) return `${req.hours}h`;
      const start = new Date(req.startDate);
      const end = req.endDate ? new Date(req.endDate) : start;
      const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1; 
      return `${days}d`;
  };

  const isCreating = editingUser && editingUser.id === '';

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Panel de Estadísticas WOW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ausencia Actual</h3>
                  <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-slate-800">{teamStats.absentPercentage.toFixed(0)}%</span>
                      <PieChart size={18} className="text-blue-500 mb-1"/>
                  </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${teamStats.absentPercentage}%` }}></div>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Próximas Ausencias</h3>
              <div className="space-y-2">
                  {teamStats.upcomingAbsences.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sin ausencias próximas.</p>
                  ) : (
                      teamStats.upcomingAbsences.map(req => (
                          <div key={req.id} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                  <img src={store.users.find(u=>u.id===req.userId)?.avatar} className="w-5 h-5 rounded-full bg-slate-100"/>
                                  <span className="font-medium truncate max-w-[80px]">{String(store.users.find(u=>u.id===req.userId)?.name || '').split(' ')[0]}</span>
                              </div>
                              <span className="text-slate-500 font-mono">{new Date(req.startDate).getDate()}/{new Date(req.startDate).getMonth()+1}</span>
                          </div>
                      ))
                  )}
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Días Pendientes</h3>
              <div className="flex items-center gap-2 mt-1">
                  <Calendar className="text-orange-500" size={20}/>
                  <span className="text-2xl font-bold text-slate-800">{teamStats.totalPendingDays}</span>
                  <span className="text-xs text-slate-500">días totales</span>
              </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horas de Equipo</h3>
              <div className="flex items-center gap-2 mt-1">
                  <Clock className="text-blue-500" size={20}/>
                  <span className="text-2xl font-bold text-slate-800">{teamStats.totalPendingHours}h</span>
                  <span className="text-xs text-slate-500">horas extra</span>
              </div>
          </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
         <button onClick={() => setViewTab('list')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${viewTab==='list' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'}`}>
            <Users size={16} className="inline mr-2"/> Lista de Empleados
         </button>
         <button onClick={() => setViewTab('planning')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${viewTab==='planning' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'}`}>
            <Paintbrush size={16} className="inline mr-2"/> Planificación de Turnos
         </button>
         <button onClick={() => setViewTab('justifications')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${viewTab==='justifications' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500'}`}>
            <FileWarning size={16} className="inline mr-2"/> Control de Justificantes
         </button>
      </div>

      {viewTab === 'list' && (
      <>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Gestión de Usuarios</h2>
                <div className="flex gap-3 items-center w-full md:w-auto">
                    <select className="w-full md:w-48 p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-all" value={filterDeptId} onChange={(e) => setFilterDeptId(e.target.value)}><option value="">Todos los Dptos.</option>{(currentUser.role === Role.ADMIN ? store.departments : store.departments.filter(d => d.supervisorIds.includes(currentUser.id))).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                    {currentUser.role === Role.ADMIN && <button onClick={() => { setAdjustmentDays(0); setAdjustmentHours(0); setEditingUser({ id: '', name: '', email: '', role: Role.WORKER, departmentId: store.departments[0]?.id || '', daysAvailable: 22, overtimeHours: 0 }); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"><UserPlus size={16}/> Nuevo</button>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500"><tr><th className="px-6 py-4">Empleado</th><th className="px-6 py-4">Rol</th><th className="px-6 py-4">Dpto.</th><th className="px-6 py-4 text-center">Días</th><th className="px-6 py-4 text-center">Horas</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                    {displayUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-100" /><div><div className="font-bold text-slate-800">{String(u.name)}</div><div className="text-xs text-slate-400">{String(u.email)}</div></div></td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{u.role}</span></td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500">{store.departments.find(d => d.id === u.departmentId)?.name || u.departmentId}</td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-orange-600">{u.daysAvailable}</td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{u.overtimeHours}h</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => { setAdjustmentDays(0); setAdjustmentHours(0); setEditingUser({...u}); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Ver ficha completa"><Edit2 size={16}/></button>
                                    <button onClick={() => { if(confirm('¿Seguro que quieres eliminar este usuario?')) { store.deleteUser(u.id); setUsers(store.getAllUsers()); } }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Actividad WOW */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity className="text-indigo-500" /> Actividad Reciente del Equipo</h2></div>
            <div className="max-h-96 overflow-y-auto">
                {teamRequests.length === 0 ? <div className="p-8 text-center text-slate-400 italic">No hay actividad registrada.</div> : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0 font-bold border-b"><tr><th className="px-6 py-3">Empleado</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Fechas</th><th className="px-6 py-3">Duración</th><th className="px-6 py-3 text-right">Estado</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {teamRequests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50 cursor-pointer transition-all" onClick={() => onViewRequest(req)}>
                                    <td className="px-6 py-3 font-medium text-slate-700">{String(store.users.find(u => u.id === req.userId)?.name || 'N/A')}</td>
                                    <td className="px-6 py-3">{String(req.label)}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs font-medium">{new Date(req.startDate).toLocaleDateString()}{req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}</td>
                                    <td className="px-6 py-3 font-mono text-xs font-bold text-slate-600">{getDurationString(req)}</td>
                                    <td className="px-6 py-3 text-right"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </>
      )}

      {viewTab === 'planning' && <div className="animate-fade-in"><ShiftScheduler users={displayUsers} /></div>}
      {viewTab === 'justifications' && <JustificationControl user={currentUser} onViewRequest={onViewRequest} />}

      {/* MODAL FICHA DE EMPLEADO PREMIUM */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scale-in my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div className="flex items-center gap-4">
                    {editingUser.avatar && <img src={editingUser.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm"/>}
                    <h3 className="text-xl font-bold text-slate-800">{isCreating ? 'Nuevo Registro de Empleado' : `Ficha: ${String(editingUser.name)}`}</h3>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500"><X /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Sección Datos Básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label><input type="text" required className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Email Corporativo</label><input type="email" required className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Departamento</label><select className="w-full p-2.5 border border-slate-200 rounded-lg" value={editingUser.departmentId} onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}>{store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  <div><label className="block text-sm font-semibold text-slate-700 mb-2">Rol del Sistema</label><select className="w-full p-2.5 border border-slate-200 rounded-lg" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} disabled={currentUser.role !== Role.ADMIN}><option value={Role.WORKER}>Trabajador</option><option value={Role.SUPERVISOR}>Supervisor</option><option value={Role.ADMIN}>Admin</option></select></div>
                  {isCreating && <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100"><label className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-2"><Lock size={16}/> Contraseña de Acceso</label><input type="text" required className="w-full p-2.5 border border-blue-200 rounded-lg bg-white" placeholder="Contraseña inicial..." value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>}
              </div>

              {/* Sección Gestión de Saldos WOW */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-orange-500"/> {isCreating ? 'Saldos Iniciales' : 'Ajustes de Saldo'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Días */}
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Saldo Días Actual</span>
                              <span className="text-2xl font-black text-orange-600">{editingUser.daysAvailable}</span>
                          </div>
                          {!isCreating ? (
                              <div className="space-y-2">
                                  <div className="flex gap-2">
                                      <input type="number" step="0.5" placeholder="0.0" className="w-20 p-2 text-center rounded-lg border border-orange-200 font-bold" value={adjustmentDays} onChange={e => setAdjustmentDays(parseFloat(e.target.value) || 0)} />
                                      <input type="text" placeholder="Motivo del ajuste..." className="flex-1 p-2 rounded-lg border border-orange-200 text-sm" value={adjustmentReasonDays} onChange={e => setAdjustmentReasonDays(e.target.value)} />
                                  </div>
                                  <p className="text-[10px] text-orange-700 italic font-medium">Usa valores negativos para restar días (ej: -2).</p>
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Días iniciales</label>
                                  <input type="number" step="0.5" className="w-full p-2 rounded-lg border border-orange-200 font-bold text-center" value={editingUser.daysAvailable} onChange={e => setEditingUser({...editingUser, daysAvailable: parseFloat(e.target.value)})} />
                              </div>
                          )}
                      </div>
                      {/* Horas */}
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Saldo Horas Actual</span>
                              <span className="text-2xl font-black text-blue-600">{editingUser.overtimeHours}h</span>
                          </div>
                          {!isCreating ? (
                              <div className="space-y-2">
                                  <div className="flex gap-2">
                                      <input type="number" step="0.5" placeholder="0.0" className="w-20 p-2 text-center rounded-lg border border-blue-200 font-bold" value={adjustmentHours} onChange={e => setAdjustmentHours(parseFloat(e.target.value) || 0)} />
                                      <input type="text" placeholder="Motivo del ajuste..." className="flex-1 p-2 rounded-lg border border-blue-200 text-sm" value={adjustmentReasonHours} onChange={e => setAdjustmentReasonHours(e.target.value)} />
                                  </div>
                                  <p className="text-[10px] text-blue-700 italic font-medium">Usa valores negativos para restar horas.</p>
                              </div>
                          ) : (
                              <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horas iniciales</label>
                                  <input type="number" step="0.5" className="w-full p-2 rounded-lg border border-blue-200 font-bold text-center" value={editingUser.overtimeHours} onChange={e => setEditingUser({...editingUser, overtimeHours: parseFloat(e.target.value)})} />
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Sección Historial Interno WOW */}
              {!isCreating && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} className="text-slate-500"/> Historial del Empleado</h4>
                        <button type="button" onClick={() => { setRequestToEdit(null); setShowAdminRequestModal(true); }} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-800 shadow-sm transition-all">
                            <Plus size={12}/> Crear Solicitud Manual
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-500 font-bold sticky top-0 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Tipo / Descripción</th>
                                        <th className="px-4 py-3">Fecha(s)</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {editingUserRequests.length === 0 ? (
                                        <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No hay historial de solicitudes para este empleado.</td></tr>
                                    ) : (
                                        editingUserRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-slate-50 cursor-pointer transition-colors group" onClick={() => onViewRequest(req)}>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-700">{String(req.label)}</div>
                                                    <div className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{req.reason || 'Sin motivo especificado'}</div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                                                    {new Date(req.startDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setRequestToEdit(req); setShowAdminRequestModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg" title="Editar"><Edit2 size={12}/></button>
                                                        <button onClick={() => { if(confirm('¿Borrar solicitud? Esto revertirá los saldos si estaba aprobada.')) { store.deleteRequest(req.id); setRefreshTick(t=>t+1); } }} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg" title="Eliminar"><Trash2 size={12}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
              )}
            </form>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold transition-all">Cancelar</button>
                <button 
                    onClick={handleUpdateUser}
                    disabled={!isCreating && ((adjustmentDays !== 0 && !adjustmentReasonDays) || (adjustmentHours !== 0 && !adjustmentReasonHours))}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 font-black hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 transition-all transform active:scale-95"
                >
                    {isCreating ? 'Finalizar y Crear' : 'Guardar Ficha'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar solicitudes administrativas */}
      {showAdminRequestModal && editingUser && (
        <RequestFormModal 
            onClose={() => { setShowAdminRequestModal(false); setRequestToEdit(null); setRefreshTick(t=>t+1); }} 
            user={currentUser} 
            targetUser={editingUser} 
            editingRequest={requestToEdit}
        />
      )}
    </div>
  );
};
