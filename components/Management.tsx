
import React, { useState, useMemo } from 'react';
import { User, RequestStatus, Role, LeaveRequest, RequestType } from '../types';
import { store } from '../services/store';
import ShiftScheduler from './ShiftScheduler';
import RequestFormModal from './RequestFormModal';
import { Check, X, Users, Edit2, Shield, Trash2, AlertTriangle, FileText, Activity, Clock, CalendarDays, ExternalLink, UserPlus, MessageSquare, PieChart, Calendar, Paintbrush, Plus, CalendarClock, FileWarning, Printer, CheckSquare, Square, Lock as LockIcon, Sparkles, Loader2, Settings } from 'lucide-react';

export const UserManagement: React.FC<{ currentUser: User, onViewRequest: (req: LeaveRequest) => void }> = ({ currentUser, onViewRequest }) => {
  const [viewTab, setViewTab] = useState<'list' | 'planning' | 'justifications'>('list');
  const [users, setUsers] = useState(store.getAllUsers());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filterDeptId, setFilterDeptId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReasonDays, setAdjustmentReasonDays] = useState('');
  const [adjustmentHours, setAdjustmentHours] = useState<number>(0);
  const [adjustmentReasonHours, setAdjustmentReasonHours] = useState('');

  const displayUsers = useMemo(() => {
      let result = [...users];
      if (currentUser.role !== Role.ADMIN) {
          const myDepts = store.departments.filter(d => d.supervisorIds.includes(currentUser.id)).map(d => d.id);
          result = result.filter(u => myDepts.includes(u.departmentId));
      }
      if (filterDeptId) result = result.filter(u => u.departmentId === filterDeptId);
      
      // ORDENAMIENTO DEFENSIVO
      return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, currentUser, filterDeptId]);

  const teamStats = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      const totalMembers = displayUsers.length;
      const absentMembers = displayUsers.filter(u => {
          return store.requests.some(r => r.userId === u.id && r.status === RequestStatus.APPROVED && !store.isOvertimeRequest(r.typeId) && r.typeId !== RequestType.ADJUSTMENT_DAYS && today >= (r.startDate || '').split('T')[0] && today <= ((r.endDate || r.startDate) || '').split('T')[0]);
      });
      return { totalPendingDays: displayUsers.reduce((s,u) => s+(u.daysAvailable||0),0), totalPendingHours: displayUsers.reduce((s,u) => s+(u.overtimeHours||0),0), absentPercentage: totalMembers > 0 ? (absentMembers.length / totalMembers) * 100 : 0 };
  }, [displayUsers, store.requests.length]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editingUser) return;

    if (editingUser.id === '') {
        await store.createUser(editingUser, newPassword);
    } else {
        await store.updateUserAdmin(editingUser.id, { name: editingUser.name, email: editingUser.email, departmentId: editingUser.departmentId });
        await store.updateUserRole(editingUser.id, editingUser.role);
        
        if (adjustmentDays !== 0) {
            await store.createRequest({ typeId: RequestType.ADJUSTMENT_DAYS, label: 'Ajuste de Saldo', startDate: new Date().toISOString(), hours: adjustmentDays, reason: adjustmentReasonDays || 'Ajuste manual Admin' }, editingUser.id, RequestStatus.APPROVED);
        }
        if (adjustmentHours !== 0) {
            await store.createRequest({ typeId: RequestType.ADJUSTMENT_OVERTIME, label: 'Ajuste Horas Extra', startDate: new Date().toISOString(), hours: adjustmentHours, reason: adjustmentReasonHours || 'Ajuste manual Admin' }, editingUser.id, RequestStatus.APPROVED);
        }
    }
    setUsers(store.getAllUsers());
    setEditingUser(null);
  };

  const isCreating = editingUser && editingUser.id === '';

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ausencia Actual</h3>
              <div className="text-2xl font-bold text-slate-800">{teamStats.absentPercentage.toFixed(0)}%</div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Días Pendientes</h3>
              <div className="text-2xl font-bold text-slate-800">{teamStats.totalPendingDays}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Horas de Equipo</h3>
              <div className="text-2xl font-bold text-slate-800">{teamStats.totalPendingHours}h</div>
          </div>
      </div>

      <div className="flex border-b overflow-x-auto">
         <button onClick={() => setViewTab('list')} className={`px-6 py-3 text-sm font-bold border-b-2 ${viewTab==='list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Lista de Empleados</button>
         <button onClick={() => setViewTab('planning')} className={`px-6 py-3 text-sm font-bold border-b-2 ${viewTab==='planning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Planificación</button>
      </div>

      {viewTab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Empleados</h2>
                <div className="flex gap-2">
                    {currentUser.role === Role.ADMIN && <button onClick={() => { setAdjustmentDays(0); setAdjustmentHours(0); setNewPassword(''); setEditingUser({ id: '', name: '', email: '', role: Role.WORKER, departmentId: store.departments[0]?.id || '', daysAvailable: 22, overtimeHours: 0 }); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><UserPlus size={16}/> Nuevo</button>}
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-500"><tr><th className="px-6 py-4">Empleado</th><th className="px-6 py-4">Dpto.</th><th className="px-6 py-4 text-center">Días</th><th className="px-6 py-4 text-center">Horas</th><th className="px-6 py-4 text-right">Acciones</th></tr></thead>
                  <tbody className="divide-y">
                  {displayUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold">{u.name}</td>
                          <td className="px-6 py-4 text-slate-500">{store.departments.find(d => d.id === u.departmentId)?.name}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-orange-600">{u.daysAvailable}</td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-blue-600">{u.overtimeHours}h</td>
                          <td className="px-6 py-4 text-right"><button onClick={() => { setAdjustmentDays(0); setAdjustmentHours(0); setEditingUser({...u}); }} className="text-blue-600 p-2"><Edit2 size={16}/></button></td>
                      </tr>
                  ))}
                  </tbody>
              </table>
            </div>
        </div>
      )}

      {viewTab === 'planning' && <ShiftScheduler users={displayUsers} />}

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold">{isCreating ? 'Nuevo Empleado' : `Ficha: ${editingUser.name}`}</h3>
                <button onClick={() => setEditingUser(null)}><X /></button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="block text-sm font-semibold mb-2">Nombre</label><input type="text" required className="w-full p-2 border rounded-lg" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
                  <div><label className="block text-sm font-semibold mb-2">Email</label><input type="email" required className="w-full p-2 border rounded-lg" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} /></div>
                  <div><label className="block text-sm font-semibold mb-2">Departamento</label><select className="w-full p-2 border rounded-lg" value={editingUser.departmentId} onChange={e => setEditingUser({...editingUser, departmentId: e.target.value})}>{store.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  <div><label className="block text-sm font-semibold mb-2">Rol</label><select className="w-full p-2 border rounded-lg" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} disabled={currentUser.role !== Role.ADMIN}><option value={Role.WORKER}>Trabajador</option><option value={Role.SUPERVISOR}>Supervisor</option><option value={Role.ADMIN}>Admin</option></select></div>
                  {isCreating && (
                    <div><label className="block text-sm font-semibold mb-2">Contraseña Inicial</label><input type="password" required minLength={6} className="w-full p-2 border rounded-lg" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Contraseña para el nuevo usuario" /></div>
                  )}
              </div>
              {!isCreating && (
                <div className="bg-slate-50 p-6 rounded-2xl border space-y-4">
                  <h4 className="font-bold flex items-center gap-2">Ajustes Directos (Impacto Inmediato)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <p className="text-xs font-bold text-orange-800 mb-2">DIAS DISPONIBLES: {editingUser.daysAvailable}</p>
                          <div className="flex gap-2">
                              <input type="number" step="0.5" placeholder="+/- días" className="w-24 p-2 border rounded font-bold" value={adjustmentDays} onChange={e => setAdjustmentDays(parseFloat(e.target.value) || 0)} />
                              <input type="text" placeholder="Motivo..." className="flex-1 p-2 border rounded text-sm" value={adjustmentReasonDays} onChange={e => setAdjustmentReasonDays(e.target.value)} />
                          </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 mb-2">HORAS EXTRA: {editingUser.overtimeHours}h</p>
                          <div className="flex gap-2">
                              <input type="number" step="0.5" placeholder="+/- horas" className="w-24 p-2 border rounded font-bold" value={adjustmentHours} onChange={e => setAdjustmentHours(parseFloat(e.target.value) || 0)} />
                              <input type="text" placeholder="Motivo..." className="flex-1 p-2 border rounded text-sm" value={adjustmentReasonHours} onChange={e => setAdjustmentReasonHours(e.target.value)} />
                          </div>
                      </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-6 border-t">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2 text-slate-600 font-bold">Cancelar</button>
                  <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const JustificationControl = () => <div>Control de Justificantes</div>;
export const Approvals = ({user, onViewRequest}: any) => <div>Gestión de Aprobaciones</div>;
export const UpcomingAbsences = ({user, onViewRequest}: any) => <div>Próximas Ausencias del Equipo</div>;

export const AdminSettings: React.FC<{ onViewRequest: (req: LeaveRequest) => void }> = () => (
    <div className="p-8 bg-white rounded-2xl border shadow-sm text-center space-y-4">
        <Settings size={64} className="mx-auto text-slate-300" />
        <h3 className="text-xl font-bold text-slate-800">Panel de Configuración RRHH</h3>
        <p className="text-slate-500 max-w-md mx-auto">Esta sección permite gestionar los tipos de ausencia, la configuración del servidor de correo, los turnos disponibles y los días festivos del calendario.</p>
    </div>
);
