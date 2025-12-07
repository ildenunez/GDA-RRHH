
import React, { useState } from 'react';
import { User, RequestStatus, LeaveRequest } from '../types';
import { store } from '../services/store';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Sun, PlusCircle, Timer, ChevronRight, ArrowLeft, History, Edit2, Trash2, Briefcase, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  user: User;
  onNewRequest: (type: 'absence' | 'overtime') => void;
  onEditRequest: (req: LeaveRequest) => void;
  onViewRequest: (req: LeaveRequest) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNewRequest, onEditRequest, onViewRequest }) => {
  const [detailView, setDetailView] = useState<'none' | 'days' | 'hours'>('none');
  const requests = store.getMyRequests();
  const nextShiftData = store.getNextShift(user.id);

  const handleDelete = (reqId: string) => {
      if(confirm('¿Seguro que deseas eliminar esta solicitud pendiente?')) {
          store.deleteRequest(reqId);
          setDetailView(detailView); // Trick to trigger refresh
      }
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

  const stats = [
    { 
      id: 'days',
      label: 'Días Disponibles', 
      value: user.daysAvailable.toFixed(1), 
      icon: Sun, 
      color: 'text-orange-500', 
      bg: 'bg-orange-50',
      clickable: true 
    },
    { 
      id: 'hours',
      label: 'Saldo Horas Extra', 
      value: `${user.overtimeHours}h`, 
      icon: Clock, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50',
      clickable: true
    },
    { 
      id: 'pending',
      label: 'Solicitudes Pendientes', 
      value: requests.filter(r => r.status === RequestStatus.PENDING).length, 
      icon: AlertCircle, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-50',
      clickable: false
    },
  ];

  // Calcular horas extra reales por mes del año actual
  const currentYear = new Date().getFullYear();
  const monthlyOvertime = Array(12).fill(0);

  requests.forEach(req => {
      // Solo contar horas GENERADAS (earn) y APROBADAS
      if (req.typeId === 'overtime_earn' && req.status === RequestStatus.APPROVED) {
          const d = new Date(req.startDate);
          if (d.getFullYear() === currentYear) {
              monthlyOvertime[d.getMonth()] += (req.hours || 0);
          }
      }
  });

  const chartData = [
    { name: 'Ene', hours: monthlyOvertime[0] },
    { name: 'Feb', hours: monthlyOvertime[1] },
    { name: 'Mar', hours: monthlyOvertime[2] },
    { name: 'Abr', hours: monthlyOvertime[3] },
    { name: 'May', hours: monthlyOvertime[4] },
    { name: 'Jun', hours: monthlyOvertime[5] },
    { name: 'Jul', hours: monthlyOvertime[6] },
    { name: 'Ago', hours: monthlyOvertime[7] },
    { name: 'Sep', hours: monthlyOvertime[8] },
    { name: 'Oct', hours: monthlyOvertime[9] },
    { name: 'Nov', hours: monthlyOvertime[10] },
    { name: 'Dic', hours: monthlyOvertime[11] },
  ];

  // VISTA DE DETALLE (DRILL DOWN)
  if (detailView !== 'none') {
    const isOvertimeView = detailView === 'hours';
    const title = isOvertimeView ? 'Historial de Horas Extra' : 'Historial de Ausencias';
    
    const filteredRequests = requests.filter(r => 
        isOvertimeView ? store.isOvertimeRequest(r.typeId) : !store.isOvertimeRequest(r.typeId)
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => setDetailView('none')} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                    <ArrowLeft />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            </div>

            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <p className="text-sm text-slate-500 uppercase font-semibold">{isOvertimeView ? 'Saldo Actual' : 'Días Restantes'}</p>
                    <p className="text-4xl font-bold text-slate-800">
                        {isOvertimeView ? `${user.overtimeHours}h` : user.daysAvailable}
                    </p>
                </div>
                <button 
                    onClick={() => onNewRequest(isOvertimeView ? 'overtime' : 'absence')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-bold transition-all"
                >
                    <PlusCircle size={20} />
                    {isOvertimeView ? 'Gestionar Horas' : 'Nueva Ausencia'}
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <History size={18} className="text-slate-400"/> Registros
                    </h3>
                </div>
                {filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No hay registros en este historial.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tipo / Motivo</th>
                                    <th className="px-6 py-4 font-semibold">Fecha(s)</th>
                                    {isOvertimeView && <th className="px-6 py-4 font-semibold">Horas</th>}
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRequests.map(req => (
                                    <tr 
                                        key={req.id} 
                                        onClick={() => onViewRequest(req)}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium text-slate-800">{req.label}</div>
                                                {req.createdByAdmin && (
                                                    <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5" title="Creada por Admin">
                                                        <ShieldCheck size={10}/> Admin
                                                    </span>
                                                )}
                                            </div>
                                            {req.reason && <div className="text-xs text-slate-500 italic mt-1">{req.reason}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(req.startDate).toLocaleDateString()}
                                            {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}
                                        </td>
                                        {isOvertimeView && (
                                            <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                                {req.hours}h
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1 ${
                                                req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                                                req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {req.status === RequestStatus.APPROVED && <CheckCircle size={12}/>}
                                                {req.status === RequestStatus.REJECTED && <XCircle size={12}/>}
                                                {req.status === RequestStatus.PENDING && <AlertCircle size={12}/>}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                            {req.status === RequestStatus.PENDING && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => onEditRequest(req)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Editar">
                                                        <Edit2 size={16}/>
                                                    </button>
                                                    <button onClick={() => handleDelete(req.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Eliminar">
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
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

  // Helper to format string date YYYY-MM-DD to locale string without timezone shift
  const formatShiftDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric'});
  };

  // VISTA DASHBOARD PRINCIPAL
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Quick Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">Hola, {user.name}</h2>
            <p className="text-slate-500">Aquí tienes el resumen de tu actividad.</p>
         </div>
         <div className="flex gap-3 w-full md:w-auto">
            <button 
                onClick={() => onNewRequest('absence')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 font-medium"
            >
                <PlusCircle size={18}/>
                Solicitar Ausencia
            </button>
            <button 
                onClick={() => onNewRequest('overtime')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 px-5 py-3 rounded-xl shadow-sm transition-all font-medium"
            >
                <Timer size={18}/>
                Gestión Horas
            </button>
         </div>
      </div>

      {/* Tarjetas de Resumen Interactivas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* MI PRÓXIMO TURNO (NUEVO) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Briefcase size={64}/></div>
             <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mi Próximo Turno</p>
                 {nextShiftData ? (
                     <>
                        <h3 className="text-xl font-bold capitalize">
                            {formatShiftDate(nextShiftData.date)}
                        </h3>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: nextShiftData.shift.color}}></span>
                            {nextShiftData.shift.name}
                        </div>
                        <div className="mt-3 text-sm text-slate-300 font-mono">
                            {nextShiftData.shift.segments.map(s => `${s.start}-${s.end}`).join(' / ')}
                        </div>
                     </>
                 ) : (
                     <div className="text-slate-400 italic text-sm mt-2">No tienes turnos asignados próximamente.</div>
                 )}
             </div>
        </div>

        {stats.map((stat) => (
          <div 
            key={stat.id} 
            onClick={() => {
                if(stat.clickable) {
                    if (stat.id === 'days') setDetailView('days');
                    if (stat.id === 'hours') setDetailView('hours');
                }
            }}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group transition-all 
                ${stat.clickable ? 'cursor-pointer hover:shadow-md hover:border-blue-200' : ''}`}
          >
            <div className="flex items-center space-x-4">
                <div className={`p-4 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
                <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                </div>
            </div>
            {stat.clickable && (
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors"/>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-slate-500" /> Solicitudes Recientes
          </h3>
          <div className="space-y-3">
            {requests.length === 0 && <p className="text-slate-400 text-sm">No hay solicitudes recientes.</p>}
            {requests.slice(0, 4).map((req) => (
              <div 
                key={req.id} 
                onClick={() => onViewRequest(req)}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-700 text-sm">{req.label}</p>
                    {req.createdByAdmin && (
                        <span title="Creada por Admin">
                            <ShieldCheck size={12} className="text-purple-500"/>
                        </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(req.startDate).toLocaleDateString()} {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}</p>
                  <div className="mt-1">
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                          {getDurationString(req)}
                      </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1
                    ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                        req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {req.status === RequestStatus.APPROVED && <CheckCircle size={12}/>}
                    {req.status === RequestStatus.REJECTED && <XCircle size={12}/>}
                    {req.status === RequestStatus.PENDING && <AlertCircle size={12}/>}
                    {req.status}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfica Horas Extra */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Gráfica Horas extras realizadas</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{fill: '#f1f5f9'}}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                   {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#3b82f6" />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
