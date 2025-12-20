
import React, { useState, useEffect } from 'react';
import { User, RequestStatus, LeaveRequest, RequestType } from '../types';
import { store } from '../services/store';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend, YAxis, CartesianGrid } from 'recharts';
import { Calendar, Clock, AlertCircle, Sun, PlusCircle, Timer, ChevronRight, ArrowLeft, History, Edit2, Trash2, Briefcase, ShieldCheck, HardHat } from 'lucide-react';
import PPERequestModal from './PPERequestModal';

interface DashboardProps {
  user: User;
  onNewRequest: (type: 'absence' | 'overtime') => void;
  onEditRequest: (req: LeaveRequest) => void;
  onViewRequest: (req: LeaveRequest) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNewRequest, onEditRequest, onViewRequest }) => {
  const [detailView, setDetailView] = useState<'none' | 'days' | 'hours'>('none');
  const [showPPEModal, setShowPPEModal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
        setRefresh(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const requests = store.getMyRequests();
  const nextShiftData = store.getNextShift(user.id);

  const handleDelete = async (reqId: string) => {
      if(confirm('¿Seguro que deseas eliminar esta solicitud?')) {
          await store.deleteRequest(reqId);
      }
  };

  const stats = [
    { 
      id: 'days',
      label: 'Días Disponibles', 
      value: (user.daysAvailable || 0).toFixed(1), 
      icon: Sun, 
      color: 'text-orange-500', 
      bg: 'bg-orange-50',
      clickable: true 
    },
    { 
      id: 'hours',
      label: 'Saldo Horas Extra', 
      value: `${user.overtimeHours || 0}h`, 
      icon: Clock, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50',
      clickable: true
    },
    { 
      id: 'pending',
      label: 'Solicitudes Pendientes', 
      value: String(requests.filter(r => r.status === RequestStatus.PENDING).length), 
      icon: AlertCircle, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-50',
      clickable: false
    },
  ];

  const currentYear = new Date().getFullYear();
  const monthlyAbsenceStats = Array.from({ length: 12 }, (_, i) => ({
      name: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i],
      approved: 0,
      pending: 0
  }));

  requests.forEach(req => {
      const isAbsence = !store.isOvertimeRequest(req.typeId) && req.typeId !== RequestType.ADJUSTMENT_DAYS;
      if (isAbsence && (req.status === RequestStatus.APPROVED || req.status === RequestStatus.PENDING)) {
          let current = new Date(req.startDate);
          const end = new Date(req.endDate || req.startDate);
          
          // Safety Check for invalid dates
          if (isNaN(current.getTime()) || isNaN(end.getTime())) return;

          current.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          
          while (current <= end) {
              if (current.getFullYear() === currentYear) {
                  const month = current.getMonth();
                  if (month >= 0 && month < 12) {
                      if (req.status === RequestStatus.APPROVED) monthlyAbsenceStats[month].approved += 1;
                      else monthlyAbsenceStats[month].pending += 1;
                  }
              }
              current.setDate(current.getDate() + 1);
          }
      }
  });

  if (detailView !== 'none') {
    const isOvertimeView = detailView === 'hours';
    const title = isOvertimeView ? 'Historial de Horas Extra' : 'Historial de Ausencias';
    const filteredRequests = requests.filter(r => isOvertimeView ? store.isOvertimeRequest(r.typeId) : !store.isOvertimeRequest(r.typeId));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => setDetailView('none')} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><ArrowLeft /></button>
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            </div>
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <p className="text-sm text-slate-500 uppercase font-semibold">{isOvertimeView ? 'Saldo Actual' : 'Días Restantes'}</p>
                    <p className="text-4xl font-bold text-slate-800">{isOvertimeView ? `${user.overtimeHours}h` : user.daysAvailable}</p>
                </div>
                <button onClick={() => onNewRequest(isOvertimeView ? 'overtime' : 'absence')} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-all"><PlusCircle size={20} /> {isOvertimeView ? 'Gestionar Horas' : 'Nueva Ausencia'}</button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100"><h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18} className="text-slate-400"/> Registros</h3></div>
                {filteredRequests.length === 0 ? <div className="p-12 text-center text-slate-400">No hay registros.</div> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tipo / Motivo</th>
                                    <th className="px-6 py-4 font-semibold">Fecha(s)</th>
                                    {isOvertimeView && <th className="px-6 py-4 font-semibold">Horas</th>}
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRequests.map(req => (
                                    <tr key={req.id} onClick={() => onViewRequest(req)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="font-medium text-slate-800">{String(req.label)}</div>{req.createdByAdmin && <ShieldCheck size={14} className="text-purple-500" />}</div>{req.reason && <div className="text-xs text-slate-500 italic mt-1">{String(req.reason)}</div>}</td>
                                        <td className="px-6 py-4 text-slate-600">{(req.typeId as string).includes('ajuste') ? 'Ajuste Manual' : `${new Date(req.startDate).toLocaleDateString()}${req.endDate ? ' - ' + new Date(req.endDate).toLocaleDateString() : ''}`}</td>
                                        {isOvertimeView && <td className={`px-6 py-4 font-mono font-bold ${(req.hours||0) < 0 ? 'text-red-600' : 'text-green-600'}`}>{(req.hours||0) > 0 ? '+' : ''}{req.hours}h</td>}
                                        <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td>
                                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>{req.status === RequestStatus.PENDING && (<div className="flex justify-end gap-2"><button onClick={() => onEditRequest(req)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"><Edit2 size={16}/></button><button onClick={() => handleDelete(req.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16}/></button></div>)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
         <div><h2 className="text-2xl font-bold text-slate-800">Hola, {user.name}</h2><p className="text-slate-500">Resumen de tu actividad laboral.</p></div>
         <div className="flex gap-3 w-full md:w-auto">
            <button onClick={() => onNewRequest('absence')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg font-medium"><PlusCircle size={18}/> Ausencia</button>
            <button onClick={() => onNewRequest('overtime')} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 px-5 py-3 rounded-xl font-medium"><Timer size={18}/> Horas</button>
            <button onClick={() => setShowPPEModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 px-5 py-3 rounded-xl font-medium"><HardHat size={18}/> EPI</button>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Briefcase size={64}/></div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Próximo Turno</p>
             {nextShiftData && nextShiftData.shift ? (<><h3 className="text-xl font-bold capitalize">{new Date(nextShiftData.date).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric'})}</h3><div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20"><span className="w-2 h-2 rounded-full" style={{backgroundColor: nextShiftData.shift.color}}></span>{nextShiftData.shift.name}</div></>) : <div className="text-slate-400 italic text-sm mt-2">Sin turnos próximos.</div>}
        </div>
        {stats.map((stat) => (
          <div key={stat.id} onClick={() => stat.clickable && setDetailView(stat.id as any)} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group transition-all ${stat.clickable ? 'cursor-pointer hover:shadow-md' : ''}`}>
            <div className="flex items-center space-x-4"><div className={`p-4 rounded-xl ${stat.bg}`}><stat.icon className={`w-8 h-8 ${stat.color}`} /></div><div><p className="text-sm font-medium text-slate-500">{stat.label}</p><h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3></div></div>
            {stat.clickable && <ChevronRight className="text-slate-300 group-hover:text-blue-500"/>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Calendar className="w-5 h-5 mr-2 text-slate-500" /> Solicitudes Recientes</h3>
          <div className="space-y-3">
            {requests.length === 0 ? <p className="text-slate-400 text-sm">No hay solicitudes.</p> : requests.slice(0, 4).map((req) => (
              <div key={req.id} onClick={() => onViewRequest(req)} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 group">
                <div><div className="flex items-center gap-2"><p className="font-semibold text-slate-700 text-sm">{String(req.label)}</p>{req.createdByAdmin && <ShieldCheck size={12} className="text-purple-500" />}</div><p className="text-xs text-slate-500">{(req.typeId as string).includes('ajuste') ? 'Ajuste Manual' : `${new Date(req.startDate).toLocaleDateString()}`}</p></div>
                <div className="flex items-center gap-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>{req.status === RequestStatus.PENDING && (<div className="flex gap-1" onClick={e => e.stopPropagation()}><button onClick={() => onEditRequest(req)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button><button onClick={() => handleDelete(req.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button></div>)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Evolución Ausencias (Días)</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyAbsenceStats}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="name" fontSize={12} stroke="#94a3b8" /><YAxis fontSize={12} stroke="#94a3b8" allowDecimals={false}/><Tooltip /><Legend iconType="circle" /><Bar dataKey="approved" name="Aprobados" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} /><Bar dataKey="pending" name="Pendientes" stackId="a" fill="#eab308" radius={[4, 4, 0, 0]} /></BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
      {showPPEModal && <PPERequestModal userId={user.id} onClose={() => setShowPPEModal(false)} />}
    </div>
  );
};

export default Dashboard;
