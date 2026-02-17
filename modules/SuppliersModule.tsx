
import React, { useState } from 'react';
import { Truck, Plus, Search, Phone, MapPin, Edit3, Trash2, X, Save, Building2, Fingerprint } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Partner, User, AuditLog, ModuleType } from '../types';

interface SuppliersModuleProps {
  suppliers: Partner[];
  setSuppliers: React.Dispatch<React.SetStateAction<Partner[]>>;
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
}

const SuppliersModule: React.FC<SuppliersModuleProps> = ({ suppliers, setSuppliers, currentUser, onAddLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partner | null>(null);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const supplierData: Partner = {
      id: editingSupplier?.id || `S-${Date.now()}`,
      name: formData.get('name') as string,
      type: 'Supplier',
      nif: formData.get('nif') as string,
      ai: formData.get('ai') as string,
      rc: formData.get('rc') as string,
      nis: formData.get('nis') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      balance: editingSupplier?.balance || 0,
      createdBy: editingSupplier?.createdBy || currentUser.name,
      updatedAt: Date.now()
    };

    if (editingSupplier) {
      setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? supplierData : s));
      onAddLog('UPDATE', ModuleType.SUPPLIERS, `Modification fournisseur ${supplierData.name}`);
    } else {
      setSuppliers([...suppliers, supplierData]);
      onAddLog('CREATE', ModuleType.SUPPLIERS, `Nouveau fournisseur ${supplierData.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const s = suppliers.find(s => s.id === id);
    if (confirm('Supprimer ce fournisseur ?')) {
      setSuppliers(suppliers.filter(s => s.id !== id));
      if (s) onAddLog('DELETE', ModuleType.SUPPLIERS, `Suppression fournisseur ${s.name}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Partenaires Fournisseurs</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 underline decoration-indigo-500 underline-offset-4 decoration-2">Base de données d'approvisionnement</p>
        </div>
        <button onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
          <Plus size={18} className="mr-3" /> Nouveau Fournisseur
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
           <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Recherche par Nom, NIF, RC..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Identité Fournisseur</th>
                <th className="px-8 py-5">Coordonnées</th>
                <th className="px-8 py-5">Fiscalité (NIF/RC)</th>
                <th className="px-8 py-5">Solde (Dette)</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mr-4 font-black text-lg">
                        {s.name[0]}
                      </div>
                      <div>
                        <span className="font-black text-slate-800 text-sm block">{s.name}</span>
                        <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter">ID: {s.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs font-bold text-slate-600"><Phone size={12} className="mr-2 text-slate-300" /> {s.phone}</div>
                      <div className="flex items-center text-[10px] font-medium text-slate-400 italic line-clamp-1"><MapPin size={12} className="mr-2 text-slate-300 shrink-0" /> {s.address}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="space-y-1 text-[10px] font-mono text-slate-500">
                      <p>NIF: {s.nif}</p>
                      <p>RC: {s.rc}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-black ${s.balance > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'} px-3 py-1.5 rounded-xl`}>
                      {formatCurrency(s.balance)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-2.5 bg-white border border-slate-200 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-white border border-slate-200 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl shadow-sm transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-20 text-center font-black uppercase text-xs text-slate-300 tracking-[0.3em]">Aucun fournisseur enregistré</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">Fiche Fournisseur</h3>
                <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1 tracking-widest">Informations Légales Algériennes</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Raison Sociale</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input name="name" required defaultValue={editingSupplier?.name} placeholder="Nom officiel" className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-tighter">NIF</label>
                    <input name="nif" required defaultValue={editingSupplier?.nif} maxLength={15} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-tighter">Art. Imp (AI)</label>
                    <input name="ai" required defaultValue={editingSupplier?.ai} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-tighter">RC</label>
                    <input name="rc" required defaultValue={editingSupplier?.rc} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-tighter">NIS</label>
                    <input name="nis" required defaultValue={editingSupplier?.nis} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Téléphone</label>
                    <input name="phone" required defaultValue={editingSupplier?.phone} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Email</label>
                    <input name="email" type="email" defaultValue={editingSupplier?.email} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Adresse Complète</label>
                  <textarea name="address" required defaultValue={editingSupplier?.address} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none h-24 text-sm font-bold focus:ring-2 focus:ring-indigo-500" placeholder="Rue, Commune, Wilaya..."></textarea>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3">
                   <Fingerprint size={20} className="text-amber-500 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                     Assurez-vous de saisir correctement les identifiants fiscaux pour la conformité de vos bons de réception.
                   </p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-slate-500 font-bold hover:text-slate-700 text-xs uppercase tracking-widest">Fermer</button>
              <button type="submit" className="px-12 py-3.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                <Save size={18} className="mr-3" /> Enregistrer Fournisseur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuppliersModule;
