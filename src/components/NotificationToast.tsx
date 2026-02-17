
import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle, User } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationToastProps {
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 md:px-0">
      {notifications.map((notif) => (
        <ToastItem key={notif.id} notif={notif} onRemove={() => removeNotification(notif.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notif: AppNotification; onRemove: () => void }> = ({ notif, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };

  const getIcon = () => {
    switch (notif.type) {
      case 'success': return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-400" />;
      case 'error': return <AlertCircle size={18} className="text-rose-400" />;
      default: return <Info size={18} className="text-blue-400" />;
    }
  };

  return (
    <div 
      className={`pointer-events-auto backdrop-blur-xl bg-slate-900/80 dark:bg-slate-950/80 border border-white/10 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all duration-300 transform ${isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-in slide-in-from-right-8'}`}
    >
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        {notif.user && (
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 flex items-center">
             <User size={10} className="mr-1" /> {notif.user}
           </p>
        )}
        <p className="text-xs font-bold leading-relaxed">{notif.message}</p>
      </div>
      <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

export default NotificationToast;
