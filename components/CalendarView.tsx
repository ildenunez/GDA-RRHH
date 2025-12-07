
import React, { useState, useMemo } from 'react';
import { User, RequestStatus, Role, ShiftType } from '../types';
import { store } from '../services/store';
import { ChevronLeft, ChevronRight, Filter, AlertTriangle, Palmtree, Thermometer, Briefcase, User as UserIcon, Clock, Star, Check } from 'lucide-react';

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

  // Determine relevant users for current view (to show team shifts)
  const usersInScope = useMemo(() => {
      if (!isSupervisorOrAdmin) return [user];
      
      let relevantUsers = store.users;
      
      // Filter by Role
      if (user.role === Role.SUPERVISOR) {
          const myDepts = store.departments.filter(d => d.supervisorIds.includes(user.id)).map(d => d.id);
          relevantUsers = relevantUsers.filter(u => myDepts.includes(u.departmentId));
      }

      // Filter by Selected Department in Dropdown
      if (selectedDeptId) {
          relevantUsers = relevantUsers.filter(u => u.departmentId === selectedDeptId);
      }
      
      return relevantUsers.sort((a,b) => a.name.localeCompare(b.name));
  }, [user, isSupervisorOrAdmin, selectedDeptId]);


  const requests = store.getCalendarRequests(user.id, selectedDeptId || undefined);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Helper para iconos gráficos
  const getEventIcon = (label: string) => {
      const lower = label.toLowerCase();
      if (lower.includes('vacaci')) return <Palmtree size={24} className="opacity-80"/>;
      if (lower.includes('baja') || lower.includes('medica')) return <Thermometer size={24} className="opacity-80"/>;
      if (lower.includes('asuntos')) return <UserIcon size={24} className="opacity-80"/>;
      return <Star size={24} className="opacity-80"/>;
  };

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

    const holiday = store.config.holidays.find(h => h.date === dateStr);

    // Lógica de Turno:
    let myShift: ShiftType | undefined = undefined;
    let teamShifts: { userName: string, shift: ShiftType }[] = [];

    if (!isSupervisorOrAdmin) {
        // Trabajador: Solo su turno, oculto si hay ausencia aprobada
        myShift = store.getShiftForUserDate(user.id, dateStr);
        const myAbsences = absenceEvents.filter(r => r.userId === user.id);
        const hasApprovedAbsence = myAbsences.some(r => r.status === RequestStatus.APPROVED && !store.isOvertimeRequest(r.typeId));
        if (hasApprovedAbsence) {
            myShift = undefined;
        }
    } else {
        // Supervisor/Admin: Turnos de TODOS los usuarios en scope
        teamShifts = usersInScope.map(u => {
            const s = store.getShiftForUserDate(u.id, dateStr);
            return s ? { userName: u.name.split(' ')[0], shift: s } : null;
        }).filter(Boolean) as { userName: string, shift: ShiftType }[];
    }

    return { absences: absenceEvents, shift: myShift, teamShifts, holiday };
  };

  const getUserName = (id: string) => store.users.find(u => u.id === id)?.name.split(' ')[0] || 'User';

  const conflicts = useMemo(() => {
      if (!isSupervisorOrAdmin) return [];
      
      const conflictList: {date: string, users: string[], deptName: string}[] = [];
      const daysToCheck = daysInMonth;

      for(let i = 1; i <= daysToCheck; i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          
          const activeRequests = store.requests.filter(req => {
              // CHANGE: Conflict detection now includes PENDING requests
              if ((req.status !== RequestStatus.APPROVED && req.status !== RequestStatus.PENDING) || store.isOvertimeRequest(req.typeId)) return false;
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
                      deptMap[u.departmentId].push(`${u.name} (${req.status === RequestStatus.PENDING ? '?' : 'OK'})`);
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
            
            <div className="grid grid-cols-7 gap-3">
            {/* Padding Empty Cells */}
            {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 rounded-xl"></div>
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const { absences, shift, teamShifts, holiday } = getEventsForDay(day);
                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                
                // Priorizar la visualización: Festivo > Ausencia Aprobada > Turno > Ausencia Pendiente/Rechazada
                const approvedAbsence = absences.find(a => a.status === RequestStatus.APPROVED && !store.isOvertimeRequest(a.typeId));

                return (
                <div 
                    key={day} 
                    className={`min-h-[120px] border rounded-xl p-2 transition-all hover:shadow-lg flex flex-col relative overflow-hidden group
                    ${holiday ? 'bg-red-50 border-red-200' : isToday ? 'bg-white ring-2 ring-blue-400 border-blue-200 shadow-md transform scale-[1.02]' : 'bg-white border-slate-100'}`}
                >
                    <div className={`text-sm font-bold mb-1 z-10 ${holiday ? 'text-red-600' : isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                        {day}
                    </div>
                    
                    {/* CONTENIDO CENTRAL */}
                    <div className="flex-1 flex flex-col justify-start z-10 gap-1 w-full overflow-hidden">
                        
                        {/* --- MODO SUPERVISOR/ADMIN: LISTADO DETALLADO --- */}
                        {isSupervisorOrAdmin ? (
                            <div className="overflow-y-auto no-scrollbar space-y-1 w-full h-full">
                                {holiday && (
                                    <div className="text-xs font-bold text-red-600 uppercase mb-1 flex items-center gap-1 justify-center bg-red-100/50 rounded p-1">
                                        <Star size={10} fill="currentColor"/> {holiday.name}
                                    </div>
                                )}
                                
                                {/* Lista de Ausencias (Texto) */}
                                {absences.map((ev, idx) => (
                                    <div 
                                        key={ev.id + idx} 
                                        className={`text-[9px] px-1.5 py-0.5 rounded border-l-2 truncate font-medium flex items-center gap-1
                                        ${ev.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-500' :
                                            ev.status === RequestStatus.PENDING ? 'bg-yellow-50 text-yellow-700 border-yellow-500' : 
                                            ev.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-500 line-through opacity-60' : ''}
                                        `}
                                        title={`${getUserName(ev.userId)}: ${ev.label}`}
                                    >
                                        <span className="truncate"><strong>{getUserName(ev.userId)}</strong>: {ev.label}</span>
                                    </div>
                                ))}

                                {/* Lista de Turnos (Equipo) */}
                                {teamShifts.length > 0 && (
                                    <div className="border-t border-slate-100 pt-1 mt-1">
                                        {teamShifts.map((ts, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded mb-0.5"
                                                style={{ backgroundColor: ts.shift.color + '20', color: ts.shift.color }} // 20 hex alpha
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: ts.shift.color}}></div>
                                                <span className="font-bold truncate max-w-[50px]">{ts.userName}</span>
                                                <span className="opacity-80 ml-auto">{ts.shift.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* --- MODO TRABAJADOR: VISUAL / WOW --- */
                            <div className="flex-1 flex flex-col justify-center items-center w-full">
                                {/* CASO 1: FESTIVO */}
                                {holiday && (
                                    <div className="text-center">
                                        <Star className="mx-auto text-red-400 mb-1" size={28} fill="currentColor" fillOpacity={0.2} />
                                        <span className="text-xs font-bold text-red-600 uppercase leading-tight block">{holiday.name}</span>
                                    </div>
                                )}

                                {/* CASO 2: AUSENCIA APROBADA (Sobrescribe turno) */}
                                {!holiday && approvedAbsence && (
                                    <div className="w-full h-full bg-green-50 rounded-lg border border-green-100 flex flex-col items-center justify-center p-1 text-center animate-fade-in">
                                        <div className="text-green-500 mb-1">{getEventIcon(approvedAbsence.label)}</div>
                                        <span className="text-xs font-bold text-green-700 leading-tight line-clamp-2">{approvedAbsence.label}</span>
                                    </div>
                                )}

                                {/* CASO 3: TURNO (Si no es festivo ni hay ausencia aprobada) */}
                                {!holiday && !approvedAbsence && shift && (
                                    <div 
                                        className="w-full h-full rounded-lg flex flex-col items-center justify-center p-1 text-white shadow-sm animate-fade-in"
                                        style={{ backgroundColor: shift.color }}
                                    >
                                        <Briefcase size={20} className="mb-0.5 opacity-90"/>
                                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">{shift.name}</span>
                                        <div className="bg-black/20 rounded px-1.5 py-0.5 mt-1 text-[10px] font-mono flex items-center gap-1">
                                            <Clock size={8}/>
                                            {shift.segments[0].start}-{shift.segments[0].end}
                                        </div>
                                    </div>
                                )}

                                {/* CASO 4: OTRAS SOLICITUDES (Pendientes) */}
                                {!holiday && !approvedAbsence && !shift && absences.length > 0 && (
                                     <div className="space-y-1 w-full">
                                        {absences.map((ev, idx) => (
                                            <div 
                                                key={ev.id + idx} 
                                                className={`text-[9px] px-1.5 py-1 rounded border-l-2 truncate font-medium flex items-center gap-1
                                                ${ev.status === RequestStatus.PENDING ? 'bg-yellow-50 text-yellow-700 border-yellow-500' : 
                                                  ev.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-500 line-through opacity-60' : ''}
                                                `}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></div>
                                                <span className="truncate">{ev.label}</span>
                                            </div>
                                        ))}
                                     </div>
                                )}

                                {/* Estado Vacío */}
                                {!holiday && !approvedAbsence && !shift && absences.length === 0 && (
                                    <div className="text-slate-200 text-xs font-medium text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        Libre
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        
        <div className="px-6 pb-6 flex gap-6 text-xs text-slate-500 border-t border-slate-100 pt-4 mx-6">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-100 border border-green-200 rounded flex items-center justify-center"><Check size={10} className="text-green-600"/></div> Ausencia Aprobada</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-50 border-l-2 border-yellow-500 rounded"></div> Solicitud Pendiente</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div> Festivo</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div> Turno Laboral</div>
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
