
import React from 'react';
import { PPERequest } from '../types';
import { store } from '../services/store';
import { X, Printer, Package } from 'lucide-react';

interface PPEReportModalProps {
  requests: PPERequest[];
  onClose: () => void;
}

const PPEReportModal: React.FC<PPEReportModalProps> = ({ requests, onClose }) => {
  const handlePrint = () => window.print();

  // Group by Type
  const groupedRequests: Record<string, PPERequest[]> = {};
  requests.forEach(req => {
      if (!groupedRequests[req.typeId]) groupedRequests[req.typeId] = [];
      groupedRequests[req.typeId].push(req);
  });

  const getTypeName = (id: string) => store.config.ppeTypes.find(t => t.id === id)?.name || id;
  const getUserName = (id: string) => store.users.find(u => u.id === id)?.name || 'Desconocido';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm print:p-0 print:bg-white print:items-start">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-fade-in-up overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none h-[90vh] flex flex-col print:h-auto">
        
        {/* Header (No Print) */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden shrink-0">
            <h2 className="font-bold text-slate-700 flex items-center gap-2"><Package size={20}/> Informe de EPIs Pendientes</h2>
            <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm text-slate-700">
                    <Printer size={16}/> Imprimir
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                    <X size={20}/>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto print:overflow-visible print:p-0 flex-1">
             <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-slate-100">
                 <div className="w-16 h-16 object-contain">
                     <img src="https://termosycalentadoresgranada.com/wp-content/uploads/2025/08/https___cdn.evbuc_.com_images_677236879_73808960223_1_original.png" alt="Logo" className="w-full h-full object-contain"/>
                 </div>
                 <div>
                     <h1 className="text-2xl font-bold text-slate-900">Listado de EPIs Pendientes de Entrega</h1>
                     <p className="text-sm text-slate-500">Fecha de emisión: {new Date().toLocaleDateString()}</p>
                 </div>
             </div>

             {Object.keys(groupedRequests).length === 0 ? (
                 <p className="text-center text-slate-400 py-10">No hay solicitudes pendientes.</p>
             ) : (
                 Object.keys(groupedRequests).map(typeId => (
                     <div key={typeId} className="mb-8 break-inside-avoid">
                         <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1 bg-slate-50 p-2 rounded-t-lg print:bg-transparent print:p-0">
                             {getTypeName(typeId)} <span className="text-sm font-normal text-slate-500 ml-2">({groupedRequests[typeId].length})</span>
                         </h3>
                         <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                             <thead className="bg-slate-100 text-slate-600 font-semibold print:bg-slate-50">
                                 <tr>
                                     <th className="p-3 border-b">Empleado</th>
                                     <th className="p-3 border-b">Talla</th>
                                     <th className="p-3 border-b">Fecha Solicitud</th>
                                     <th className="p-3 border-b text-center w-32">Check Entrega</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {groupedRequests[typeId].map(req => (
                                     <tr key={req.id}>
                                         <td className="p-3 font-medium">{getUserName(req.userId)}</td>
                                         <td className="p-3 font-mono font-bold">{req.size}</td>
                                         <td className="p-3">{new Date(req.createdAt).toLocaleDateString()}</td>
                                         <td className="p-3 border-l border-slate-100"></td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 ))
             )}
        </div>
      </div>
    </div>
  );
};

export default PPEReportModal;
