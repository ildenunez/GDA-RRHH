
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, OvertimeUsage, RequestStatus, Role } from '../types';
import { store } from '../services/store';
import { X, Clock, Loader2, User as UserIcon, CalendarDays } from 'lucide-react';

interface RequestFormModalProps {
  onClose: () => void;
  user: User; // The logged-in user (needed for context/role)
  targetUser?: User; // The user for whom the request is being created (Admin mode)
  initialTab?: 'absence' | 'overtime';
  editingRequest?: LeaveRequest | null;
}

const RequestFormModal: React.FC<RequestFormModalProps> = ({ onClose, user, targetUser, initialTab = 'absence', editingRequest }) => {
  const [activeTab, setActiveTab] = useState<'absence' | 'overtime'>(initialTab);
  const [typeId, setTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState(0);
  const [reason, setReason] = useState('');
  const [isDatesLocked, setIsDatesLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Admin Mode State
  const [adminStatus, setAdminStatus] = useState<RequestStatus>(RequestStatus.PENDING);
  
  // Trazabilidad (Partial Usage)
  const [availableOvertime, setAvailableOvertime] = useState<LeaveRequest[]>([]);
  // Mapa de { id_solicitud : horas_a_usar }
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

  // Determine actual target user
  const effectiveTargetUser = targetUser || user;
  const isAdminMode = !!targetUser && (user.role === Role.ADMIN || user.role === Role.SUPERVISOR);

  // Cargar tipos de ausencia
  const absenceTypes = store.config.leaveTypes;

  // Efecto para Cargar Datos de Edición
  useEffect(() => {
      if (editingRequest) {
          const isOvertime = store.isOvertimeRequest(editingRequest.typeId);
          setActiveTab(isOvertime ? 'overtime' : 'absence');
          setTypeId(editingRequest.typeId);
          setStartDate(editingRequest.startDate.split('T')[0]);
          setEndDate(editingRequest.endDate ? editingRequest.endDate.split('T')[0] : '');
          setHours(editingRequest.hours || 0);
          setReason(editingRequest.reason || '');
      }
  }, [editingRequest]);

  // Set default type
  useEffect(() => {
      if (!editingRequest) {
        if (activeTab === 'absence' && absenceTypes.length > 0 && !typeId) {
            setTypeId(absenceTypes[0].id);
        } else if (activeTab === 'overtime') {
            if (!typeId) setTypeId('overtime_earn');
        }
      }
      if (activeTab === 'overtime') {
          setAvailableOvertime(store.getAvailableOvertimeRecords(effectiveTargetUser.id));
      }
  }, [activeTab, editingRequest, effectiveTargetUser]);

  // Lógica de autocompletado para rangos fijos
  useEffect(() => {
    const selectedType = absenceTypes.find(t => t.id === typeId);
    if (activeTab === 'absence' && selectedType && selectedType.fixedRange) {
        setStartDate(selectedType.fixedRange.startDate);
        setEndDate(selectedType.fixedRange.endDate);
        setIsDatesLocked(true);
    } else {
        setIsDatesLocked(false);
    }
  }, [typeId, activeTab, absenceTypes]);

  // Manejar selección de horas parciales
  const handleUsageChange = (req: LeaveRequest, isChecked: boolean, customAmount?: number) => {
      const remaining = (req.hours || 0) - (req.consumedHours || 0);
      const newMap: Record<string, number> = { ...usageMap };

      if (!isChecked) {
          delete newMap[req.id];
      } else {
          // Si activamos, usamos todo lo restante por defecto, o la cantidad custom
          newMap[req.id] = customAmount !== undefined ? customAmount : remaining;
      }
      
      setUsageMap(newMap);

      // Calcular total actual
      const total = Object.values(newMap).reduce((sum: number, val: number) => sum + val, 0);
      setHours(total);
  };

  // --- CALCULO DE DÍAS EN TIEMPO REAL ---
  const dayCount = useMemo(() => {
      if (activeTab !== 'absence' || !startDate) return 0;
      
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      
      // Reset hours to ensure clean day diff
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      if (end < start) return 0;

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      return diffDays;
  }, [startDate, endDate, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalOvertimeUsage: OvertimeUsage[] | undefined = undefined;
    
    if (activeTab === 'overtime' && typeId !== 'overtime_earn') {
        finalOvertimeUsage = Object.entries(usageMap).map(([id, hoursUsed]) => ({
            requestId: id,
            hoursUsed: hoursUsed as number
        }));
    }

    const reqData = { 
        typeId: typeId, 
        startDate, 
        endDate, 
        hours, 
        reason,
        overtimeUsage: finalOvertimeUsage
    };

    if (editingRequest) {
        await store.updateRequest(editingRequest.id, reqData);
    } else {
        // Create request (possibly for target user and with admin status)
        await store.createRequest(reqData, effectiveTargetUser.id, isAdminMode ? adminStatus : RequestStatus.PENDING);
    }
    setIsSubmitting(false);
    onClose();
  };

  const isConsumptionType = activeTab === 'overtime' && typeId !== 'overtime_earn';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
              <h2 className="text-xl font-bold text-slate-800">{editingRequest ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
              {isAdminMode && (
                  <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-1">
                      <UserIcon size={12}/> Creando para: {effectiveTargetUser.name}
                  </p>
              )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
            <button 
                disabled={!!editingRequest}
                onClick={() => { setActiveTab('absence'); if(absenceTypes[0]) setTypeId(absenceTypes[0].id); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'absence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'} ${editingRequest ? 'opacity-50' : ''}`}
            >
                Ausencia
            </button>
            <button 
                disabled={!!editingRequest}
                onClick={() => { setActiveTab('overtime'); setTypeId('overtime_earn'); setUsageMap({}); setHours(0); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overtime' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'} ${editingRequest ? 'opacity-50' : ''}`}
            >
                Horas Extra
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {activeTab === 'absence' && (
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Ausencia</label>
                <select 
                    className="w-full p-3 bg-slate-50 border-slate-200 rounded-xl"
                    value={typeId} 
                    onChange={e => setTypeId(e.target.value)}
                >
                    {absenceTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.label} {t.subtractsDays ? '(Resta días)' : ''}</option>
                    ))}
                </select>
               </div>
           )}

           {activeTab === 'overtime' && (
                <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Acción</label>
                 <select 
                     className="w-full p-3 bg-slate-50 border-slate-200 rounded-xl"
                     value={typeId} 
                     onChange={e => {
                         setTypeId(e.target.value);
                         setUsageMap({});
                         setHours(0);
                     }}
                 >
                     <option value="overtime_earn">Registrar Horas Realizadas</option>
                     <option value="overtime_spend_days">Canjear por Días Libres</option>
                     <option value="overtime_pay">Solicitar Cobro</option>
                 </select>
                </div>
           )}
           
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
               <input 
                 type="date" 
                 required 
                 disabled={isDatesLocked}
                 className={`w-full p-3 border border-slate-200 rounded-xl ${isDatesLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)} 
                />
             </div>
             {activeTab === 'absence' && (
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
                 <input 
                    type="date" 
                    disabled={isDatesLocked}
                    className={`w-full p-3 border border-slate-200 rounded-xl ${isDatesLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                 />
               </div>
             )}
             
             {activeTab === 'overtime' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Horas</label>
                  <input 
                    type="number" step="0.5" required 
                    disabled={isConsumptionType}
                    className={`w-full p-3 border border-slate-200 rounded-xl font-bold ${isConsumptionType ? 'bg-slate-100 text-slate-500' : ''}`} 
                    value={hours} 
                    onChange={e => setHours(parseFloat(e.target.value))} 
                  />
                </div>
             )}
           </div>

           {/* CONTADOR DE DÍAS (SOLO AUSENCIA) */}
           {activeTab === 'absence' && dayCount > 0 && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-center gap-3 animate-scale-in">
                   <div className="bg-white p-2 rounded-full shadow-sm text-blue-600">
                       <CalendarDays size={20} />
                   </div>
                   <div>
                       <p className="text-xs text-blue-600 uppercase font-bold tracking-wide">Duración Total</p>
                       <p className="text-lg font-bold text-slate-800">{dayCount} {dayCount === 1 ? 'día' : 'días'}</p>
                   </div>
               </div>
           )}

           {isConsumptionType && !editingRequest && (
               <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                   <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                       <Clock size={16} className="text-blue-500"/> Selecciona horas a consumir:
                   </h4>
                   {availableOvertime.length === 0 ? (
                       <p className="text-sm text-slate-400 italic">No tienes horas extra aprobadas disponibles.</p>
                   ) : (
                       <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                           {availableOvertime.map(req => {
                               const remaining = (req.hours || 0) - (req.consumedHours || 0);
                               const isSelected = !!usageMap[req.id];
                               
                               return (
                                   <div key={req.id} className={`p-3 bg-white rounded-lg border transition-all ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'}`}>
                                       <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 text-blue-600 rounded"
                                                checked={isSelected}
                                                onChange={(e) => handleUsageChange(req, e.target.checked)}
                                            />
                                            <div className="flex-1 text-xs">
                                                <div className="flex justify-between font-bold text-slate-700">
                                                    <span>{new Date(req.startDate).toLocaleDateString()}</span>
                                                    <span>Disp: {remaining}h</span>
                                                </div>
                                                <div className="italic text-slate-500 truncate">{req.reason || 'Sin motivo'}</div>
                                            </div>
                                       </div>
                                       
                                       {isSelected && (
                                           <div className="mt-2 flex items-center gap-2 animate-fade-in">
                                               <label className="text-xs text-slate-500">Usar:</label>
                                               <input 
                                                    type="number" 
                                                    min="0.5" 
                                                    max={remaining} 
                                                    step="0.5"
                                                    value={usageMap[req.id]}
                                                    onChange={(e) => handleUsageChange(req, true, parseFloat(e.target.value))}
                                                    className="w-16 p-1 text-center text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                               />
                                               <span className="text-xs text-slate-400">horas</span>
                                           </div>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   )}
               </div>
           )}
           
           {isConsumptionType && editingRequest && (
               <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-xs text-yellow-700">
                   Nota: Para modificar los registros de origen de un canje de horas, por favor elimina la solicitud y crea una nueva.
               </div>
           )}
            
           {isDatesLocked && <p className="text-xs text-orange-600 flex items-center gap-1"><Clock size={12}/> Este tipo de ausencia tiene fechas fijas obligatorias.</p>}

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (Opcional)</label>
              <textarea className="w-full p-3 border border-slate-200 rounded-xl h-24" value={reason} onChange={e => setReason(e.target.value)} placeholder="Añade contexto..." />
           </div>

           {isAdminMode && !editingRequest && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <label className="block text-sm font-bold text-blue-800 mb-2">Estado Inicial (Admin)</label>
                   <div className="flex gap-4">
                       <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                           <input 
                                type="radio" 
                                name="status" 
                                value={RequestStatus.PENDING}
                                checked={adminStatus === RequestStatus.PENDING}
                                onChange={() => setAdminStatus(RequestStatus.PENDING)}
                           />
                           Pendiente de Aprobar
                       </label>
                       <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                           <input 
                                type="radio" 
                                name="status" 
                                value={RequestStatus.APPROVED}
                                checked={adminStatus === RequestStatus.APPROVED}
                                onChange={() => setAdminStatus(RequestStatus.APPROVED)}
                           />
                           <span className="font-bold text-green-600">Aprobada Directamente</span>
                       </label>
                   </div>
                   {adminStatus === RequestStatus.APPROVED && (
                       <p className="text-xs text-green-600 mt-2">
                           * Al crearla como aprobada, se descontarán los días/horas del saldo del usuario inmediatamente.
                       </p>
                   )}
               </div>
           )}

           <button type="submit" disabled={(isConsumptionType && hours === 0) || isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2">
             {isSubmitting && <Loader2 className="animate-spin"/>}
             {editingRequest ? 'Guardar Cambios' : isAdminMode ? 'Crear Solicitud (Admin)' : 'Enviar Solicitud'} {hours > 0 ? `(${hours}h)` : ''}
           </button>
        </form>
      </div>
    </div>
  );
};

export default RequestFormModal;
