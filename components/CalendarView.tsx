import React, { useState, useMemo } from 'react';
import { User, RequestStatus, Role } from '../types';
import { store } from '../services/store';
import { ChevronLeft, ChevronRight, Filter, AlertTriangle } from 'lucide-react';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface CalendarViewProps {
  user: User;
}

const CalendarView: React.FC<CalendarViewProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Filtro por departamento (Solo visible para supervisors/admins)
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Ajustar para que Lunes sea 0
  const daysInMonth = lastDayOfMonth.getDate();

  const isSupervisorOrAdmin = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  
  // Departamentos que puedo ver
  const allowedDepts = useMemo(() => {
      if (user.role === Role.ADMIN) return store.departments;
      if (user.role === Role.SUPERVISOR) return store.departments.filter(d => d.supervisorIds.includes(user.id));
      return [];
  }, [user]);

  // Obtener solicitudes para mostrar (aplicando filtro si existe)
  const requests = store.getCalendarRequests(user.id, selectedDeptId || undefined);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Función para ver si un día tiene evento
  const getEventsForDay = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    
    return requests.filter(req => {
       const start = req.startDate.split('T')[0];
       const end = req.endDate ? req.endDate.split('T')[0] : start;
       return dateStr >= start && dateStr <= end;
    });
  };

  const getUserName = (id: string) => store.users.find(u => u.id === id)?.name.split(' ')[0] || 'User';

  // --- Lógica de Conflictos ---
  // Un conflicto es cuando >1 personas del MISMO departamento están ausentes (aprobadas) el mismo día.
  const conflicts = useMemo(() => {
      if (!isSupervisorOrAdmin) return [];
      
      const conflictList: {date: string, users: string[], deptName: string}[] = [];
      const daysToCheck = daysInMonth;

      for(let i = 1; i <= daysToCheck; i++) {
          const dateStr = new Date(year, month, i).toISOString().split('T')[0];
          
          // Buscar todas las solicitudes APROBADAS que caen en este día
          const activeRequests = store.requests.filter(req => {
              if (req.status !== RequestStatus.APPROVED || store.isOvertimeRequest(req.typeId)) return false;
              const start = req.startDate.split('T')[0];
              const end = req.endDate ? req.endDate.split('T')[0] : start;
              return dateStr >= start && dateStr <= end;
          });

          // Agrupar por departamento
          const deptMap: Record<string, string[]> = {}; // deptId -> userNames[]

          activeRequests.forEach(req => {
              const u = store.users.find(user => user.id === req.userId);
              if (u && u.departmentId) {
                  // Si estamos filtrando por depto, solo miramos ese
                  if (selectedDeptId && u.departmentId !== selectedDeptId) return;

                  // Si soy supervisor, solo me importan mis deptos
                  if (user.role === Role.SUPERVISOR) {
                       const myDepts = store.departments.filter(d => d.supervisorIds.includes(user.id)).map(d => d.id);
                       if (!myDepts.includes(u.departmentId)) return;
                  }

                  if (!deptMap[u.departmentId]) deptMap[u.departmentId] = [];
                  if (!deptMap[u.departmentId].includes(u.name)) {
                      deptMap[u.departmentId].push(u.name);
                  }
              }
          });

          // Detectar si hay > 1 persona en el mismo depto
          Object.keys(deptMap).forEach(deptId => {
              if (deptMap[deptId].length > 1) {
                  const dName = store.departments.find(d => d.id === deptId)?.name || 'Dept';
                  conflictList.push({
                      date: dateStr,
                      users: deptMap[deptId],
                      deptName: dName
                  });
              }
          });
      }
      return conflictList;
  }, [year, month, isSupervisorOrAdmin, selectedDeptId, requests]); // Recalcular si cambian inputs

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="capitalize">{MONTHS[month]}</span> <span className="text-slate-400 font-normal">{year}</span>
            </h2>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {isSupervisorOrAdmin && (
                    <div className="relative flex items-center w-full md:w-64">
                        <Filter className="absolute left-3 text-slate-400 w-4 h-4" />
                        <select 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors appearance-none"
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                        >
                            <option value="">Todos mis departamentos</option>
                            {allowedDepts.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="flex gap-2 bg-slate-100 rounded-full p-1">
                    <button onClick={prevMonth} className="p-2 hover:bg-white rounded-full transition-all shadow-sm hover:shadow text-slate-600"><ChevronLeft size={16}/></button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white rounded-full transition-all shadow-sm hover:shadow text-slate-600"><ChevronRight size={16}/></button>
                </div>
            </div>
        </div>

        {/* Grid */}
        <div className="p-6">
            <div className="grid grid-cols-7 mb-4">
            {DAYS.map(d => <div key={d} className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider">{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
            {/* Padding Empty Cells */}
            {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 rounded-lg"></div>
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = getEventsForDay(day);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                return (
                <div key={day} className={`min-h-[100px] border border-slate-100 rounded-lg p-2 transition-all hover:shadow-md ${isToday ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-white'}`}>
                    <div className={`text-sm font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day}</div>
                    
                    <div className="space-y-1">
                        {events.map((ev, idx) => (
                        <div 
                            key={ev.id + idx} 
                            className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border-l-2
                            ${ev.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700 border-green-500' : 
                                ev.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-700 border-red-500' : 'bg-yellow-100 text-yellow-700 border-yellow-500'}
                            `}
                            title={`${getUserName(ev.userId)}: ${ev.label}`}
                        >
                            {getUserName(ev.userId)}
                        </div>
                        ))}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        
        <div className="px-6 pb-6 flex gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded-sm"></div> Aprobado</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded-sm"></div> Pendiente</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded-sm"></div> Rechazado</div>
        </div>
        </div>

        {/* Sección de Conflictos */}
        {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <h3 className="text-red-800 font-bold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5"/> Conflictos de Departamento ({conflicts.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {conflicts.map((conf, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                            <div className="text-sm font-bold text-red-600 mb-1">{new Date(conf.date).toLocaleDateString()}</div>
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{conf.deptName}</div>
                            <div className="flex flex-wrap gap-1">
                                {conf.users.map(u => (
                                    <span key={u} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">{u}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarView;