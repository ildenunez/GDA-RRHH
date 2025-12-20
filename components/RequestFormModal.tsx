
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, OvertimeUsage, RequestStatus, Role, RequestType } from '../types';
import { store } from '../services/store';
import { X, Clock, Loader2, User as UserIcon, CalendarDays, Gift, Archive, FileWarning } from 'lucide-react';

interface RequestFormModalProps {
  onClose: () => void;
  user: User;
  targetUser?: User;
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
  const [adminStatus, setAdminStatus] = useState<RequestStatus>(RequestStatus.PENDING);
  const [availableOvertime, setAvailableOvertime] = useState<LeaveRequest[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

  const effectiveTargetUser = targetUser || user;
  const isManagerMode = (user.role === Role.ADMIN || user.role === Role.SUPERVISOR);
  const isAdminCreatingForOther = !!targetUser && targetUser.id !== user.id;

  const absenceTypes = store.config.leaveTypes;

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

  useEffect(() => {
      if (!editingRequest) {
        if (activeTab === 'absence' && absenceTypes.length > 0 && !typeId) {
            setTypeId(absenceTypes[0].id);
        } else if (activeTab === 'overtime') {
            if (!typeId) setTypeId(RequestType.OVERTIME_EARN);
        }
      }
      if (activeTab === 'overtime') {
          const realRecords = store.getAvailableOvertimeRecords(effectiveTargetUser.id);
          const totalTraceable = realRecords.reduce((sum, r) => sum + ((r.hours || 0) - (r.consumedHours || 0)), 0);
          const totalBalance = effectiveTargetUser.overtimeHours;
          const untracedBalance = Math.max(0, totalBalance - totalTraceable);

          let recordsToShow = [...realRecords];
          if (untracedBalance > 0.01) { 
              recordsToShow.push({
                  id: 'historical_balance',
                  userId: effectiveTargetUser.id,
                  typeId: 'historico',
                  label: 'Saldo Histórico / Ajustes',
                  startDate: new Date().toISOString(),
                  hours: untracedBalance,
                  consumedHours: 0,
                  status: RequestStatus.APPROVED,
                  createdAt: new Date().toISOString(),
                  reason: 'Saldo acumulado anterior o ajustes manuales',
                  isConsumed: false
              } as LeaveRequest);
          }
          setAvailableOvertime(recordsToShow);
      }
  }, [activeTab, editingRequest, effectiveTargetUser]);

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

  const handleUsageChange = (req: LeaveRequest, isChecked: boolean, customAmount?: number) => {
      const remaining = (req.hours || 0) - (req.consumedHours || 0);
      const newMap: Record<string, number> = { ...usageMap };
      if (!isChecked) delete newMap[req.id];
      else newMap[req.id] = customAmount !== undefined ? customAmount : remaining;
      setUsageMap(newMap);
      const total = Object.values(newMap).reduce((sum: number, val: number) => sum + val, 0);
      setHours(total);
  };

  const dayCount = useMemo(() => {
      if (activeTab !== 'absence' || !startDate) return 0;
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : start;
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      if (end < start) return 0;
      return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalOvertimeUsage: OvertimeUsage[] | undefined = undefined;
    if (activeTab === 'overtime' && ![RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(typeId as RequestType)) {
        finalOvertimeUsage = Object.entries(usageMap)
            .filter(([id]) => id !== 'historical_balance')
            .map(([id, hoursUsed]) => ({ requestId: id, hoursUsed: hoursUsed as number }));
    }
    const reqData = { typeId, startDate, endDate, hours, reason, overtimeUsage: finalOvertimeUsage, isJustified: false, reportedToAdmin: false };
    if (editingRequest) await store.updateRequest(editingRequest.id, reqData);
    else await store.createRequest(reqData, effectiveTargetUser.id, isManagerMode && typeId === RequestType.UNJUSTIFIED ? RequestStatus.APPROVED : (isManagerMode && isAdminCreatingForOther ? adminStatus : RequestStatus.PENDING));
    setIsSubmitting(false);
    onClose();
  };

  const isConsumptionType = activeTab === 'overtime' && ![RequestType.OVERTIME_EARN, RequestType.WORKED_HOLIDAY].includes(typeId as RequestType);
  const isWorkedHoliday = typeId === RequestType.WORKED_HOLIDAY;
  const isUnjustified = typeId === RequestType.UNJUSTIFIED;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
              <h2 className="text-xl font-bold text-slate-800">{editingRequest ? 'Editar Registro' : 'Nueva Solicitud / Registro'}</h2>
              {isManagerMode && effectiveTargetUser.id !== user.id && (
                  <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-1"><UserIcon size={12}/> Empleado: {effectiveTargetUser.name}</p>
              )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="flex mb-6 bg-slate-100 p-1 rounded-xl">
            <button disabled={!!editingRequest} onClick={() => { setActiveTab('absence'); if(absenceTypes[0]) setTypeId(absenceTypes[0].id); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'absence' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Ausencia</button>
            <button disabled={!!editingRequest} onClick={() => { setActiveTab('overtime'); setTypeId(RequestType.OVERTIME_EARN); setUsageMap({}); setHours(0); }} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overtime' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Gestión Horas</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {activeTab === 'absence' && (
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Registro</label>
                <select className="w-full p-3 bg-slate-50 border-slate-200 rounded-xl" value={typeId} onChange={e => setTypeId(e.target.value)}>
                    {absenceTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    {isManagerMode && <option value={RequestType.UNJUSTIFIED} className="text-orange-600 font-bold">⚠️ Ausencia Justificable</option>}
                </select>
               </div>
           )}

           {activeTab === 'overtime' && (
                <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Acción</label>
                 <select className="w-full p-3 bg-slate-50 border-slate-200 rounded-xl" value={typeId} onChange={e => { setTypeId(e.target.value); setUsageMap({}); setHours(0); }}>
                     <option value={RequestType.OVERTIME_EARN}>Registrar Horas Realizadas</option>
                     <option value={RequestType.WORKED_HOLIDAY}>Festivo Trabajado (+1 día / +4h)</option>
                     <option value={RequestType.OVERTIME_SPEND_DAYS}>Canjear por Días Libres</option>
                     <option value={RequestType.OVERTIME_PAY}>Abono en Nómina</option>
                 </select>
                </div>
           )}
           
           <div className="grid grid-cols-2 gap-4">
             <div className={`${(isWorkedHoliday || isUnjustified) ? 'col-span-2' : ''}`}>
               <label className="block text-sm font-medium text-slate-700 mb-1">Fecha {isUnjustified ? 'de la Falta' : 'Inicio'}</label>
               <input type="date" required disabled={isDatesLocked} className={`w-full p-3 border border-slate-200 rounded-xl ${isDatesLocked ? 'bg-slate-100' : ''}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
             </div>
             {activeTab === 'absence' && !isUnjustified && (
               <div><label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label><input type="date" disabled={isDatesLocked} className={`w-full p-3 border border-slate-200 rounded-xl ${isDatesLocked ? 'bg-slate-100' : ''}`} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
             )}
             {activeTab === 'overtime' && !isWorkedHoliday && (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Total Horas</label><input type="number" step="0.5" required disabled={isConsumptionType} className="w-full p-3 border border-slate-200 rounded-xl font-bold" value={hours} onChange={e => setHours(parseFloat(e.target.value))} /></div>
             )}
           </div>

           {isUnjustified && (
               <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
                   <div className="bg-white p-2 rounded-full shadow-sm text-orange-600"><FileWarning size={24} /></div>
                   <div>
                       <p className="text-xs text-orange-700 uppercase font-bold">Control de Justificantes</p>
                       <p className="text-sm font-medium text-slate-800">Este registro se crea como <strong>Ausencia Justificable</strong>. Aparecerá en el panel de control de mandos.</p>
                   </div>
               </div>
           )}

           {activeTab === 'absence' && !isUnjustified && dayCount > 0 && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-center gap-3"><CalendarDays size={20} className="text-blue-600"/><div><p className="text-xs text-blue-600 font-bold uppercase">Duración</p><p className="text-lg font-bold text-slate-800">{dayCount} {dayCount === 1 ? 'día' : 'días'}</p></div></div>
           )}

           {isConsumptionType && !editingRequest && (
               <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                   <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Consumir horas de:</h4>
                   <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                       {availableOvertime.map(req => {
                           const remaining = (req.hours || 0) - (req.consumedHours || 0);
                           const isSelected = !!usageMap[req.id];
                           return (
                               <div key={req.id} className={`p-3 bg-white rounded-lg border ${isSelected ? 'border-blue-400 ring-1 ring-blue-100' : 'border-slate-200'}`}><div className="flex items-center gap-3"><input type="checkbox" checked={isSelected} onChange={(e) => handleUsageChange(req, e.target.checked)} className="w-4 h-4 text-blue-600" /><div className="flex-1 text-xs"><div className="flex justify-between font-bold text-slate-700"><span>{req.id === 'historical_balance' ? 'Saldo Histórico' : new Date(req.startDate).toLocaleDateString()}</span><span>Disp: {remaining.toFixed(1)}h</span></div><div className="italic text-slate-500 truncate">{req.reason || 'Sin motivo'}</div></div></div>{isSelected && (<div className="mt-2 flex items-center gap-2"><label className="text-xs text-slate-500">Horas:</label><input type="number" min="0.5" max={remaining} step="0.5" value={usageMap[req.id]} onChange={(e) => handleUsageChange(req, true, parseFloat(e.target.value))} className="w-16 p-1 border rounded" /></div>)}</div>
                           );
                       })}
                   </div>
               </div>
           )}

           <div><label className="block text-sm font-medium text-slate-700 mb-1">Motivo / Notas</label><textarea className="w-full p-3 border border-slate-200 rounded-xl h-24" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: No se presenta a su turno, comunica indisposición por teléfono..." /></div>

           {isManagerMode && !editingRequest && !isUnjustified && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                   <label className="block text-sm font-bold text-blue-800 mb-2">Estado Inicial</label>
                   <div className="flex gap-4">
                       <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name="status" checked={adminStatus === RequestStatus.PENDING} onChange={() => setAdminStatus(RequestStatus.PENDING)} /> Pendiente</label>
                       <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name="status" checked={adminStatus === RequestStatus.APPROVED} onChange={() => setAdminStatus(RequestStatus.APPROVED)} /> <span className="font-bold text-green-600">Aprobar Directo</span></label>
                   </div>
               </div>
           )}

           <button type="submit" disabled={(isConsumptionType && hours === 0) || isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md flex justify-center gap-2 disabled:opacity-50">
             {isSubmitting && <Loader2 className="animate-spin"/>} {editingRequest ? 'Guardar Cambios' : 'Crear Registro'}
           </button>
        </form>
      </div>
    </div>
  );
};

export default RequestFormModal;
