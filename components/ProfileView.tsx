
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { store } from '../services/store';
import { Camera, Mail, User as UserIcon, Lock, Save, Loader2, Upload, Briefcase } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onProfileUpdate?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onProfileUpdate }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dept = store.departments.find(d => d.id === user.departmentId);
  const supervisorNames = dept?.supervisorIds
    .map(id => store.users.find(u => u.id === id)?.name)
    .filter(Boolean)
    .join(', ') || 'No asignado';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              // Convertir a base64 para previsualización y guardado
              const base64String = reader.result as string;
              setAvatar(base64String);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await store.updateUserProfile(user.id, {
              name,
              email,
              password,
              avatar
          });
          alert('Perfil actualizado correctamente');
          if (onProfileUpdate) onProfileUpdate();
      } catch (error) {
          alert('Error al actualizar el perfil');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-2xl mx-auto">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                <UserIcon className="text-blue-600"/>
                <h2 className="text-xl font-bold text-slate-800">Mi Perfil</h2>
            </div>
            
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
                                <img src={avatar || `https://ui-avatars.com/api/?name=${name}`} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white w-8 h-8"/>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <p className="text-sm text-slate-500">Haz clic en la imagen para cambiarla</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Nombre Completo</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
                                <input 
                                    type="text" 
                                    required 
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-2">Supervisor Asignado</label>
                             <div className="relative">
                                 <Briefcase className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
                                 <div className="w-full pl-10 p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-600">
                                     {supervisorNames}
                                 </div>
                             </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Nueva Contraseña (Opcional)</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5"/>
                                <input 
                                    type="password" 
                                    placeholder="Dejar en blanco para mantener la actual"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                            Guardar Cambios
                        </button>
                    </div>

                </form>
            </div>
        </div>
    </div>
  );
};

export default ProfileView;
