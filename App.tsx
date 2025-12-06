
import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { User, Role, LeaveTypeConfig, Department, LeaveRequest, OvertimeUsage, EmailTemplate } from './types';
import Dashboard from './components/Dashboard';
import { Approvals, UserManagement } from './components/Management';
import CalendarView from './components/CalendarView';
import RequestDetailModal from './components/RequestDetailModal';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  Users as UsersIcon, 
  Settings, 
  LogOut, 
  Menu, 
  Bell,
  Plus,
  X,
  Trash,
  UserPlus,
  Building,
  CheckSquare,
  Square,
  Edit2,
  Info,
  Mail,
  Save,
  Loader2
} from 'lucide-react';

// --- Componente Login ---
const Login = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        // Asegurar que el store está hidratado desde Supabase
        await store.init();
        const user = await store.login(email, pass);
        
        if (user) {
            onLogin(user);
        } else {
            setError('Credenciales inválidas. Verifica tu email/contraseña.');
        }
    } catch (e) {
        setError('Error de conexión con la base de datos.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">AbsenceFlow</h1>
          <p className="text-slate-500">Gestión Profesional de Ausencias</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="admin@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
           Demo: ilde (androideilde@gmail.com) / 8019
        </div>
      </div>
    </div>
  );
};

// --- Modal de Nueva/Editar Solicitud ---
const RequestModal = ({ onClose, user, initialTab = 'absence', editingRequest }: { onClose: () => void, user: User, initialTab?: 'absence' | 'overtime', editingRequest?: LeaveRequest | null }) => {
  const [activeTab, setActiveTab] = useState<'absence' | 'overtime'>(initialTab);
  const [typeId, setTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hours, setHours] = useState(0);
  const [reason, setReason] = useState('');
  const [isDatesLocked, setIsDatesLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Trazabilidad (Partial Usage)
  const [availableOvertime, setAvailableOvertime] = useState<LeaveRequest[]>([]);
  // Mapa de { id_solicitud : horas_a_usar }
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});

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
          setAvailableOvertime(store.getAvailableOvertimeRecords(user.id));
      }
  }, [activeTab, editingRequest]);

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
  }, [typeId, activeTab]);

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
        await store.createRequest(reqData);
    }
    setIsSubmitting(false);
    onClose();
  };

  const isConsumptionType = activeTab === 'overtime' && typeId !== 'overtime_earn';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">{editingRequest ? 'Editar Solicitud' : 'Nueva Solicitud'}</h2>
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
               <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
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

           <button type="submit" disabled={(isConsumptionType && hours === 0) || isSubmitting} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2">
             {isSubmitting && <Loader2 className="animate-spin"/>}
             {editingRequest ? 'Guardar Cambios' : 'Enviar Solicitud'} {hours > 0 ? `(${hours}h)` : ''}
           </button>
        </form>
      </div>
    </div>
  );
};

// --- Department Modal (Sin cambios) ---
const DepartmentModal = ({ onClose, dept, onSave }: { onClose: () => void, dept?: Department, onSave: (d: Department) => void }) => {
    const [name, setName] = useState(dept?.name || '');
    const [supervisorIds, setSupervisorIds] = useState<string[]>(dept?.supervisorIds || []);
    const eligibleSupervisors = store.getAllUsers().filter(u => u.role === Role.SUPERVISOR || u.role === Role.ADMIN);

    const toggleSupervisor = (userId: string) => {
        if (supervisorIds.includes(userId)) setSupervisorIds(supervisorIds.filter(id => id !== userId));
        else setSupervisorIds([...supervisorIds, userId]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: dept?.id || Math.random().toString(36).substr(2, 9), name, supervisorIds });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Building className="text-blue-600"/> {dept ? 'Editar Departamento' : 'Nuevo Departamento'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre</label>
                        <input type="text" required className="w-full p-2.5 border border-slate-200 rounded-lg" placeholder="Ej: Marketing" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Asignar Supervisores</label>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                            {eligibleSupervisors.map(user => (
                                <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer" onClick={() => toggleSupervisor(user.id)}>
                                    <div className={`text-blue-600`}>{supervisorIds.includes(user.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300"/>}</div>
                                    <div className="flex-1"><p className="text-sm font-medium text-slate-700">{user.name}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Admin Settings Component ---
const AdminSettings = ({ onViewRequest }: { onViewRequest: (req: LeaveRequest) => void }) => {
    const [config, setConfig] = useState(store.config);
    const [departments, setDepartments] = useState(store.departments);
    const [newType, setNewType] = useState<Partial<LeaveTypeConfig>>({ label: '', subtractsDays: true, fixedRange: null });
    const [showRangeInputs, setShowRangeInputs] = useState(false);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | undefined>(undefined);
    const [subTab, setSubTab] = useState<'general' | 'absences' | 'users' | 'departments' | 'communications'>('users');
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

    useEffect(() => {
        if(config.emailTemplates.length > 0 && !selectedTemplate) {
            setSelectedTemplate(config.emailTemplates[0]);
        }
    }, [config]);

    const handleSaveType = () => {
        if (!newType.label) return;
        const typeData = { 
            id: editingTypeId || newType.label.toLowerCase().replace(/\s+/g, '_'),
            label: newType.label, 
            subtractsDays: newType.subtractsDays || false, 
            fixedRange: showRangeInputs ? newType.fixedRange : null 
        };
        editingTypeId ? store.updateLeaveType(typeData as LeaveTypeConfig) : store.addLeaveType(typeData as LeaveTypeConfig);
        setConfig({...store.config}); resetTypeForm();
    };
    
    const resetTypeForm = () => { setNewType({ label: '', subtractsDays: true, fixedRange: null }); setShowRangeInputs(false); setEditingTypeId(null); };
    const handleEditType = (type: LeaveTypeConfig) => { setNewType({ ...type }); setShowRangeInputs(!!type.fixedRange); setEditingTypeId(type.id); };
    const handleDeleteType = (id: string) => { if(confirm('¿Borrar?')) { store.removeLeaveType(id); setConfig({...store.config}); }};

    const handleSaveDepartment = (dept: Department) => { editingDept ? store.updateDepartment(dept) : store.addDepartment(dept); setDepartments([...store.departments]); setEditingDept(undefined); };
    const handleDeleteDepartment = (id: string) => { if(confirm('¿Borrar departamento?')) { store.removeDepartment(id); setDepartments([...store.departments]); }};

    const handleSaveTemplate = () => {
        if (selectedTemplate) {
            store.updateEmailTemplate(selectedTemplate);
            setConfig({...store.config});
            alert('Plantilla guardada correctamente');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                 <Settings className="text-slate-500"/> <h2 className="text-xl font-bold text-slate-800">Administración</h2>
            </div>
            <div className="flex border-b border-slate-100 overflow-x-auto">
                {['users', 'departments', 'absences', 'communications'].map(tab => (
                    <button key={tab} onClick={() => setSubTab(tab as any)} className={`px-6 py-3 text-sm font-medium border-b-2 capitalize transition-colors whitespace-nowrap ${subTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>
                        {tab === 'users' ? 'Usuarios' : tab === 'departments' ? 'Departamentos' : tab === 'absences' ? 'Tipos Ausencia' : 'Comunicaciones'}
                    </button>
                ))}
            </div>
            <div className="p-6 flex-1">
                {subTab === 'users' && <UserManagement currentUser={store.currentUser!} onViewRequest={onViewRequest} />}
                {subTab === 'departments' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800">Departamentos</h3><button onClick={() => {setEditingDept(undefined); setIsDeptModalOpen(true);}} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Nuevo</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{departments.map(dept => (<div key={dept.id} className="bg-slate-50 border p-5 rounded-xl"><div className="flex justify-between mb-3"><h4 className="font-bold">{dept.name}</h4><div className="flex gap-1"><button onClick={() => {setEditingDept(dept); setIsDeptModalOpen(true);}} className="text-blue-500 p-1"><Settings size={16}/></button><button onClick={() => handleDeleteDepartment(dept.id)} className="text-red-500 p-1"><Trash size={16}/></button></div></div><p className="text-xs text-slate-400">{store.getUsersByDepartment(dept.id).length} empleados</p></div>))}</div>
                        {isDeptModalOpen && <DepartmentModal onClose={() => setIsDeptModalOpen(false)} dept={editingDept} onSave={handleSaveDepartment} />}
                    </div>
                )}
                {subTab === 'absences' && (
                    <div className="space-y-8">
                        <div className="grid gap-4">{config.leaveTypes.map(type => (<div key={type.id} className="flex justify-between p-4 border rounded-lg bg-slate-50"><div><p className="font-bold">{type.label}</p><span className="text-xs text-slate-500">{type.subtractsDays ? 'Resta Días' : 'No Resta'}</span></div><div className="flex gap-2"><button onClick={() => handleEditType(type)} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteType(type.id)} className="text-red-400"><Trash size={18}/></button></div></div>))}</div>
                        <div className="bg-slate-50 p-6 rounded-xl border"><h3 className="font-bold mb-4">{editingTypeId ? 'Editar' : 'Crear'} Tipo</h3><div className="grid md:grid-cols-2 gap-4 mb-4"><div><label className="text-sm">Nombre</label><input className="w-full p-2 border rounded" value={newType.label} onChange={e => setNewType({...newType, label: e.target.value})}/></div><div className="flex items-center pt-6"><label className="flex gap-2"><input type="checkbox" checked={newType.subtractsDays} onChange={e => setNewType({...newType, subtractsDays: e.target.checked})}/> Resta días</label></div></div><label className="flex gap-2 mb-2"><input type="checkbox" checked={showRangeInputs} onChange={e => setShowRangeInputs(e.target.checked)}/> Fechas Fijas</label>{showRangeInputs && <div className="grid grid-cols-2 gap-4 mb-4"><input type="date" className="p-2 border rounded" value={newType.fixedRange?.startDate || ''} onChange={e => setNewType({...newType, fixedRange: {...(newType.fixedRange || {}), startDate: e.target.value} as any})}/><input type="date" className="p-2 border rounded" value={newType.fixedRange?.endDate || ''} onChange={e => setNewType({...newType, fixedRange: {...(newType.fixedRange || {}), endDate: e.target.value} as any})}/></div>}<button onClick={handleSaveType} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">{editingTypeId ? 'Actualizar' : 'Añadir'}</button></div>
                    </div>
                )}
                {subTab === 'communications' && (
                    <div className="flex flex-col md:flex-row gap-6 h-full">
                        <div className="w-full md:w-1/3 border-r border-slate-100 pr-4 space-y-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Mail size={18}/> Plantillas de Email</h3>
                            {config.emailTemplates.map(tpl => (
                                <button key={tpl.id} onClick={() => setSelectedTemplate({...tpl})} className={`w-full text-left p-3 rounded-lg text-sm transition-all ${selectedTemplate?.id === tpl.id ? 'bg-blue-50 text-blue-700 border border-blue-100 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>{tpl.label}</button>
                            ))}
                        </div>
                        <div className="w-full md:w-2/3 pl-2">
                             {selectedTemplate ? (
                                 <div className="space-y-4 animate-fade-in">
                                     <div className="flex justify-between items-center pb-2 border-b border-slate-100"><h4 className="font-bold text-slate-800">{selectedTemplate.label}</h4><button onClick={handleSaveTemplate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"><Save size={16}/> Guardar</button></div>
                                     <div><label className="block text-sm font-semibold text-slate-700 mb-1">Asunto</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={selectedTemplate.subject} onChange={e => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}/></div>
                                     <div><label className="block text-sm font-semibold text-slate-700 mb-1">Cuerpo del Mensaje</label><textarea className="w-full p-2 border border-slate-200 rounded-lg h-40 font-mono text-sm" value={selectedTemplate.body} onChange={e => setSelectedTemplate({...selectedTemplate, body: e.target.value})}/><p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Info size={12}/> Variables disponibles: {'{nombre}, {tipo}, {fechas}, {empleado}'}</p></div>
                                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h5 className="text-sm font-bold text-slate-700 mb-3">Destinatarios Automáticos</h5><div className="flex gap-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={selectedTemplate.recipients.worker} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, worker: e.target.checked}})}/><span className="text-sm text-slate-600">Empleado</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={selectedTemplate.recipients.supervisor} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, supervisor: e.target.checked}})}/><span className="text-sm text-slate-600">Supervisor(es)</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={selectedTemplate.recipients.admin} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, admin: e.target.checked}})}/><span className="text-sm text-slate-600">Admin</span></label></div></div>
                                 </div>
                             ) : <div className="h-full flex items-center justify-center text-slate-400">Selecciona una plantilla para editar</div>}
                        </div>
                    </div>
                )}
                {subTab === 'general' && <div className="p-4 text-center text-slate-500">Configuración SMTP Mockeada</div>}
            </div>
        </div>
    );
}

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'absence' | 'overtime'>('absence');
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<LeaveRequest | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000); 
    return () => clearInterval(interval);
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  const isSupervisor = user.role === Role.SUPERVISOR || user.role === Role.ADMIN;
  const isAdmin = user.role === Role.ADMIN;
  const pendingCount = isSupervisor ? store.getPendingApprovalsForUser(user.id).length : 0;

  const handleViewRequest = (req: LeaveRequest) => {
      setViewingRequest(req);
  };

  const NavItem = ({ id, icon: Icon, label, badgeCount }: any) => (
    <button
      onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-blue-500/30 shadow-lg' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center space-x-3">
          <Icon size={20} />
          <span className="font-medium">{label}</span>
      </div>
      {badgeCount > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
              {badgeCount}
          </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">A</div>
            <span className="text-xl font-bold tracking-tight">AbsenceFlow</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400"><X/></button>
        </div>

        <nav className="px-4 space-y-2 mt-4">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Panel" />
          <NavItem id="calendar" icon={CalendarDays} label="Calendario" />
          {(isSupervisor) && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión</div>
              <NavItem id="approvals" icon={ShieldCheck} label="Aprobaciones" badgeCount={pendingCount} />
              <NavItem id="team" icon={UsersIcon} label="Mi Equipo" />
            </>
          )}
          {(isAdmin) && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</div>
              <NavItem id="settings" icon={Settings} label="Administración" />
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-600" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors text-slate-300">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-30">
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-slate-600"><Menu/></button>
          <h2 className="text-lg font-semibold text-slate-800 capitalize">{activeTab === 'settings' ? 'Administración' : activeTab === 'team' ? 'Mi Equipo' : activeTab}</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => {setModalInitialTab('absence'); setEditingRequest(null); setShowRequestModal(true);}} className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={16} /> Nueva Solicitud</button>
            <div className="relative cursor-pointer group"><Bell className="text-slate-400 group-hover:text-slate-600" />{store.notifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
           {activeTab === 'dashboard' && <Dashboard user={user} onNewRequest={(type) => {setModalInitialTab(type); setEditingRequest(null); setShowRequestModal(true);}} onEditRequest={(req) => { setEditingRequest(req); setShowRequestModal(true); }} onViewRequest={handleViewRequest} />}
           {activeTab === 'calendar' && <CalendarView user={user} />}
           {activeTab === 'approvals' && isSupervisor && <Approvals user={user} onViewRequest={handleViewRequest} />}
           {activeTab === 'team' && isSupervisor && <UserManagement currentUser={user} onViewRequest={handleViewRequest} />}
           {activeTab === 'settings' && isAdmin && <AdminSettings onViewRequest={handleViewRequest} />}
        </div>
        
        {showRequestModal && <RequestModal onClose={() => setShowRequestModal(false)} user={user} initialTab={modalInitialTab} editingRequest={editingRequest} />}
        {viewingRequest && <RequestDetailModal request={viewingRequest} onClose={() => setViewingRequest(null)} />}
      </main>
    </div>
  );
}
