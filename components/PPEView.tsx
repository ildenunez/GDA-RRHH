
import React, { useState } from 'react';
import { User, Role } from '../types';
import { store } from '../services/store';
import { HardHat, Check, Clock, Package, Plus, FileText } from 'lucide-react';
import PPERequestModal from './PPERequestModal';
import PPEReportModal from './PPEReportModal';

interface PPEViewProps {
  user: User;
}

const PPEView: React.FC<PPEViewProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Logic: Admin sees all, Supervisor sees team + own, Worker sees own
  const requests = store.config.ppeRequests.filter(req => {
      if (user.role === Role.ADMIN) return true;
      if (user.role === Role.SUPERVISOR) {
          const myDepts = store.departments.filter(d => d.supervisorIds.includes(user.id)).map(d => d.id);
          const reqUser = store.users.find(u => u.id === req.userId);
          const isMyTeam = reqUser && myDepts.includes(reqUser.departmentId);
          const isMe = req.userId === user.id;
          return isMyTeam || isMe;
      }
      // Worker
      return req.userId === user.id;
  });

  const handleDeliver = async (reqId: string) => {
      if(confirm('¿Confirmar entrega de EPI al empleado?')) {
          await store.deliverPPERequest(reqId);
          window.location.reload(); 
      }
  };

  const getTypeName = (id: string) => store.config.ppeTypes.find(t => t.id === id)?.name || id;
  const getUserName = (id: string) => store.users.find(u => u.id === id)?.name || 'Usuario desconocido';
  
  const isManager = user.role === Role.ADMIN || user.role === Role.SUPERVISOR;

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
           <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <div className="flex items-center gap-3">
                   <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                       <HardHat size={24}/>
                   </div>
                   <div>
                       <h2 className="text-xl font-bold text-slate-800">Gestión de EPIS</h2>
                       <p className="text-sm text-slate-500">Solicitudes y entregas de material</p>
                   </div>
               </div>
               <div className="flex gap-2">
                   {isManager && (
                       <button 
                          onClick={() => setShowReportModal(true)}
                          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
                       >
                           <FileText size={16}/> Informe Pendientes
                       </button>
                   )}
                   <button 
                      onClick={() => setShowModal(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
                   >
                       <Plus size={16}/> Nueva Solicitud
                   </button>
               </div>
           </div>

           <div className="p-6">
               {requests.length === 0 ? (
                   <div className="text-center py-12 text-slate-400">
                       <Package size={48} className="mx-auto mb-4 opacity-50"/>
                       <p>No hay solicitudes de EPI registradas.</p>
                   </div>
               ) : (
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                               <tr>
                                   <th className="px-6 py-4">Empleado</th>
                                   <th className="px-6 py-4">Material</th>
                                   <th className="px-6 py-4">Talla</th>
                                   <th className="px-6 py-4">Fecha Solicitud</th>
                                   <th className="px-6 py-4">Estado</th>
                                   {isManager && <th className="px-6 py-4 text-right">Acción</th>}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {requests.map(req => (
                                   <tr key={req.id} className="hover:bg-slate-50">
                                       <td className="px-6 py-4 font-medium text-slate-800">{getUserName(req.userId)}</td>
                                       <td className="px-6 py-4">{getTypeName(req.typeId)}</td>
                                       <td className="px-6 py-4">
                                           <span className="bg-slate-100 px-2 py-1 rounded font-mono font-bold">{req.size}</span>
                                       </td>
                                       <td className="px-6 py-4 text-slate-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                                       <td className="px-6 py-4">
                                           {req.status === 'ENTREGADO' ? (
                                               <div className="flex flex-col">
                                                   <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full w-fit">
                                                       <Check size={12}/> ENTREGADO
                                                   </span>
                                                   <span className="text-[10px] text-slate-400 mt-1">
                                                       {req.deliveryDate ? new Date(req.deliveryDate).toLocaleDateString() : '-'}
                                                   </span>
                                               </div>
                                           ) : (
                                               <span className="flex items-center gap-1 text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded-full w-fit">
                                                   <Clock size={12}/> PENDIENTE
                                               </span>
                                           )}
                                       </td>
                                       {isManager && (
                                            <td className="px-6 py-4 text-right">
                                                {req.status === 'PENDIENTE' && (
                                                    <button 
                                                        onClick={() => handleDeliver(req.id)}
                                                        className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                                                    >
                                                        Marcar Entregado
                                                    </button>
                                                )}
                                            </td>
                                       )}
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               )}
           </div>
       </div>

       {showModal && (
           <PPERequestModal userId={user.id} onClose={() => setShowModal(false)} />
       )}
       
       {showReportModal && (
           <PPEReportModal 
                requests={requests.filter(r => r.status === 'PENDIENTE')} 
                onClose={() => setShowReportModal(false)} 
           />
       )}
    </div>
  );
};

export default PPEView;
