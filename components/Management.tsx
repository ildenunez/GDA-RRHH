
import React, { useState, useMemo, useEffect } from 'react';
import { User, RequestStatus, Role, LeaveRequest, RequestType, Department, EmailTemplate } from '../types';
import { store } from '../services/store';
import ShiftScheduler from './ShiftScheduler';
import RequestFormModal from './RequestFormModal';
import { Check, X, Users, Edit2, Shield, Trash2, AlertTriangle, Briefcase, FileText, Activity, Clock, CalendarDays, ExternalLink, UserPlus, MessageSquare, PieChart, Calendar, Filter, Paintbrush, Plus, CalendarClock, Search, CheckCircle, FileWarning, Printer, CheckSquare, Square, Lock as LockIcon, Sparkles, Loader2, Settings, List, ToggleLeft, ToggleRight, ShieldCheck, Mail, HardHat, Save, Send, XCircle } from 'lucide-react';

// --- SUB-COMPONENTS FOR ADMIN ---

const DepartmentManager: React.FC = () => {
    const [departments, setDepartments] = useState(store.departments);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [name, setName] = useState('');
    const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);

    useEffect(() => {
        const unsub = store.subscribe(() => setDepartments([...store.departments]));
        return unsub;
    }, []);

    const openModal = (dept?: Department) => {
        setEditingDept(dept || null);
        setName(dept ? dept.name : '');
        setSelectedSupervisors(dept ? dept.supervisorIds : []);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        if (editingDept) await store.updateDepartment(editingDept.id, name, selectedSupervisors);
        else await store.createDepartment(name, selectedSupervisors);
        setIsModalOpen(false);
    };

    const toggleSupervisor = (userId: string) => {
        if (selectedSupervisors.includes(userId)) setSelectedSupervisors(selectedSupervisors.filter(id => id !== userId));
        else setSelectedSupervisors([...selectedSupervisors, userId]);
    };

    const getEmployeeCount = (deptId: string) => store.users.filter(u => u.departmentId === deptId).length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Departamentos</h3>
                <button onClick={() => openModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all"><Plus size={18}/> Nuevo</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map(d => (
                    <div key={d.id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-slate-800">{d.name}</h4>
                                <p className="text-sm text-slate-500 mt-1">{getEmployeeCount(d.id)} empleados</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(d)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><Settings size={16}/></button>
                                <button onClick={() => { if(confirm('¿Eliminar departamento?')) store.deleteDepartment(d.id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100"><h3 className="text-xl font-bold text-slate-800">{editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}</h3></div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Departamento</label>
                                <input type="text" required className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Supervisores Asignados</label>
                                <div className="border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto bg-slate-50">
                                    {store.users.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                                        <div key={u.id} onClick={() => toggleSupervisor(u.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white transition-colors ${selectedSupervisors.includes(u.id) ? 'bg-blue-50 border border-blue-200' : ''}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedSupervisors.includes(u.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                                {selectedSupervisors.includes(u.id) && <Check size={12}/>}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{u.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const HRConfigManager: React.FC = () => {
    const [activeModal, setActiveModal] = useState<'holiday' | 'type' | 'shift' | null>(null);
    const [typeName, setTypeName] = useState('');
    const [typeSubtracts, setTypeSubtracts] = useState(true);
    const [isFixedDates, setIsFixedDates] = useState(false);
    const [fixedStart, setFixedStart] = useState('');
    const [fixedEnd, setFixedEnd] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayName, setHolidayName] = useState('');
    const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
    const [shiftName, setShiftName] = useState('');
    const [shiftColor, setShiftColor] = useState('#3b82f6');
    const [shiftStart, setShiftStart] = useState('');
    const [shiftEnd, setShiftEnd] = useState('');

    const handleSaveType = async (e: React.FormEvent) => {
        e.preventDefault();
        const fixedRange = isFixedDates && fixedStart && fixedEnd ? { startDate: fixedStart, endDate: fixedEnd } : null;
        await store.createLeaveType(typeName, typeSubtracts, fixedRange);
        setActiveModal(null); setTypeName(''); setFixedStart(''); setFixedEnd(''); setIsFixedDates(false);
    };

    const handleSaveHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingHolidayId) await store.updateHoliday(editingHolidayId, holidayDate, holidayName);
        else await store.createHoliday(holidayDate, holidayName);
        setActiveModal(null); setHolidayDate(''); setHolidayName(''); setEditingHolidayId(null);
    };

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        await store.createShiftType(shiftName, shiftColor, shiftStart, shiftEnd);
        setActiveModal(null); setShiftName(''); setShiftStart(''); setShiftEnd('');
    };

    const openEditHoliday = (h: any) => {
        setEditingHolidayId(h.id);
        setHolidayName(h.name);
        setHolidayDate(h.date);
        setActiveModal('holiday');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-slate-800">Tipos de Ausencia</h3>
                </div>
                <div className="space-y-3">
                    {store.config.leaveTypes.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                            <div>
                                <div className="font-bold text-slate-800">{t.label}</div>
                                <div className="text-xs text-slate-500 mt-1">{t.subtractsDays ? 'Resta Días' : 'No Resta'} {t.fixedRange ? '• Fechas Fijas' : ''}</div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => store.deleteLeaveType(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6">
                        <button onClick={() => { setActiveModal('type'); setTypeName(''); }} className="w-full text-sm font-bold text-slate-500 hover:text-blue-600 text-left">CREAR TIPO</button>
                        {activeModal === 'type' && (
                            <form onSubmit={handleSaveType} className="mt-4 space-y-3 animate-fade-in">
                                <div><label className="text-xs font-bold text-slate-500">Nombre</label><input autoFocus required className="w-full p-2 border rounded-lg text-sm" value={typeName} onChange={e=>setTypeName(e.target.value)}/></div>
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={typeSubtracts} onChange={e=>setTypeSubtracts(e.target.checked)} className="rounded text-blue-600"/> Resta días</label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={isFixedDates} onChange={e=>setIsFixedDates(e.target.checked)} className="rounded text-blue-600"/> Fechas Fijas</label>
                                {isFixedDates && <div className="grid grid-cols-2 gap-2"><input type="date" required className="p-2 border rounded-lg text-xs" value={fixedStart} onChange={e=>setFixedStart(e.target.value)}/><input type="date" required className="p-2 border rounded-lg text-xs" value={fixedEnd} onChange={e=>setFixedEnd(e.target.value)}/></div>}
                                <button className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold">Añadir</button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-slate-800">Tipos de Turno</h3>
                </div>
                <div className="space-y-3">
                    {store.config.shiftTypes.map(s => (
                        <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center border-l-4" style={{borderLeftColor: s.color}}>
                            <div>
                                <div className="font-bold text-slate-800">{s.name}</div>
                                <div className="text-xs text-slate-500 mt-1">{s.segments[0]?.start}-{s.segments[0]?.end}</div>
                            </div>
                            <button onClick={() => store.deleteShiftType(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6">
                        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">Crear Turno</h4>
                        <form onSubmit={handleSaveShift} className="space-y-3">
                            <div className="flex gap-2"><input required placeholder="Nombre" className="flex-1 p-2 border rounded-lg text-sm" value={shiftName} onChange={e=>setShiftName(e.target.value)}/><input type="color" className="w-10 h-9 p-1 border rounded-lg" value={shiftColor} onChange={e=>setShiftColor(e.target.value)}/></div>
                            <div className="grid grid-cols-2 gap-2"><div className="flex items-center gap-1"><Clock size={12}/><input type="time" required className="w-full p-2 border rounded-lg text-xs" value={shiftStart} onChange={e=>setShiftStart(e.target.value)}/></div><div className="flex items-center gap-1"><input type="time" required className="w-full p-2 border rounded-lg text-xs" value={shiftEnd} onChange={e=>setShiftEnd(e.target.value)}/></div></div>
                            <button className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-bold">Guardar Turno</button>
                        </form>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-slate-800">Días Festivos</h3>
                </div>
                <div className="space-y-3">
                    {store.config.holidays.sort((a,b) => a.date.localeCompare(b.date)).map(h => (
                        <div key={h.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                            <div>
                                <div className="text-xs font-bold text-red-600">{new Date(h.date).toLocaleDateString()}</div>
                                <div className="font-medium text-slate-700 text-sm">{h.name}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditHoliday(h)} className="text-blue-400 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={14}/></button>
                                <button onClick={() => store.deleteHoliday(h.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6">
                        <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase">{editingHolidayId ? 'Editar' : 'Añadir'} Festivo</h4>
                        <form onSubmit={handleSaveHoliday} className="space-y-3">
                            <input type="date" required className="w-full p-2 border rounded-lg text-sm" value={holidayDate} onChange={e=>setHolidayDate(e.target.value)}/>
                            <input type="text" required placeholder="Nombre Festividad" className="w-full p-2 border rounded-lg text-sm" value={holidayName} onChange={e=>setHolidayName(e.target.value)}/>
                            <button className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold">{editingHolidayId ? 'Actualizar' : 'Añadir'}</button>
                            {editingHolidayId && <button type="button" onClick={() => { setEditingHolidayId(null); setHolidayName(''); setHolidayDate(''); setActiveModal(null); }} className="w-full text-xs text-slate-500 underline mt-1">Cancelar</button>}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PPEConfigManager: React.FC = () => {
    const [editingPPEId, setEditingPPEId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [sizes, setSizes] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !sizes) return;
        const sizeArray = sizes.split(',').map(s => s.trim()).filter(s => s !== '');
        
        if (editingPPEId) {
            await store.updatePPEType(editingPPEId, name, sizeArray);
        } else {
            await store.createPPEType(name, sizeArray);
        }
        setEditingPPEId(null); setName(''); setSizes('');
    };

    const startEdit = (p: any) => {
        setEditingPPEId(p.id);
        setName(p.name);
        setSizes(p.sizes.join(', '));
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">Gestión de EPIs</h3>
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <form onSubmit={handleSave} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre del Equipo</label>
                        <input required placeholder="Ej: Botas de Seguridad" className="w-full p-2 border rounded-lg" value={name} onChange={e=>setName(e.target.value)}/>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tallas (Separadas por comas)</label>
                        <input required placeholder="Ej: 38, 39, 40, 41, 42" className="w-full p-2 border rounded-lg" value={sizes} onChange={e=>setSizes(e.target.value)}/>
                    </div>
                    <button className={`${editingPPEId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white px-4 py-2.5 rounded-lg font-bold shadow-lg transition-colors flex items-center gap-2`}>
                        {editingPPEId ? <Save size={18}/> : <Plus size={18}/>} {editingPPEId ? 'Actualizar' : 'Añadir'}
                    </button>
                    {editingPPEId && <button type="button" onClick={() => { setEditingPPEId(null); setName(''); setSizes(''); }} className="px-4 py-2.5 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>}
                </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {store.config.ppeTypes.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative group">
                        <div className="font-bold text-slate-800 flex items-center gap-2"><HardHat size={16} className="text-orange-500"/> {p.name}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {p.sizes.map(s => <span key={s} className="px-2 py-0.5 bg-slate-100 text-xs rounded font-mono">{s}</span>)}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(p)} className="text-blue-400 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16}/></button>
                            <button onClick={() => store.deletePPEType(p.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CommunicationsManager: React.FC = () => {
    // ... Keeping logic identical, just outputting component for file completeness ...
    const [subTab, setSubTab] = useState<'templates' | 'smtp' | 'message'>('templates');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('request_created');
    const [tempTemplates, setTempTemplates] = useState<EmailTemplate[]>(store.config.emailTemplates);
    const [smtp, setSmtp] = useState(store.config.smtpSettings);
    const [msgBody, setMsgBody] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const activeTemplate = tempTemplates.find(t => t.id === selectedTemplateId) || tempTemplates[0];

    const handleTemplateChange = (field: keyof EmailTemplate, value: any) => {
        setTempTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, [field]: value } : t));
    };

    const handleRecipientChange = (role: 'worker' | 'supervisor' | 'admin', checked: boolean) => {
        setTempTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, recipients: { ...t.recipients, [role]: checked } } : t));
    };

    const saveTemplates = async () => {
        await store.saveEmailTemplates(tempTemplates);
        alert('Plantillas guardadas correctamente.');
    };

    const handleSaveSmtp = async (e: React.FormEvent) => {
        e.preventDefault();
        await store.saveSmtpSettings(smtp);
        alert('Configuración SMTP guardada.');
    };

    const handleSendMessage = async () => {
        if (!msgBody) return alert('Escribe un mensaje.');
        if (selectedUsers.length === 0) return alert('Selecciona al menos un destinatario.');
        
        await store.sendMassNotification(selectedUsers, msgBody);
        alert('Mensaje enviado correctamente.');
        setMsgBody('');
        setSelectedUsers([]);
        setSelectAll(false);
    };

    const toggleUser = (id: string) => {
        if (selectedUsers.includes(id)) setSelectedUsers(selectedUsers.filter(u => u !== id));
        else setSelectedUsers([...selectedUsers, id]);
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(store.users.map(u => u.id));
        }
        setSelectAll(!selectAll);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[600px]">
            <div className="space-y-2">
                <h3 className="font-bold text-slate-700 mb-4">Configuración</h3>
                <button onClick={() => setSubTab('templates')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${subTab === 'templates' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}><Mail size={18}/> Plantillas Email</button>
                <button onClick={() => setSubTab('smtp')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${subTab === 'smtp' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}><List size={18}/> Servidor SMTP</button>
                <button onClick={() => setSubTab('message')} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${subTab === 'message' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}><MessageSquare size={18}/> Enviar Mensaje</button>
            </div>
            
            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-0 overflow-hidden flex flex-col">
                {subTab === 'templates' && activeTemplate && (
                    <div className="flex flex-col h-full">
                        <div className="flex border-b border-slate-100 overflow-x-auto">
                            {[
                                { id: 'request_created', label: 'Ausencia: Crea' },
                                { id: 'request_approved', label: 'Ausencia: OK' },
                                { id: 'request_rejected', label: 'Ausencia: KO' },
                                { id: 'overtime_created', label: 'Horas: Reg' },
                                { id: 'overtime_approved', label: 'Horas: OK' },
                                { id: 'overtime_consumed', label: 'Horas: Canje' },
                                { id: 'adjustment_applied', label: 'Regularización' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedTemplateId(type.id)}
                                    className={`px-4 py-4 text-xs font-bold whitespace-nowrap transition-colors border-b-2 ${selectedTemplateId === type.id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-8 flex-1 overflow-y-auto animate-fade-in">
                            <div className="grid grid-cols-2 gap-6 mb-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asunto del Correo</label>
                                    <input 
                                        className="w-full p-3 border rounded-xl text-sm font-medium" 
                                        value={activeTemplate.subject} 
                                        onChange={e => handleTemplateChange('subject', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Destinatarios</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={activeTemplate.recipients.worker} onChange={e => handleRecipientChange('worker', e.target.checked)} className="rounded text-blue-600"/> Empleado
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={activeTemplate.recipients.supervisor} onChange={e => handleRecipientChange('supervisor', e.target.checked)} className="rounded text-blue-600"/> Supervisor
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input type="checkbox" checked={activeTemplate.recipients.admin} onChange={e => handleRecipientChange('admin', e.target.checked)} className="rounded text-blue-600"/> Administradores
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cuerpo del Mensaje</label>
                                <textarea 
                                    className="w-full p-4 border rounded-xl h-64 text-sm font-mono text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 outline-none" 
                                    value={activeTemplate.body}
                                    onChange={e => handleTemplateChange('body', e.target.value)}
                                />
                            </div>
                            
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Variables Disponibles</p>
                                <div className="flex flex-wrap gap-2 text-xs font-mono text-blue-700">
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Nombre del empleado">{`{empleado}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Tipo de solicitud">{`{tipo}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Fechas de la solicitud">{`{fechas}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Motivo del empleado">{`{motivo}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Nombre del supervisor">{`{supervisor}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Saldo de horas extra">{`{saldo_horas}`}</span>
                                    <span className="bg-blue-100 px-2 py-1 rounded cursor-help" title="Comentario del administrador">{`{comentario_admin}`}</span>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={saveTemplates} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                                    <Save size={18}/> Guardar Plantilla
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'smtp' && (
                    <div className="p-8 animate-fade-in max-w-lg mx-auto w-full">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 text-center">Configuración SMTP</h2>
                        <form onSubmit={handleSaveSmtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Servidor Host</label>
                                <input className="w-full p-3 border rounded-xl text-sm" value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} placeholder="smtp.gmail.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Puerto</label>
                                    <input type="number" className="w-full p-3 border rounded-xl text-sm" value={smtp.port} onChange={e => setSmtp({...smtp, port: parseInt(e.target.value)})} placeholder="587" />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                                        <input type="checkbox" checked={smtp.enabled} onChange={e => setSmtp({...smtp, enabled: e.target.checked})} className="w-5 h-5 rounded text-blue-600" />
                                        Activar Envío
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Usuario</label>
                                <input className="w-full p-3 border rounded-xl text-sm" value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
                                <input type="password" className="w-full p-3 border rounded-xl text-sm" value={smtp.password} onChange={e => setSmtp({...smtp, password: e.target.value})} />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                                    <Save size={18}/> Guardar Configuración
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {subTab === 'message' && (
                    <div className="p-8 animate-fade-in flex flex-col h-full">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Enviar Mensaje Masivo</h2>
                        <div className="flex-1 flex gap-6 min-h-0">
                            <div className="flex-1 flex flex-col">
                                <label className="text-sm font-semibold text-slate-700 mb-2">Mensaje</label>
                                <textarea 
                                    className="flex-1 w-full p-4 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-100 outline-none" 
                                    placeholder="Escribe tu mensaje aquí..." 
                                    value={msgBody}
                                    onChange={e => setMsgBody(e.target.value)}
                                />
                                <div className="mt-4 flex justify-end">
                                    <button onClick={handleSendMessage} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all">
                                        <Send size={18}/> Enviar Notificación
                                    </button>
                                </div>
                            </div>
                            <div className="w-64 border rounded-xl overflow-hidden flex flex-col">
                                <div className="bg-slate-50 p-3 border-b flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-700">Destinatarios</span>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedUsers.length}</span>
                                </div>
                                <div className="p-2 border-b bg-slate-50/50">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded text-blue-600" />
                                        Seleccionar Todos
                                    </label>
                                </div>
                                <div className="overflow-y-auto p-2 space-y-1 flex-1">
                                    {store.users.map(u => (
                                        <label key={u.id} className="flex items-center gap-2 text-sm p-2 hover:bg-slate-50 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedUsers.includes(u.id)} 
                                                onChange={() => toggleUser(u.id)} 
                                                className="rounded text-blue-600"
                                            />
                                            <span className="truncate">{u.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- EXPORTED MANAGEMENT COMPONENTS ---

export const Approvals: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
  const [refresh, setRefresh] = useState(0);
  useEffect(() => store.subscribe(() => setRefresh(r => r+1)), []);
  
  const pending = store.getPendingApprovalsForUser(user.id);
  
  const handleAction = async (req: LeaveRequest, status: RequestStatus) => {
      const message = status === RequestStatus.APPROVED ? 'Comentario (opcional):' : 'Motivo del rechazo (Obligatorio):';
      const comment = prompt(message);
      
      // Cancelado por el usuario
      if (comment === null) return; 

      // Validación para rechazos vacíos
      if (status === RequestStatus.REJECTED && !comment.trim()) {
          alert("Debes indicar un motivo para rechazar la solicitud.");
          return;
      }
      
      await store.updateRequestStatus(req.id, status, user.id, comment || undefined);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-blue-600"/> Aprobaciones Pendientes</h2>
        {pending.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400">
                <CheckCircle size={48} className="mx-auto mb-4 opacity-20"/>
                <p>¡Todo al día! No tienes solicitudes pendientes.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {pending.map(req => {
                    const conflicts = store.getRequestConflicts(req);
                    const hasConflict = conflicts.length > 0;
                    
                    return (
                        <div key={req.id} className={`bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-6 items-start md:items-center transition-all ${hasConflict ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-lg text-slate-800">{store.users.find(u => u.id === req.userId)?.name}</span>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{store.departments.find(d => d.id === store.users.find(u => u.id === req.userId)?.departmentId)?.name}</span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-1"><FileText size={16}/> {req.label}</div>
                                    <div className="flex items-center gap-1"><Calendar size={16}/> {new Date(req.startDate).toLocaleDateString()} {req.endDate && ` - ${new Date(req.endDate).toLocaleDateString()}`}</div>
                                    {req.hours && <div className="flex items-center gap-1"><Clock size={16}/> {req.hours}h</div>}
                                </div>
                                {req.reason && <div className="mt-3 text-sm italic text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">"{req.reason}"</div>}
                                
                                {hasConflict && (
                                    <div className="mt-3 bg-red-50 text-red-700 p-2 rounded-lg text-xs flex items-start gap-2 border border-red-100 animate-pulse">
                                        <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
                                        <div>
                                            <span className="font-bold uppercase">Conflicto de Departamento:</span> Coincide con {conflicts.length} aprobaciones (
                                            {conflicts.map(c => store.users.find(u => u.id === c.userId)?.name.split(' ')[0]).join(', ')}
                                            ).
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => onViewRequest(req)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><ExternalLink size={20}/></button>
                                <button onClick={() => handleAction(req, RequestStatus.REJECTED)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors">Rechazar</button>
                                <button onClick={() => handleAction(req, RequestStatus.APPROVED)} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-500/30 transition-colors">Aprobar</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};

export const UpcomingAbsences: React.FC<{ user: User, onViewRequest: (req: LeaveRequest) => void }> = ({ user, onViewRequest }) => {
    const today = new Date().toISOString().split('T')[0];
    
    const teamIds = useMemo(() => {
        if (user.role === Role.ADMIN) return store.users.map(u => u.id);
        const myDepts = store.departments.filter(d => d.supervisorIds.includes(user.id)).map(d => d.id);
        return store.users.filter(u => myDepts.includes(u.departmentId)).map(u => u.id);
    }, [user]);

    const absences = store.requests.filter(r => 
        r.status === RequestStatus.APPROVED && 
        !store.isOvertimeRequest(r.typeId) &&
        (r.endDate || r.startDate) >= today &&
        teamIds.includes(r.userId)
    ).sort((a,b) => a.startDate.localeCompare(b.startDate));

    const handlePrint = () => {
        window.print();
    };

    const getOverlapText = (r1: LeaveRequest, r2: LeaveRequest) => {
        const s1 = new Date(r1.startDate);
        const e1 = new Date(r1.endDate || r1.startDate);
        const s2 = new Date(r2.startDate);
        const e2 = new Date(r2.endDate || r2.startDate);
        
        s1.setHours(0,0,0,0); e1.setHours(0,0,0,0);
        s2.setHours(0,0,0,0); e2.setHours(0,0,0,0);

        const start = s1 > s2 ? s1 : s2;
        const end = e1 < e2 ? e1 : e2;
        
        if (start.getTime() === end.getTime()) {
            return start.toLocaleDateString(undefined, {day: '2-digit', month: 'short'});
        }
        return `${start.toLocaleDateString(undefined, {day: '2-digit', month: 'short'})} - ${end.toLocaleDateString(undefined, {day: '2-digit', month: 'short'})}`;
    };

    return (
        <div className="space-y-6 animate-fade-in print:bg-white print:p-0">
             <div className="flex justify-between items-center print:hidden">
                 <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><CalendarClock className="text-blue-600"/> Próximas Ausencias</h2>
                 <button onClick={handlePrint} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-50 shadow-sm"><Printer size={18}/> Imprimir</button>
             </div>

             {/* Print Header */}
             <div className="hidden print:block mb-6">
                 <h1 className="text-2xl font-bold text-slate-900">Informe de Próximas Ausencias y Conflictos</h1>
                 <p className="text-sm text-slate-500">Generado el {new Date().toLocaleDateString()}</p>
             </div>

             {absences.length === 0 ? (
                 <p className="text-slate-500 italic">No hay ausencias próximas programadas en tu equipo.</p>
             ) : (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs print:bg-slate-100">
                             <tr>
                                 <th className="px-6 py-4">Empleado</th>
                                 <th className="px-6 py-4">Tipo</th>
                                 <th className="px-6 py-4">Fechas</th>
                                 <th className="px-6 py-4">Días</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {absences.map(req => {
                                 const u = store.users.find(usr => usr.id === req.userId);
                                 const start = new Date(req.startDate);
                                 const end = new Date(req.endDate || req.startDate);
                                 const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
                                 
                                 // Check Conflicts In-Line
                                 const conflicts = store.getRequestConflicts(req);
                                 const hasConflict = conflicts.length > 0;

                                 return (
                                     <tr key={req.id} className="hover:bg-slate-50 cursor-pointer print:cursor-auto group" onClick={() => onViewRequest(req)}>
                                         <td className="px-6 py-4">
                                             <div className="font-bold text-slate-700">{u?.name}</div>
                                             {hasConflict && (
                                                 <div className="mt-2 text-xs flex flex-col gap-1 text-red-600 bg-red-50 p-2 rounded border border-red-100 w-fit animate-pulse print:animate-none">
                                                     <div className="flex items-center gap-1 font-bold"><AlertTriangle size={12}/> Conflicto Detectado:</div>
                                                     {conflicts.map(c => {
                                                         const conflictUser = store.users.find(u => u.id === c.userId)?.name.split(' ')[0];
                                                         const range = getOverlapText(req, c);
                                                         return (
                                                             <div key={c.id} className="pl-4 border-l-2 border-red-200">
                                                                 Coincide con <strong>{conflictUser}</strong> ({range})
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </td>
                                         <td className="px-6 py-4 align-top">{req.label}</td>
                                         <td className="px-6 py-4 text-slate-500 align-top">{start.toLocaleDateString()} - {end.toLocaleDateString()}</td>
                                         <td className="px-6 py-4 font-mono font-bold text-blue-600 align-top">{diff}</td>
                                     </tr>
                                 )
                             })}
                         </tbody>
                     </table>
                 </div>
             )}
        </div>
    );
};

export const UserManagement: React.FC<{ currentUser: User, onViewRequest: (req: LeaveRequest) => void }> = ({ currentUser, onViewRequest }) => {
    // ... Keeping exact same logic as before, just outputting for file completeness ...
    const [viewMode, setViewMode] = useState<'list' | 'shifts'>('list');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [newPass, setNewPass] = useState('');
    const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
    const [adjustmentReasonDays, setAdjustmentReasonDays] = useState('');
    const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
    const [adjustmentReasonHours, setAdjustmentReasonHours] = useState('');
    const [modalActionUser, setModalActionUser] = useState<User | null>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [refreshTick, setRefreshTick] = useState(0);

    const users = useMemo(() => {
        let filtered = store.users;
        if (currentUser.role !== Role.ADMIN) {
             const myDepts = store.departments.filter(d => d.supervisorIds.includes(currentUser.id)).map(d => d.id);
             filtered = filtered.filter(u => myDepts.includes(u.departmentId));
        }
        if (filterDept) filtered = filtered.filter(u => u.departmentId === filterDept);
        if (searchTerm) filtered = filtered.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [currentUser, store.users, searchTerm, filterDept, refreshTick]);

    const editingUserRequests = useMemo(() => {
        return editingUser.id ? store.requests.filter(r => r.userId === editingUser.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) : [];
    }, [editingUser.id, store.requests.length, refreshTick]);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser.id) {
            await store.updateUserAdmin(editingUser.id, editingUser);
            await store.updateUserRole(editingUser.id, editingUser.role as Role);
            if(newPass) await store.updateUserProfile(editingUser.id, { ...editingUser as any, password: newPass });
            if (adjustmentDays !== 0) {
                await store.createRequest({ 
                    typeId: RequestType.ADJUSTMENT_DAYS, 
                    label: 'Regularización Días', 
                    startDate: new Date().toISOString(), 
                    hours: adjustmentDays, 
                    reason: adjustmentReasonDays || 'Ajuste manual Admin' 
                }, editingUser.id, RequestStatus.APPROVED);
            }
            if (adjustmentHours !== 0) {
                await store.createRequest({ 
                    typeId: RequestType.ADJUSTMENT_OVERTIME, 
                    label: 'Regularización Horas', 
                    startDate: new Date().toISOString(), 
                    hours: adjustmentHours, 
                    reason: adjustmentReasonHours || 'Ajuste manual Admin' 
                }, editingUser.id, RequestStatus.APPROVED);
            }
        } else {
            await store.createUser(editingUser, newPass);
        }
        setIsUserModalOpen(false);
        setRefreshTick(t => t + 1);
    };

    const isAdmin = currentUser.role === Role.ADMIN;

    const resetModalState = (user?: User) => {
        setEditingUser(user || {});
        setNewPass('');
        setAdjustmentDays(0);
        setAdjustmentReasonDays('');
        setAdjustmentHours(0);
        setAdjustmentReasonHours('');
        setIsUserModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Listado</button>
                    <button onClick={() => setViewMode('shifts')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'shifts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Planificación</button>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                         <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4"/>
                         <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                    {isAdmin && (
                        <button onClick={() => resetModalState()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all whitespace-nowrap">
                            <UserPlus size={18}/> Nuevo
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'shifts' ? (
                <ShiftScheduler users={users} />
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                             <tr>
                                 <th className="px-6 py-4">Empleado</th>
                                 <th className="px-6 py-4">Departamento</th>
                                 <th className="px-6 py-4">Rol</th>
                                 <th className="px-6 py-4 text-center">Saldo Días</th>
                                 <th className="px-6 py-4 text-center">Saldo Horas</th>
                                 <th className="px-6 py-4 text-right">Acciones</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {users.map(u => (
                                 <tr key={u.id} className="hover:bg-slate-50">
                                     <td className="px-6 py-4 flex items-center gap-3">
                                         <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-200"/>
                                         <div><div className="font-bold text-slate-800">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></div>
                                     </td>
                                     <td className="px-6 py-4">{store.departments.find(d => d.id === u.departmentId)?.name || '-'}</td>
                                     <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{u.role}</span></td>
                                     <td className="px-6 py-4 text-center font-bold text-slate-700">{u.daysAvailable.toFixed(1)}</td>
                                     <td className="px-6 py-4 text-center font-bold text-blue-600">{u.overtimeHours}h</td>
                                     <td className="px-6 py-4 text-right">
                                         <div className="flex justify-end gap-2">
                                             {isAdmin ? (
                                                 <>
                                                     <button onClick={() => resetModalState(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded bg-blue-50/50"><Settings size={16}/></button>
                                                     <button onClick={() => { if(confirm('¿Eliminar usuario?')) store.deleteUser(u.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                 </>
                                             ) : (
                                                 <button onClick={() => { setModalActionUser(u); setIsActionModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Gestionar"><Settings size={16}/></button>
                                             )}
                                         </div>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                    </table>
                </div>
            )}

            {isUserModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scale-in my-4 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                    {editingUser.name ? editingUser.name.substring(0,2).toUpperCase() : 'NU'}
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">{editingUser.id ? `Ficha: ${editingUser.name}` : 'Nuevo Usuario'}</h3>
                            </div>
                            <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={24}/></button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50">
                            <form id="userForm" onSubmit={handleSaveUser} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label><input required className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={editingUser.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Corporativo</label><input type="email" required className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={editingUser.email || ''} onChange={e => setEditingUser({...editingUser, email: e.target.value})}/></div>
                                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label><select className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={editingUser.departmentId || ''} onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}>{store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                    <div className="flex gap-4"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol del Sistema</label><select className="w-full p-3 border border-slate-200 rounded-xl bg-white" value={editingUser.role || Role.WORKER} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})}><option value={Role.WORKER}>Trabajador</option><option value={Role.SUPERVISOR}>Supervisor</option><option value={Role.ADMIN}>Admin</option></select></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña {editingUser.id && '(Opcional)'}</label><input type="password" className="w-full p-3 border border-slate-200 rounded-xl bg-white" placeholder="******" value={newPass} onChange={e => setNewPass(e.target.value)}/></div></div>
                                </div>
                                {editingUser.id && (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><FileText className="text-orange-500" size={18}/> Ajustes de Saldo</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100"><div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-orange-700 uppercase">Saldo Días Actual</span><span className="text-3xl font-black text-orange-600">{editingUser.daysAvailable}</span></div><div className="flex gap-2"><input type="number" step="0.5" placeholder="0" className="w-20 p-2 text-center font-bold border border-orange-200 rounded-lg" value={adjustmentDays} onChange={e => setAdjustmentDays(parseFloat(e.target.value))}/><input type="text" placeholder="Motivo del ajuste..." className="flex-1 p-2 text-sm border border-orange-200 rounded-lg" value={adjustmentReasonDays} onChange={e => setAdjustmentReasonDays(e.target.value)}/></div></div>
                                            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100"><div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-blue-700 uppercase">Saldo Horas Actual</span><span className="text-3xl font-black text-blue-600">{editingUser.overtimeHours}h</span></div><div className="flex gap-2"><input type="number" step="0.5" placeholder="0" className="w-20 p-2 text-center font-bold border border-blue-200 rounded-lg" value={adjustmentHours} onChange={e => setAdjustmentHours(parseFloat(e.target.value))}/><input type="text" placeholder="Motivo del ajuste..." className="flex-1 p-2 text-sm border border-blue-200 rounded-lg" value={adjustmentReasonHours} onChange={e => setAdjustmentReasonHours(e.target.value)}/></div></div>
                                        </div>
                                    </div>
                                )}
                                {editingUser.id && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center"><h4 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} className="text-slate-500"/> Historial del Empleado</h4><button type="button" onClick={() => { setModalActionUser(editingUser as User); setIsActionModalOpen(true); }} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors"><Plus size={12}/> Crear Solicitud Manual</button></div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200"><tr><th className="p-3">Tipo / Descripción</th><th className="p-3">Fecha(s)</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{editingUserRequests.length === 0 ? (<tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No hay historial de solicitudes para este empleado.</td></tr>) : editingUserRequests.map(req => (<tr key={req.id} className="hover:bg-slate-50" onClick={() => onViewRequest(req)}><td className="p-3"><div className="font-bold text-slate-700">{req.label}</div><div className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{req.reason || 'Sin motivo'}</div></td><td className="p-3 font-medium text-slate-600">{new Date(req.startDate).toLocaleDateString()}</td><td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td><td className="p-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); if(confirm('¿Borrar registro? Se revertirá el saldo.')) { store.deleteRequest(req.id); setRefreshTick(t => t+1); } }} className="text-red-400 hover:text-red-600 font-bold hover:underline">Eliminar</button></td></tr>))}</tbody></table></div>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all">Cancelar</button><button form="userForm" type="submit" className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">{editingUser.id ? 'Guardar Ficha' : 'Crear Usuario'}</button></div>
                    </div>
                </div>
            )}
            
            {isActionModalOpen && modalActionUser && (
                <RequestFormModal user={currentUser} targetUser={modalActionUser} onClose={() => { setIsActionModalOpen(false); setModalActionUser(null); setRefreshTick(t=>t+1); }} />
            )}
        </div>
    );
};

export const AdminSettings: React.FC<{ onViewRequest: (req: LeaveRequest) => void }> = ({ onViewRequest }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'depts' | 'config' | 'epis' | 'comms'>('users');
    const adminUser: User = { id: 'admin_sys', name: 'Admin', email: '', role: Role.ADMIN, departmentId: '', daysAvailable: 0, overtimeHours: 0 };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Settings className="text-slate-400"/> Administración</h2>
            </div>
            <div className="bg-white rounded-t-2xl border-b border-slate-200 px-6 pt-4 flex gap-6 overflow-x-auto">
                {[
                    {id: 'users', label: 'Usuarios'},
                    {id: 'depts', label: 'Departamentos'},
                    {id: 'config', label: 'Configuración RRHH'},
                    {id: 'epis', label: 'EPIs'},
                    {id: 'comms', label: 'Comunicaciones'}
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="bg-transparent min-h-[500px]">
                {activeTab === 'users' && <UserManagement currentUser={adminUser} onViewRequest={onViewRequest} />}
                {activeTab === 'depts' && <DepartmentManager />}
                {activeTab === 'config' && <HRConfigManager />}
                {activeTab === 'epis' && <PPEConfigManager />}
                {activeTab === 'comms' && <CommunicationsManager />}
            </div>
        </div>
    );
};
