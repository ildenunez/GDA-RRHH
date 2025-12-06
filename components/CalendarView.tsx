
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
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; 
  const daysInMonth = lastDayOfMonth.getDate();

  const isSupervisorOrAdmin = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  
  const allowedDepts = useMemo(() => {
      if (user.role === Role.ADMIN) return store.departments;
      if (user.role === Role.SUPERVISOR) return store.departments.filter(d => d.supervisorIds.includes(user.id));
      return [];
  }, [user]);

  const requests = store.getCalendarRequests(user.id, selectedDeptId || undefined);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Obtener eventos (ausencias y TURNOS)
  const getEventsForDay = (day: number) => {
    // FIX: Construir string local manualmente para evitar desfases de zona horaria (UTC vs Local)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Ausencias
    const absenceEvents = requests.filter(req => {
       const start = req.startDate.split('T')[0];
       const end = req.endDate ? req.endDate.split('T')[0] : start;
       return dateStr >= start && dateStr <= end;
    });

    const myShift = store.getShiftForUserDate(user.id, dateStr);
    const holiday = store.config.holidays.find(h => h.date === dateStr);

    return { absences: absenceEvents, shift: myShift, holiday };
  };

  const getUserName = (id: string) => store.users.find(u => u.id === id)?.name.split(' ')[0] || 'User';

  const conflicts = useMemo(() => {
      if (!isSupervisorOrAdmin) return [];
      
      const conflictList: {date: string, users: string[], deptName: string}[] = [];
      const daysToCheck = daysInMonth;

      for(let i = 1; i <= daysToCheck; i++) {
          // FIX: Construcción manual de fecha
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          
          const activeRequests = store.requests.filter(req => {
              if (req.status !== RequestStatus.APPROVED || store.isOvertimeRequest(req.typeId)) return false;
              const start = req.startDate.split('T')[0];
              const end = req.endDate ? req.endDate.split('T')[0] : start;
              return dateStr >= start && dateStr <= end;
          });

          const deptMap: Record<string, string[]> = {}; 

          activeRequests.forEach(req => {
              const u = store.users.find(user => user.id === req.userId);
              if (u && u.departmentId) {
                  if (selectedDeptId && u.departmentId !== selectedDeptId) return;
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
  }, [year, month, isSupervisorOrAdmin, selectedDeptId, requests]);

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
                const { absences, shift, holiday } = getEventsForDay(day);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                return (
                <div 
                    key={day} 
                    className={`min-h-[100px] border rounded-lg p-2 transition-all hover:shadow-md flex flex-col justify-between 
                    ${holiday ? 'bg-red-50 border-red-200' : isToday ? 'bg-blue-50 ring-2 ring-blue-100 border-blue-200' : 'bg-white border-slate-100'}`}
                >
                    <div>
                        <div className={`text-sm font-bold mb-1 flex justify-between ${holiday ? 'text-red-600' : isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                            {day}
                        </div>
                        
                        {/* Holiday Label */}
                        {holiday && (
                            <div className="mb-2 text-[10px] uppercase font-bold text-red-500 tracking-tight leading-tight">
                                {holiday.name}
                            </div>
                        )}
                        
                        <div className="space-y-1">
                            {absences.map((ev, idx) => (
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
                    
                    {/* Turno Visual */}
                    {shift && !holiday && (
                        <div 
                            className="mt-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm truncate"
                            style={{ backgroundColor: shift.color }}
                            title={`Turno: ${shift.name} (${shift.segments.map(s => s.start+'-'+s.end).join(', ')})`}
                        >
                            {shift.name} ({shift.segments[0].start})
                        </div>
                    )}
                </div>
                );
            })}
            </div>
        </div>
        
        <div className="px-6 pb-6 flex gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded-sm"></div> Aprobado</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded-sm"></div> Pendiente</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded-sm"></div> Festivo</div>
        </div>
        </div>

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
