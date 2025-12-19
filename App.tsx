
import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { User, Role, LeaveTypeConfig, Department, LeaveRequest, OvertimeUsage, EmailTemplate, ShiftType, ShiftSegment, Holiday, PPEType } from './types';
import Dashboard from './components/Dashboard';
import { Approvals, UserManagement, UpcomingAbsences } from './components/Management';
import CalendarView from './components/CalendarView';
import NotificationsView from './components/NotificationsView';
import ProfileView from './components/ProfileView';
import RequestDetailModal from './components/RequestDetailModal';
import RequestFormModal from './components/RequestFormModal';
import HelpView from './components/HelpView';
import PPEView from './components/PPEView';
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
  Loader2,
  Lock,
  ArrowRight,
  Send,
  Server,
  MessageSquare,
  Search,
  UserCircle,
  HelpCircle,
  HardHat,
  CalendarClock,
  Zap,
  CheckCircle
} from 'lucide-react';

const LOGO_URL = "https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png";

// --- Componente Login WOW ---
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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 transform scale-105"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")' }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-blue-900/80 via-slate-900/80 to-purple-900/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md p-8 m-4 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 animate-fade-in-up">
        
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-lg mx-auto mb-6 flex items-center justify-center p-4 transform hover:scale-105 transition-transform duration-300">
             <img src={LOGO_URL} alt="GdA RRHH" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">GdA <span className="text-blue-600">RRHH</span></h1>
          <p className="text-slate-500 font-medium mt-2">Portal del Empleado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UsersIcon className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               </div>
               <input 
                 type="email" 
                 required
                 className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                 placeholder="Correo corporativo"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
               />
            </div>
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
               </div>
               <input 
                 type="password" 
                 required
                 className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                 placeholder="Contraseña de acceso"
                 value={pass}
                 onChange={e => setPass(e.target.value)}
               />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm animate-pulse">
                <Info size={16}/> {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin"/> : <>Entrar al Portal <ArrowRight size={18}/></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
             <p className="text-xs text-slate-400 font-medium">© {new Date().getFullYear()} GdA RRHH Solutions</p>
        </div>
      </div>
    </div>
  );
};

// --- Department Modal ---
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
    const [subTab, setSubTab] = useState<'general' | 'absences' | 'users' | 'departments' | 'communications' | 'epis'>('users');
    
    // Shifts State
    const [newShift, setNewShift] = useState<Partial<ShiftType>>({ name: '', color: '#3b82f6', segments: [{start: '09:00', end: '14:00'}] });
    const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

    // Holidays State
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
    const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);

    // EPIS State
    const [newPPE, setNewPPE] = useState({ name: '', sizesStr: '' });

    // Communications Sub-Tabs
    const [commTab, setCommTab] = useState<'templates' | 'smtp' | 'message'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [smtpConfig, setSmtpConfig] = useState(store.config.smtpSettings);
    const [testEmail, setTestEmail] = useState('');
    const [isTestingSmtp, setIsTestingSmtp] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Mass Message State
    const [massMessage, setMassMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState<'all' | 'selection'>('all');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleSaveSmtp = async () => {
        setSaveLoading(true);
        try {
            await store.updateSmtpSettings(smtpConfig);
            alert('Configuración SMTP guardada permanentemente en la base de datos.');
        } catch (e) {
            alert('Error al guardar la configuración.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleTestSmtp = async () => {
        if (!testEmail || !testEmail.includes('@')) return alert('Introduce un email de destino válido.');
        setIsTestingSmtp(true);
        try {
            const success = await store.sendTestEmail(testEmail);
            if (success) {
                alert(`¡Éxito! Se ha enviado un email de prueba a ${testEmail}. Por favor, revisa la bandeja de entrada.`);
            }
        } catch (e) {
            alert('Error al realizar la prueba de envío.');
        } finally {
            setIsTestingSmtp(false);
        }
    };

    const handleSendMassMessage = async () => {
        if (!massMessage.trim()) return alert('Escribe un mensaje');
        const recipients = targetAudience === 'all' ? store.users.map(u => u.id) : selectedUserIds;
        if (recipients.length === 0) return alert('Selecciona al menos un destinatario');
        
        await store.sendMassNotification(recipients, massMessage);
        alert(`Mensaje enviado a ${recipients.length} usuarios.`);
        setMassMessage('');
        setSelectedUserIds([]);
    };

    const toggleUserSelection = (id: string) => {
        if (selectedUserIds.includes(id)) setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
        else setSelectedUserIds([...selectedUserIds, id]);
    };

    // --- SHIFTS HANDLERS ---
    const handleAddShiftSegment = () => {
        setNewShift({ ...newShift, segments: [...(newShift.segments || []), { start: '', end: '' }] });
    };

    const handleUpdateShiftSegment = (idx: number, field: keyof ShiftSegment, val: string) => {
        const segments = [...(newShift.segments || [])];
        segments[idx] = { ...segments[idx], [field]: val };
        setNewShift({ ...newShift, segments });
    };

    const handleRemoveShiftSegment = (idx: number) => {
        const segments = [...(newShift.segments || [])];
        segments.splice(idx, 1);
        setNewShift({ ...newShift, segments });
    };

    const handleSaveShift = async () => {
        if (!newShift.name) return;
        const shiftData: ShiftType = {
            id: editingShiftId || newShift.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
            name: newShift.name,
            color: newShift.color || '#3b82f6',
            segments: newShift.segments?.filter(s => s.start && s.end) || []
        };
        
        if (editingShiftId) await store.updateShiftType(shiftData);
        else await store.addShiftType(shiftData);

        setConfig({...store.config});
        setNewShift({ name: '', color: '#3b82f6', segments: [{start: '09:00', end: '14:00'}] });
        setEditingShiftId(null);
    };

    const handleDeleteShift = async (id: string) => {
        if (confirm('¿Borrar tipo de turno?')) {
            await store.deleteShiftType(id);
            setConfig({...store.config});
        }
    };

    const handleEditShift = (shift: ShiftType) => {
        setNewShift({ ...shift });
        setEditingShiftId(shift.id);
    };

    // --- HOLIDAYS HANDLERS ---
    const handleAddHoliday = async () => {
        if (!newHoliday.date || !newHoliday.name) return;
        await store.addHoliday(newHoliday.date, newHoliday.name);
        setConfig({...store.config});
        setNewHoliday({ date: '', name: '' });
    };

    const handleEditHoliday = (holiday: Holiday) => {
        setNewHoliday({ date: holiday.date, name: holiday.name });
        setEditingHolidayId(holiday.id);
    };

    const handleUpdateHoliday = async () => {
        if (!editingHolidayId || !newHoliday.date || !newHoliday.name) return;
        await store.updateHoliday(editingHolidayId, newHoliday.date, newHoliday.name);
        setConfig({...store.config});
        setNewHoliday({ date: '', name: '' });
        setEditingHolidayId(null);
    };

    const handleCancelEditHoliday = () => {
        setNewHoliday({ date: '', name: '' });
        setEditingHolidayId(null);
    };

    const handleDeleteHoliday = async (id: string) => {
        if (confirm('¿Borrar festivo?')) {
            await store.deleteHoliday(id);
            setConfig({...store.config});
        }
    };

    // --- PPE HANDLERS ---
    const handleAddPPE = async () => {
        if (!newPPE.name || !newPPE.sizesStr) return;
        const sizes = newPPE.sizesStr.split(',').map(s => s.trim()).filter(s => s);
        await store.addPPEType({ name: newPPE.name, sizes });
        setConfig({...store.config});
        setNewPPE({ name: '', sizesStr: '' });
    };

    const handleDeletePPE = async (id: string) => {
        if(confirm('¿Borrar tipo de EPI?')) {
            await store.deletePPEType(id);
            setConfig({...store.config});
        }
    };


    const filteredUsers = store.users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                 <Settings className="text-slate-500"/> <h2 className="text-xl font-bold text-slate-800">Administración</h2>
            </div>
            <div className="flex border-b border-slate-100 overflow-x-auto">
                {['users', 'departments', 'absences', 'epis', 'communications'].map(tab => (
                    <button key={tab} onClick={() => setSubTab(tab as any)} className={`px-6 py-3 text-sm font-medium border-b-2 capitalize transition-colors whitespace-nowrap ${subTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>
                        {tab === 'users' ? 'Usuarios' : tab === 'departments' ? 'Departamentos' : tab === 'absences' ? 'Configuración RRHH' : tab === 'epis' ? 'EPIs' : 'Comunicaciones'}
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Tipos de Ausencia</h3>
                            <div className="grid gap-4">{config.leaveTypes.map(type => (<div key={type.id} className="flex justify-between p-4 border rounded-lg bg-slate-50"><div><p className="font-bold">{type.label}</p><span className="text-xs text-slate-500">{type.subtractsDays ? 'Resta Días' : 'No Resta'}</span></div><div className="flex gap-2"><button onClick={() => handleEditType(type)} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteType(type.id)} className="text-red-400"><Trash size={18}/></button></div></div>))}</div>
                            <div className="bg-slate-50 p-6 rounded-xl border"><h4 className="font-bold mb-4 text-sm uppercase">{editingTypeId ? 'Editar' : 'Crear'} Tipo</h4><div className="grid md:grid-cols-2 gap-4 mb-4"><div><label className="text-sm">Nombre</label><input className="w-full p-2 border rounded" value={newType.label} onChange={e => setNewType({...newType, label: e.target.value})}/></div><div className="flex items-center pt-6"><label className="flex gap-2"><input type="checkbox" checked={newType.subtractsDays} onChange={e => setNewType({...newType, subtractsDays: e.target.checked})}/> Resta días</label></div></div><label className="flex gap-2 mb-2"><input type="checkbox" checked={showRangeInputs} onChange={e => setShowRangeInputs(e.target.checked)}/> Fechas Fijas</label>{showRangeInputs && <div className="grid grid-cols-2 gap-4 mb-4"><input type="date" className="p-2 border rounded" value={newType.fixedRange?.startDate || ''} onChange={e => setNewType({...newType, fixedRange: {...(newType.fixedRange || {}), startDate: e.target.value} as any})}/><input type="date" className="p-2 border rounded" value={newType.fixedRange?.endDate || ''} onChange={e => setNewType({...newType, fixedRange: {...(newType.fixedRange || {}), endDate: e.target.value} as any})}/></div>}<button onClick={handleSaveType} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">{editingTypeId ? 'Actualizar' : 'Añadir'}</button></div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Tipos de Turno</h3>
                             <div className="grid gap-4">{config.shiftTypes.map(type => (
                                 <div key={type.id} className="flex justify-between p-4 border rounded-lg bg-slate-50 border-l-4" style={{borderLeftColor: type.color}}>
                                     <div>
                                         <p className="font-bold">{type.name}</p>
                                         <p className="text-xs text-slate-500">
                                             {type.segments.map(s => `${s.start}-${s.end}`).join(' / ')}
                                         </p>
                                     </div>
                                     <div className="flex gap-2"><button onClick={() => handleEditShift(type)} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteShift(type.id)} className="text-red-400"><Trash size={18}/></button></div>
                                 </div>
                             ))}</div>
                             <div className="bg-slate-50 p-6 rounded-xl border">
                                 <h4 className="font-bold mb-4 text-sm uppercase">{editingShiftId ? 'Editar' : 'Crear'} Turno</h4>
                                 <div className="space-y-3">
                                     <div className="flex gap-2">
                                         <div className="flex-1">
                                             <label className="text-xs font-bold text-slate-500">Nombre</label>
                                             <input className="w-full p-2 border rounded" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})}/>
                                         </div>
                                         <div className="w-16">
                                              <label className="text-xs font-bold text-slate-500">Color</label>
                                              <input type="color" className="w-full h-10 p-1 border rounded" value={newShift.color} onChange={e => setNewShift({...newShift, color: e.target.value})}/>
                                         </div>
                                     </div>
                                     <div>
                                         <label className="text-xs font-bold text-slate-500 block mb-2">Franjas Horarias</label>
                                         {newShift.segments?.map((seg, i) => (
                                             <div key={i} className="flex gap-2 mb-2 items-center">
                                                 <input type="time" className="p-1 border rounded text-sm" value={seg.start} onChange={e => handleUpdateShiftSegment(i, 'start', e.target.value)} />
                                                 <span>-</span>
                                                 <input type="time" className="p-1 border rounded text-sm" value={seg.end} onChange={e => handleUpdateShiftSegment(i, 'end', e.target.value)} />
                                                 {i > 0 && <button onClick={() => handleRemoveShiftSegment(i)} className="text-red-500"><X size={16}/></button>}
                                             </div>
                                         ))}
                                         <button onClick={handleAddShiftSegment} className="text-xs text-blue-600 font-bold hover:underline">+ Añadir Franja</button>
                                     </div>
                                     <button onClick={handleSaveShift} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm w-full">{editingShiftId ? 'Actualizar Turno' : 'Guardar Turno'}</button>
                                 </div>
                             </div>
                        </div>

                         <div className="space-y-6">
                            <h3 className="font-bold text-lg text-slate-700 border-b pb-2">Días Festivos</h3>
                            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2 bg-slate-50">
                                {config.holidays.length === 0 ? <p className="text-sm text-slate-400 text-center italic">No hay festivos</p> : config.holidays.map(h => (
                                    <div key={h.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-100">
                                        <div>
                                            <div className="font-bold text-sm">{new Date(h.date).toLocaleDateString()}</div>
                                            <div className="text-xs text-red-500">{h.name}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditHoliday(h)} className="text-slate-400 hover:text-blue-500 p-1"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteHoliday(h.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50 p-6 rounded-xl border">
                                <h4 className="font-bold mb-4 text-sm uppercase">{editingHolidayId ? 'Editar Festivo' : 'Añadir Festivo'}</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Fecha</label>
                                        <input type="date" className="w-full p-2 border rounded text-sm" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500">Nombre Festividad</label>
                                        <input type="text" className="w-full p-2 border rounded text-sm" placeholder="Ej: Navidad" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}/>
                                    </div>
                                    <div className="flex gap-2">
                                        {editingHolidayId && (
                                            <button onClick={handleCancelEditHoliday} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold">Cancelar</button>
                                        )}
                                        <button onClick={editingHolidayId ? handleUpdateHoliday : handleAddHoliday} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
                                            {editingHolidayId ? 'Actualizar' : 'Añadir'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {subTab === 'epis' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                             <div>
                                 <h3 className="font-bold text-lg">Configuración de EPIs</h3>
                                 <p className="text-sm text-slate-500">Define los elementos que los empleados pueden solicitar.</p>
                             </div>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                             <h4 className="font-bold text-sm uppercase mb-4 text-slate-700">Añadir Nuevo Tipo</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 mb-1">Nombre (Ej: Botas Seguridad)</label>
                                     <input className="w-full p-2 border rounded" value={newPPE.name} onChange={e => setNewPPE({...newPPE, name: e.target.value})} placeholder="Nombre del EPI"/>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 mb-1">Tallas (Separadas por comas)</label>
                                     <input className="w-full p-2 border rounded" value={newPPE.sizesStr} onChange={e => setNewPPE({...newPPE, sizesStr: e.target.value})} placeholder="S, M, L, XL ó 38, 39, 40..."/>
                                 </div>
                                 <button onClick={handleAddPPE} className="bg-slate-900 text-white px-4 py-2 rounded font-bold text-sm">Añadir Tipo</button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {config.ppeTypes.map(type => (
                                <div key={type.id} className="bg-white border p-4 rounded-xl shadow-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800">{type.name}</h4>
                                            <button onClick={() => handleDeletePPE(type.id)} className="text-slate-300 hover:text-red-500"><Trash size={16}/></button>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {type.sizes.map(s => (
                                                <span key={s} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {subTab === 'communications' && (
                    <div className="flex flex-col md:flex-row gap-6 h-full min-h-[500px]">
                        <div className="w-full md:w-64 border-r border-slate-100 pr-4 space-y-2">
                             <h3 className="font-bold text-slate-700 mb-4 px-2">Configuración</h3>
                             <button onClick={() => setCommTab('templates')} className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-2 ${commTab === 'templates' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                 <Mail size={16}/> Plantillas Email
                             </button>
                             <button onClick={() => setCommTab('smtp')} className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-2 ${commTab === 'smtp' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                 <Server size={16}/> Servidor SMTP
                             </button>
                             <button onClick={() => setCommTab('message')} className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-2 ${commTab === 'message' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                                 <Send size={16}/> Enviar Mensaje
                             </button>
                        </div>

                        <div className="flex-1 pl-2">
                            {commTab === 'templates' && (
                                <div className="flex gap-4 h-full">
                                    <div className="w-1/3 border-r pr-2 space-y-1 overflow-y-auto max-h-[500px]">
                                        {config.emailTemplates.map(tpl => (
                                            <button key={tpl.id} onClick={() => setSelectedTemplate({...tpl})} className={`w-full text-left p-2 rounded text-xs transition-colors ${selectedTemplate?.id === tpl.id ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>{tpl.label}</button>
                                        ))}
                                    </div>
                                    <div className="w-2/3">
                                        {selectedTemplate ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between"><h4 className="font-bold">{selectedTemplate.label}</h4><button onClick={handleSaveTemplate} className="bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"><Save size={12}/> Guardar</button></div>
                                                <input className="w-full p-2 border rounded text-sm" value={selectedTemplate.subject} onChange={e => setSelectedTemplate({...selectedTemplate, subject: e.target.value})} placeholder="Asunto"/>
                                                <textarea className="w-full p-2 border rounded text-sm h-40 font-mono" value={selectedTemplate.body} onChange={e => setSelectedTemplate({...selectedTemplate, body: e.target.value})} placeholder="Cuerpo"/>
                                                <div className="bg-slate-50 p-3 rounded border flex gap-4 text-xs">
                                                    <label className="flex gap-1"><input type="checkbox" checked={selectedTemplate.recipients.worker} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, worker: e.target.checked}})}/> Empleado</label>
                                                    <label className="flex gap-1"><input type="checkbox" checked={selectedTemplate.recipients.supervisor} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, supervisor: e.target.checked}})}/> Supervisor</label>
                                                    <label className="flex gap-1"><input type="checkbox" checked={selectedTemplate.recipients.admin} onChange={e => setSelectedTemplate({...selectedTemplate, recipients: {...selectedTemplate.recipients, admin: e.target.checked}})}/> Admin</label>
                                                </div>
                                            </div>
                                        ) : <p>Selecciona una plantilla</p>}
                                    </div>
                                </div>
                            )}

                            {commTab === 'smtp' && (
                                <div className="max-w-xl space-y-6">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                        <Info className="text-blue-500 shrink-0 mt-1" size={18}/>
                                        <p className="text-xs text-blue-800 leading-relaxed">Estos ajustes se guardan en la base de datos y se mantendrán aunque actualices la versión de la aplicación. Asegúrate de que el servidor permite el acceso desde IPs externas.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Host SMTP</label>
                                            <input type="text" className="w-full p-2.5 border rounded-lg" value={smtpConfig.host} onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})} placeholder="smtp.tuproveedor.com"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Puerto</label>
                                            <input type="number" className="w-full p-2.5 border rounded-lg" value={smtpConfig.port} onChange={e => setSmtpConfig({...smtpConfig, port: parseInt(e.target.value)})}/>
                                        </div>
                                        <div className="flex items-end pb-1 px-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                                                <input type="checkbox" className="w-4 h-4 rounded text-blue-600" checked={smtpConfig.enabled} onChange={e => setSmtpConfig({...smtpConfig, enabled: e.target.checked})}/> 
                                                Habilitar servicio de correo
                                            </label>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Usuario / Email</label>
                                            <input type="text" className="w-full p-2.5 border rounded-lg" value={smtpConfig.user} onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})}/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Contraseña</label>
                                            <input type="password" placeholder="••••••••" className="w-full p-2.5 border rounded-lg" value={smtpConfig.password || ''} onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})}/>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={handleSaveSmtp} 
                                            disabled={saveLoading}
                                            className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                                        >
                                            {saveLoading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                            Guardar Configuración
                                        </button>
                                    </div>

                                    {/* SECCIÓN DE PRUEBA */}
                                    <div className="mt-8 pt-8 border-t border-slate-100">
                                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap className="text-orange-500" size={18}/> Prueba de envío</h4>
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <input 
                                                type="email" 
                                                placeholder="Introduce email de destino..." 
                                                className="flex-1 p-2.5 border rounded-lg bg-slate-50 text-sm focus:bg-white transition-all outline-none focus:ring-2 focus:ring-orange-500/20"
                                                value={testEmail}
                                                onChange={e => setTestEmail(e.target.value)}
                                            />
                                            <button 
                                                onClick={handleTestSmtp}
                                                disabled={isTestingSmtp || !testEmail}
                                                className="bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            >
                                                {isTestingSmtp ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                                Realizar Prueba
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 italic">* Se enviará un email genérico utilizando los credenciales guardados actualmente.</p>
                                    </div>
                                </div>
                            )}

                            {commTab === 'message' && (
                                <div className="space-y-4 max-w-xl">
                                    <h3 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={20}/> Enviar Notificación Masiva</h3>
                                    
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Mensaje</label>
                                        <textarea className="w-full p-3 border rounded-xl h-24" placeholder="Escribe tu mensaje aquí..." value={massMessage} onChange={e => setMassMessage(e.target.value)} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Destinatarios</label>
                                        <div className="flex gap-4 mb-4">
                                            <button onClick={() => setTargetAudience('all')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${targetAudience === 'all' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}>Todos los Usuarios</button>
                                            <button onClick={() => setTargetAudience('selection')} className={`flex-1 py-2 rounded-lg border text-sm font-medium ${targetAudience === 'selection' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200'}`}>Seleccionar Usuarios</button>
                                        </div>

                                        {targetAudience === 'selection' && (
                                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
                                                    <Search size={16} className="text-slate-400"/>
                                                    <input className="bg-transparent text-sm w-full outline-none" placeholder="Buscar usuario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                                                </div>
                                                <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                                                    {filteredUsers.map(u => (
                                                        <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                                            <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="rounded text-blue-600"/>
                                                            <span className="text-sm">{u.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="p-2 bg-slate-50 text-xs text-slate-500 text-right">
                                                    {selectedUserIds.length} seleccionados
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={handleSendMassMessage} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 flex justify-center items-center gap-2">
                                        <Send size={18}/> Enviar Notificación
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {subTab === 'general' && <div className="p-4 text-center text-slate-500">Configuración Global</div>}
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
  const unreadNotificationsCount = store.getNotificationsForUser(user.id).filter(n => !n.read).length;

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
        <div className="p-6 flex flex-col items-center justify-center border-b border-slate-800 mb-2">
            <div className="w-20 h-20 bg-white rounded-xl shadow-lg p-2 mb-3 flex items-center justify-center">
                 <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white text-center">GdA <span className="text-blue-500">RRHH</span></h1>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-400"><X/></button>
        </div>

        <nav className="px-4 space-y-2 mt-4 overflow-y-auto max-h-[calc(100vh-250px)]">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="calendar" icon={CalendarDays} label="Calendario" />
          <NavItem id="notifications" icon={Bell} label="Notificaciones" badgeCount={unreadNotificationsCount} />
          <NavItem id="profile" icon={UserCircle} label="Mi Perfil" />
          <NavItem id="epis" icon={HardHat} label="EPIS" />
          {(isSupervisor) && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestión</div>
              <NavItem id="approvals" icon={ShieldCheck} label="Aprobaciones" badgeCount={pendingCount} />
              <NavItem id="team" icon={UsersIcon} label="Mi Equipo" />
              <NavItem id="upcoming" icon={CalendarClock} label="Próximas Ausencias" />
            </>
          )}
          {(isAdmin) && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</div>
              <NavItem id="settings" icon={Settings} label="Administración" />
            </>
          )}
           <div className="pt-4 pb-2 px-4 border-t border-slate-800 mt-4">
              <NavItem id="help" icon={HelpCircle} label="Ayuda" />
           </div>
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors" onClick={() => setActiveTab('profile')}>
            <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-600 object-cover" alt="User" />
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
          <h2 className="text-lg font-semibold text-slate-800 capitalize">{activeTab === 'settings' ? 'Administración' : activeTab === 'team' ? 'Mi Equipo' : activeTab === 'profile' ? 'Mi Perfil' : activeTab === 'help' ? 'Centro de Ayuda' : activeTab === 'epis' ? 'Gestión de EPIS' : activeTab === 'upcoming' ? 'Próximas Ausencias' : activeTab}</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => {setModalInitialTab('absence'); setEditingRequest(null); setShowRequestModal(true);}} className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={16} /> Nueva Solicitud</button>
            <div className="relative cursor-pointer group"><Bell className="text-slate-400 group-hover:text-slate-600" />{store.notifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
           {activeTab === 'dashboard' && <Dashboard user={user} onNewRequest={(type) => {setModalInitialTab(type); setEditingRequest(null); setShowRequestModal(true);}} onEditRequest={(req) => { setEditingRequest(req); setShowRequestModal(true); }} onViewRequest={handleViewRequest} />}
           {activeTab === 'calendar' && <CalendarView user={user} />}
           {activeTab === 'notifications' && <NotificationsView user={user} />}
           {activeTab === 'profile' && <ProfileView user={user} onProfileUpdate={() => setUser({...store.currentUser!})} />}
           {activeTab === 'approvals' && isSupervisor && <Approvals user={user} onViewRequest={handleViewRequest} />}
           {activeTab === 'team' && isSupervisor && <UserManagement currentUser={user} onViewRequest={handleViewRequest} />}
           {activeTab === 'upcoming' && isSupervisor && <UpcomingAbsences user={user} onViewRequest={handleViewRequest} />}
           {activeTab === 'epis' && <PPEView user={user} />}
           {activeTab === 'settings' && isAdmin && <AdminSettings onViewRequest={handleViewRequest} />}
           {activeTab === 'help' && <HelpView />}
        </div>
        
        {showRequestModal && <RequestFormModal onClose={() => setShowRequestModal(false)} user={user} initialTab={modalInitialTab} editingRequest={editingRequest} />}
        {viewingRequest && <RequestDetailModal request={viewingRequest} onClose={() => setViewingRequest(null)} />}
      </main>
    </div>
  );
}
