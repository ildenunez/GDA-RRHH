
import React, { useState, useMemo } from 'react';
import { User, ShiftType, RequestStatus } from '../types';
import { store } from '../services/store';
import { ChevronLeft, ChevronRight, Check, Filter } from 'lucide-react';

interface ShiftSchedulerProps {
  users: User[];
}

const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({ users: allUsers }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string | 'eraser'>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const shifts = store.config.shiftTypes;
  const departments = store.departments;

  const filteredUsers = useMemo(() => {
      if (!selectedDept) return allUsers;
      return allUsers.filter(u => u.departmentId === selectedDept);
  }, [allUsers, selectedDept]);

  const handleCellClick = (userId: string, day: number) => {
      if (!selectedShiftId) return;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const typeId = selectedShiftId === 'eraser' ? '' : selectedShiftId;
      
      store.assignShift(userId, dateStr, typeId);
      setCurrentDate(new Date(currentDate)); 
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row justify-start items-start xl:items-center bg-slate-50 gap-6">
            <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={20}/></button>
                <h2 className="text-lg font-bold capitalize text-slate-800 w-40 text-center">{monthName}</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={20}/></button>
            </div>

            {/* Dept Filter */}
            <div className="relative shrink-0">
                <Filter className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/>
                <select 
                    className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                >
                    <option value="">Todos los Departamentos</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full xl:w-auto px-2 pb-2 xl:pb-0">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2 shrink-0">Herramientas:</span>
                <button 
                    onClick={() => setSelectedShiftId('eraser')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${selectedShiftId === 'eraser' ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                    Borrar
                </button>
                {shifts.map(shift => (
                    <button 
                        key={shift.id}
                        onClick={() => setSelectedShiftId(shift.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${selectedShiftId === shift.id ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}
                        style={{ 
                            backgroundColor: selectedShiftId === shift.id ? shift.color : 'white', 
                            color: selectedShiftId === shift.id ? 'white' : shift.color,
                            borderColor: shift.color,
                            ['--tw-ring-color' as any]: shift.color
                        }}
                    >
                       {selectedShiftId === shift.id && <Check size={14}/>} {shift.name}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 overflow-auto relative">
            <div className="inline-block min-w-full align-middle">
                 <div className="grid" style={{ gridTemplateColumns: `200px repeat(${daysInMonth}, minmax(32px, 1fr))` }}>
                     
                     {/* Header Row */}
                     <div className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 font-bold text-slate-600 p-2 flex items-center">Empleado</div>
                     {Array.from({length: daysInMonth}).map((_, i) => {
                         const day = i + 1;
                         const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                         const holiday = store.config.holidays.find(h => h.date === dateStr);
                         const isWeekend = [0,6].includes(new Date(year, month, day).getDay());

                         return (
                            <div 
                                key={i} 
                                className={`sticky top-0 z-20 border-b border-slate-200 border-l border-slate-100 text-xs font-semibold p-1 flex flex-col items-center justify-center h-12 
                                    ${holiday ? 'bg-red-100 text-red-700' : isWeekend ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-500'}
                                `}
                                title={holiday?.name}
                            >
                                <span>{day}</span>
                                <span className="text-[10px]">{['D','L','M','X','J','V','S'][new Date(year, month, day).getDay()]}</span>
                            </div>
                         );
                     })}

                     {/* Rows */}
                     {filteredUsers.map(user => (
                         <React.Fragment key={user.id}>
                             <div className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 p-2 flex items-center gap-2">
                                 <img src={user.avatar} className="w-6 h-6 rounded-full"/>
                                 <span className="text-sm font-medium truncate">{user.name.split(' ')[0]}</span>
                             </div>
                             {Array.from({length: daysInMonth}).map((_, i) => {
                                 const day = i + 1;
                                 const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                 
                                 // Data Retrieval
                                 const assignment = store.config.shiftAssignments.find(a => a.userId === user.id && a.date === dateStr);
                                 const shift = assignment ? shifts.find(s => s.id === assignment.shiftTypeId) : null;
                                 const holiday = store.config.holidays.find(h => h.date === dateStr);
                                 const isWeekend = [0,6].includes(new Date(year, month, day).getDay());

                                 // Find Request (Absence)
                                 const activeRequest = store.requests.find(r => {
                                     const s = r.startDate.split('T')[0];
                                     const e = (r.endDate || r.startDate).split('T')[0];
                                     return r.userId === user.id && 
                                            dateStr >= s && dateStr <= e &&
                                            !store.isOvertimeRequest(r.typeId) &&
                                            (r.status === RequestStatus.APPROVED || r.status === RequestStatus.PENDING);
                                 });

                                 // Styling Logic
                                 let bgColorClass = '';
                                 let inlineStyle = {};
                                 let content = null;
                                 let title = '';

                                 if (holiday) {
                                     bgColorClass = 'bg-red-50 hover:bg-red-100 border-red-100';
                                     title = `Festivo: ${holiday.name}`;
                                 } else if (activeRequest) {
                                     const isApproved = activeRequest.status === RequestStatus.APPROVED;
                                     bgColorClass = isApproved 
                                        ? 'bg-green-100 hover:bg-green-200 border-green-200' 
                                        : 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
                                     
                                     // Initial + Status indicator
                                     const letter = activeRequest.label.charAt(0).toUpperCase();
                                     content = (
                                         <span className={`text-[10px] font-black ${isApproved ? 'text-green-700' : 'text-yellow-700'}`}>
                                             {letter}{!isApproved && '?'}
                                         </span>
                                     );
                                     title = `${activeRequest.label} (${activeRequest.status})`;
                                 } else if (shift) {
                                     inlineStyle = { backgroundColor: shift.color };
                                     title = `${shift.name} (${shift.segments.map(s => s.start+'-'+s.end).join(', ')})`;
                                 } else if (isWeekend) {
                                     bgColorClass = 'bg-slate-50/50';
                                 }

                                 return (
                                     <div 
                                        key={day} 
                                        onClick={() => handleCellClick(user.id, day)}
                                        className={`border-b border-r border-slate-100 h-10 cursor-pointer transition-colors hover:bg-slate-50 flex items-center justify-center ${bgColorClass}`}
                                        style={inlineStyle}
                                        title={title}
                                     >
                                         {content}
                                     </div>
                                 );
                             })}
                         </React.Fragment>
                     ))}
                 </div>
            </div>
        </div>
    </div>
  );
};

export default ShiftScheduler;
