
import React, { useState } from 'react';
import { store } from '../services/store';
import { X, HardHat, Loader2, Ruler } from 'lucide-react';

interface PPERequestModalProps {
  onClose: () => void;
  userId: string;
}

const PPERequestModal: React.FC<PPERequestModalProps> = ({ onClose, userId }) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const types = store.config.ppeTypes;
  const currentType = types.find(t => t.id === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedSize) return;

    setIsSubmitting(true);
    await store.createPPERequest(userId, selectedType, selectedSize);
    setIsSubmitting(false);
    onClose();
    alert('Solicitud de EPI enviada correctamente.');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <HardHat className="text-orange-500"/> Solicitar EPI
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {types.length === 0 ? (
                <p className="text-slate-500 text-center italic">No hay tipos de EPI configurados por el administrador.</p>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Elemento de Protección</label>
                        <select 
                            required
                            className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                            value={selectedType}
                            onChange={e => { setSelectedType(e.target.value); setSelectedSize(''); }}
                        >
                            <option value="">Selecciona un tipo...</option>
                            {types.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {currentType && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Ruler size={16} /> Talla / Medida
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {currentType.sizes.map(size => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setSelectedSize(size)}
                                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                                            selectedSize === size 
                                            ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-200' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={!selectedType || !selectedSize || isSubmitting}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : 'Enviar Solicitud'}
                        </button>
                    </div>
                </>
            )}
        </form>
      </div>
    </div>
  );
};

export default PPERequestModal;
