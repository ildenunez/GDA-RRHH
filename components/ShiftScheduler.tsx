
import React, { useState, useMemo } from 'react';
import { User, ShiftType } from '../types';
import { store } from '../services/store';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ShiftSchedulerProps {
  users: User[];
}

const ShiftScheduler: React.FC<ShiftSchedulerProps> = ({ users }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string | 'eraser'>('');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const shifts = store.config.shiftTypes;

  const handleCellClick = (userId: string, day: number) => {
      if (!selectedShiftId) return;
      // FIX: Construct local date string manually
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const typeId = selectedShiftId === 'eraser' ? '' : selectedShiftId;
      
      store.assignShift(userId, dateStr, typeId);
      // Force refresh
      setCurrentDate(new Date(currentDate)); 
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={20}/></button>
                <h2 className="text-lg font-bold capitalize text-slate-800 w-40 text-center">{monthName}</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={20}/></button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto max-w-2xl px-2">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">Herramientas:</span>
                <button 
                    onClick={() => setSelectedShiftId('eraser')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${selectedShiftId === 'eraser' ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                    Borrar
                </button>
                {shifts.map(shift => (
                    <button 
                        key={shift.id}
                        onClick={() => setSelectedShiftId(shift.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${selectedShiftId === shift.id ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}
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
                         // FIX: Date string construction
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
                     {users.map(user => (
                         <React.Fragment key={user.id}>
                             <div className="sticky left-0 z-10 bg-white border-b border-r border-slate-100 p-2 flex items-center gap-2">
                                 <img src={user.avatar} className="w-6 h-6 rounded-full"/>
                                 <span className="text-sm font-medium truncate">{user.name.split(' ')[0]}</span>
                             </div>
                             {Array.from({length: daysInMonth}).map((_, i) => {
                                 const day = i + 1;
                                 // FIX: Date string construction
                                 const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                 const assignment = store.config.shiftAssignments.find(a => a.userId === user.id && a.date === dateStr);
                                 const shift = assignment ? shifts.find(s => s.id === assignment.shiftTypeId) : null;
                                 const holiday = store.config.holidays.find(h => h.date === dateStr);
                                 const isWeekend = [0,6].includes(new Date(year, month, day).getDay());

                                 return (
                                     <div 
                                        key={day} 
                                        onClick={() => handleCellClick(user.id, day)}
                                        className={`border-b border-r border-slate-100 h-10 cursor-pointer transition-colors hover:bg-slate-50 
                                            ${holiday ? 'bg-red-50 hover:bg-red-100 border-red-100' : isWeekend ? 'bg-slate-50/50' : ''}
                                        `}
                                        style={{ backgroundColor: shift ? shift.color : undefined }}
                                        title={holiday ? `Festivo: ${holiday.name}` : shift ? `${shift.name} (${shift.segments.map(s => s.start+'-'+s.end).join(', ')})` : ''}
                                     >
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
