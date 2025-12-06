

import React from 'react';
import { LeaveRequest, RequestStatus } from '../types';
import { store } from '../services/store';
import { X, Printer, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, User as UserIcon, MessageSquare } from 'lucide-react';

interface RequestDetailModalProps {
  request: LeaveRequest;
  onClose: () => void;
}

const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ request, onClose }) => {
  const user = store.users.find(u => u.id === request.userId);
  const dept = user ? store.departments.find(d => d.id === user.departmentId) : null;
  
  // Si es una solicitud de consumo, buscar el detalle de los registros origen
  const usageDetails = request.overtimeUsage?.map(usage => {
      const sourceReq = store.requests.find(r => r.id === usage.requestId);
      return {
          ...usage,
          sourceDate: sourceReq?.startDate,
          sourceReason: sourceReq?.reason
      };
  });

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm print:p-0 print:bg-white print:items-start">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in-up overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        
        {/* Header (No Print Actions) */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
            <h2 className="font-bold text-slate-700">Detalle de Solicitud</h2>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm text-slate-700">
                    <Printer size={16}/> Imprimir Informe
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                    <X size={20}/>
                </button>
            </div>
        </div>

        {/* Report Content */}
        <div className="p-8 print:p-0">
            {/* Header del Informe */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center rounded-xl p-2 print:border-none print:p-0">
                         <img src="https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Informe de Solicitud</h1>
                        <p className="text-slate-500 text-sm">Portal de RRHH - GdA</p>
                        <p className="text-slate-400 text-xs mt-1">Ref: {request.id}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border
                        ${request.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : 
                          request.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                    `}>
                        {request.status === RequestStatus.APPROVED && <CheckCircle size={14}/>}
                        {request.status === RequestStatus.REJECTED && <XCircle size={14}/>}
                        {request.status === RequestStatus.PENDING && <AlertCircle size={14}/>}
                        {request.status}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Creado: {new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Datos del Empleado */}
            <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos del Empleado</h3>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <span className="block text-xs text-slate-500">Nombre Completo</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-2"><UserIcon size={14}/> {user?.name}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500">Departamento</span>
                        <span className="font-semibold text-slate-800">{dept?.name || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500">Email</span>
                        <span className="font-semibold text-slate-800">{user?.email}</span>
                    </div>
                </div>
            </div>

            {/* Detalles de la Solicitud */}
            <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 print:bg-white print:border-black">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{request.label}</h3>
                
                <div className="grid grid-cols-2 gap-y-4">
                    <div>
                        <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Calendar size={14}/> Fecha Inicio</span>
                        <span className="font-medium text-slate-900">{new Date(request.startDate).toLocaleDateString()}</span>
                    </div>
                    {request.endDate && (
                        <div>
                            <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Calendar size={14}/> Fecha Fin</span>
                            <span className="font-medium text-slate-900">{new Date(request.endDate).toLocaleDateString()}</span>
                        </div>
                    )}
                    {request.hours && (
                        <div>
                            <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Clock size={14}/> Total Horas</span>
                            <span className="font-mono font-bold text-slate-900">{request.hours}h</span>
                        </div>
                    )}
                </div>

                {request.reason && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <span className="flex items-center gap-2 text-sm text-slate-500 mb-1"><FileText size={14}/> Motivo / Comentario Empleado</span>
                        <p className="text-slate-700 italic">"{request.reason}"</p>
                    </div>
                )}

                {/* Notas del Responsable */}
                {request.adminComment && (
                    <div className="mt-4 pt-4 border-t border-slate-200 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <span className="flex items-center gap-2 text-sm font-bold text-yellow-700 mb-1"><MessageSquare size={14}/> Notas del Responsable</span>
                        <p className="text-slate-700">"{request.adminComment}"</p>
                    </div>
                )}
            </div>

            {/* Trazabilidad de Horas (Si aplica) */}
            {usageDetails && usageDetails.length > 0 && (
                <div className="mb-8">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Trazabilidad de Horas Consumidas</h3>
                     <table className="w-full text-sm text-left">
                         <thead className="bg-slate-100 text-slate-600 print:bg-slate-50">
                             <tr>
                                 <th className="p-2 rounded-l-lg">Fecha Origen</th>
                                 <th className="p-2">Motivo Origen</th>
                                 <th className="p-2 text-right rounded-r-lg">Horas Usadas</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {usageDetails.map((u, i) => (
                                 <tr key={i}>
                                     <td className="p-2">{u.sourceDate ? new Date(u.sourceDate).toLocaleDateString() : 'N/A'}</td>
                                     <td className="p-2 text-slate-500 italic">{u.sourceReason || '-'}</td>
                                     <td className="p-2 text-right font-mono font-bold">{u.hoursUsed}h</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                </div>
            )}
            
            {/* Footer Firma */}
            <div className="mt-12 pt-8 border-t border-slate-200 print:flex hidden justify-between">
                <div className="text-center">
                    <div className="h-16 border-b border-slate-400 w-48 mb-2"></div>
                    <p className="text-xs text-slate-500">Firma Empleado</p>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-slate-400 w-48 mb-2"></div>
                    <p className="text-xs text-slate-500">Firma Responsable</p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default RequestDetailModal;
