
import React, { useState } from 'react';
import { UserPlus, UserCircle, ShieldCheck, Mail, Lock, X, Save, Trash2, Edit3, Key, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { User, UserRole, AuditLog, ModuleType } from '../types';

interface UsersModuleProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
  maxUsers?: number; // Prop passée depuis la licence
}

const UsersModule: React.FC<UsersModuleProps> = ({ users, setUsers, currentUser, onAddLog, maxUsers = 999 }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const roles: { id: UserRole, label: string, color: string }[] = [
    { id: 'ADMIN', label: 'Administrateur Total', color: 'bg-rose-500' },
    { id: 'MANAGER', label: 'Gérant de Société', color: 'bg-indigo-600' },
    { id: 'ACCOUNTANT', label: 'Comptable Fiscaliste', color: 'bg-amber-500' },
    { id: 'SALES', label: 'Agent Commercial', color: 'bg-emerald-600' },
    { id: 'HR_MANAGER', label: 'Responsable RH', color: 'bg-blue-600' }
  ];

  const handleCreateClick = () => {
      // Vérification de la limite de licence
      if (!editingUser && users.length >= maxUsers) {
          alert(`Limite de licence atteinte (${maxUsers} utilisateurs max).\nVeuillez contacter le support pour augmenter votre pack.`);
          return;
      }
      setEditingUser(null);
      setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pass = formData.get('password') as string;
    
    // Double check en cas de contournement UI
    if (!editingUser && users.length >= maxUsers) return;

    const userData: User = {
      id: editingUser?.id || `U-${Date.now()}`,
      username: formData.get('username') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as UserRole,
      email: formData.get('email') as string,
      password: pass || editingUser?.password || '',
      active: true,
      updatedAt: Date.now() // CRITIQUE POUR LA SYNC
    };

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? userData : u));
      onAddLog('UPDATE', ModuleType.USERS, `Modification utilisateur ${userData.username}`);
    } else {
      setUsers([userData, ...users]);
      onAddLog('CREATE', ModuleType.USERS, `Création utilisateur ${userData.username}`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) return alert("Vous ne pouvez pas supprimer votre propre compte.");
    const userToDelete = users.find(u => u.id === id);
    if (confirm("Supprimer définitivement cet accès utilisateur ?")) {
      setUsers(users.filter(u => u.id !== id));
      if(userToDelete) onAddLog('DELETE', ModuleType.USERS, `Suppression utilisateur ${userToDelete.username}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gestion des Accès</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Utilisateurs & Rôles de l'ERP</p>
        </div>
        <div className="flex items-center space-x-4">
            <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-full border ${users.length >= maxUsers ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                {users.length} / {maxUsers === 999 ? '∞' : maxUsers} Utilisateurs
            </span>
            <button onClick={handleCreateClick} className={`px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-xl transition-all active:scale-95 ${users.length >= maxUsers ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}>
            <UserPlus size={18} className="mr-3" /> Nouvel Utilisateur
            </button>
        </div>
      </div>

      {users.length >= maxUsers && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center text-amber-800 dark:text-amber-200">
              <AlertCircle size={20} className="mr-3 shrink-0" />
              <p className="text-xs font-bold">Votre licence actuelle limite le nombre d'utilisateurs. Mise à niveau requise pour ajouter d'autres membres.</p>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map(user => (
          <div key={user.id} className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 group relative flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-[28px] flex items-center justify-center font-black text-3xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                {(user.name?.[0] || user.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingUser(user); setIsModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Edit3 size={18} /></button>
                {user.id !== currentUser.id && (
                  <button onClick={() => handleDeleteUser(user.id)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={18} /></button>
                )}
              </div>
            </div>
            
            <h3 className="font-black text-slate-800 dark:text-white text-xl leading-tight mb-2">{user.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">@{user.username}</p>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400"><Mail size={14} className="mr-3 text-slate-300 dark:text-slate-600" /> {user.email}</div>
              <div className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                 <ShieldCheck size={14} className={`mr-3 ${roles.find(r => r.id === user.role)?.color.replace('bg-', 'text-')}`} /> 
                 {roles.find(r => r.id === user.role)?.label}
              </div>
            </div>

            <div className={`mt-auto -mx-8 -mb-8 p-6 rounded-b-[48px] flex justify-between items-center ${roles.find(r => r.id === user.role)?.color} text-white`}>
               <span className="text-[10px] font-black uppercase tracking-widest">Niveau : {user.role}</span>
               {user.active ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSaveUser} className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">{editingUser ? 'Modifier Utilisateur' : 'Créer un Profil'}</h3>
                <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1 tracking-widest">Sécurité des accès ERP</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nom Complet</label>
                  <input name="name" required defaultValue={editingUser?.name} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Identifiant (Login)</label>
                  <input name="username" required defaultValue={editingUser?.username} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-indigo-600 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Rôle & Permissions</label>
                <select name="role" defaultValue={editingUser?.role || 'SALES'} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-700 dark:text-white outline-none">
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Email</label>
                <input name="email" type="email" required defaultValue={editingUser?.email} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">{editingUser ? 'Nouveau Mot de Passe (laisser vide pour garder l\'ancien)' : 'Mot de Passe Initial'}</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" name="password" required={!editingUser} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold text-slate-700 dark:text-white" />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-slate-500 font-bold hover:text-slate-700 dark:hover:text-white text-xs uppercase tracking-widest">Annuler</button>
              <button type="submit" className="px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all">
                <Save size={18} className="mr-3" /> {editingUser ? 'Mettre à jour' : 'Activer Profil'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UsersModule;
