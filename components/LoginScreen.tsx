
import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, ShieldCheck, Loader2, AlertCircle, Key, Info, RotateCcw } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users: User[];
  onResetAdmin?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, users, onResetAdmin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      // Nettoyage des espaces et casse pour username/email
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      // LOGIQUE CORRIGÉE : Permettre Identifiant OU Email
      const foundUser = users.find(u => 
        (u.username.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser) && 
        (u.password === cleanPass || (!u.password && cleanPass === ''))
      );

      if (foundUser) {
        if (!foundUser.active) {
          setError('Ce compte est désactivé.');
          setIsLoading(false);
          return;
        }
        onLogin(foundUser);
      } else {
        setError('Identifiant ou mot de passe incorrect.');
        setFailedAttempts(prev => prev + 1);
        setIsLoading(false);
      }
    }, 600);
  };

  const handleForceReset = () => {
    if (onResetAdmin && confirm("Voulez-vous réinitialiser le compte 'admin' aux valeurs d'usine (admin/admin) ?")) {
      onResetAdmin();
      setError('Compte admin réinitialisé ! Essayez maintenant.');
      setUsername('admin');
      setPassword('admin');
      setFailedAttempts(0);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      
      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 w-full max-w-md rounded-[48px] p-12 shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-2xl mb-6 border border-indigo-400/30">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-1">DZ-Manager Pro</h1>
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Accès Réseau Sécurisé</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 animate-in slide-in-from-top-2 text-rose-400 text-xs font-black uppercase flex flex-col items-center">
            <div className="flex items-center">
               <AlertCircle size={18} className="mr-2" /> {error}
            </div>
            {failedAttempts >= 2 && (
              <button 
                onClick={handleForceReset}
                className="mt-3 text-[9px] bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-500 transition-colors flex items-center"
              >
                <RotateCcw size={10} className="mr-1" /> Réparer le compte Admin
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
             <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <input 
               type="text" 
               required
               autoFocus
               value={username} 
               onChange={(e) => setUsername(e.target.value)} 
               placeholder="Identifiant ou Email" 
               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-600" 
             />
          </div>
          <div className="relative">
             <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
             <input 
               type="password" 
               required
               value={password} 
               onChange={(e) => setPassword(e.target.value)} 
               placeholder="Mot de passe" 
               className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-600" 
             />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl py-5 font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-indigo-600/30 flex items-center justify-center transition-all active:scale-95"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <span>Se connecter</span>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setShowHint(!showHint)}
            className="text-[9px] text-slate-500 hover:text-indigo-400 font-black uppercase tracking-widest flex items-center justify-center mx-auto"
          >
            <Info size={12} className="mr-1" /> Besoin d'aide ?
          </button>
          {showHint && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Conseils :</p>
              <div className="text-[9px] text-slate-500 space-y-1">
                 <p>• Identifiant sensible aux minuscules</p>
                 <p>• Vérifiez que le Hub est allumé (si en réseau)</p>
                 <p>• Admin par défaut : <span className="text-indigo-400 font-mono">admin / admin</span></p>
              </div>
            </div>
          )}
        </div>
        
        <p className="mt-8 text-center text-[9px] text-slate-600 font-black uppercase tracking-widest">
            DZ-Manager ERP • Édition LAN Illimitée
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
