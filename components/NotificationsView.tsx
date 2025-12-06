import React, { useState } from 'react';
import { User } from '../types';
import { store } from '../services/store';
import { Bell, CheckCircle, XCircle, Info, Trash2, Check, Inbox } from 'lucide-react';

interface NotificationsViewProps {
  user: User;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ user }) => {
  const [refresh, setRefresh] = useState(0);
  const notifications = store.getNotificationsForUser(user.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    store.markNotificationAsRead(id);
    setRefresh(prev => prev + 1);
  };

  const handleMarkAllRead = () => {
    store.markAllNotificationsAsRead(user.id);
    setRefresh(prev => prev + 1);
  };

  const handleDelete = (id: string) => {
    store.deleteNotification(id);
    setRefresh(prev => prev + 1);
  };

  const getIcon = (msg: string) => {
      const lower = msg.toLowerCase();
      if (lower.includes('aprobada') || lower.includes('aprobado')) return <CheckCircle className="text-green-500" size={24}/>;
      if (lower.includes('rechazada') || lower.includes('rechazado')) return <XCircle className="text-red-500" size={24}/>;
      return <Info className="text-blue-500" size={24}/>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="text-slate-600"/> Mis Notificaciones
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Tienes {unreadCount} mensajes sin leer.</p>
                </div>
                {notifications.length > 0 && (
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Check size={16}/> Marcar todas leídas
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Inbox size={64} className="mb-4 text-slate-200"/>
                        <p className="text-lg font-medium">No tienes notificaciones</p>
                        <p className="text-sm">Te avisaremos cuando haya novedades en tus solicitudes.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                className={`p-4 rounded-xl border transition-all flex gap-4 items-start group
                                    ${notif.read ? 'bg-white border-slate-100' : 'bg-blue-50/50 border-blue-100 shadow-sm'}
                                `}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(notif.message)}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm ${notif.read ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(notif.date).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notif.read && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg" 
                                            title="Marcar como leída"
                                        >
                                            <Check size={16}/>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(notif.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" 
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default NotificationsView;