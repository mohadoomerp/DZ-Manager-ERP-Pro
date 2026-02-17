
import React, { useState } from 'react';
import { CalendarDays, X, ImageIcon, Camera, ArrowRight, Tag } from 'lucide-react';
import { EventBooking } from '../../../types';

interface EventFormProps {
  initialData?: EventBooking;
  onSubmit: (formData: any) => void;
  onCancel: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    theme: initialData?.theme || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    logoUrl: initialData?.logoUrl || '',
    registrationFee: initialData?.registrationFee?.toString() || ''
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
           <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-50 rounded-2xl shadow-lg"><CalendarDays size={24} className="text-indigo-600" /></div><div><h2 className="text-xl font-black uppercase tracking-widest">{initialData ? 'Modifier Événement' : 'Nouveau Dossier Événement'}</h2></div></div>
           <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-3 gap-12">
           <div className="flex flex-col items-center space-y-6">
              <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800 rounded-[40px] border-4 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group shadow-inner">
                 {formData.logoUrl ? <img src={formData.logoUrl} className="w-full h-full object-cover" /> : <ImageIcon size={48} className="text-slate-200" />}
                 <label className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"><Camera className="text-white" size={32} /><input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" /></label>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Logo de l'événement</p>
           </div>
           <div className="md:col-span-2 space-y-8">
              <div className="space-y-6">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Titre de l'Événement</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-black uppercase outline-none focus:border-indigo-600" placeholder="Ex: Salon de l'Auto 2025" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Thème Principal</label><div className="relative"><Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold outline-none focus:border-indigo-600" placeholder="Ex: Automobile, Tech, Agriculture..." /></div></div>
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Date Début</label><input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Date Fin</label><input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none" /></div>
                 </div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Frais d'inscription (HT)</label><input type="number" value={formData.registrationFee} onChange={e => setFormData({...formData, registrationFee: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-black text-emerald-600 outline-none focus:border-indigo-600" /></div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase text-xs shadow-xl flex items-center justify-center transition-all">{initialData ? 'Mettre à jour' : 'Ouvrir l\'événement'} <ArrowRight size={18} className="ml-3" /></button>
           </div>
        </form>
    </div>
  );
};

export default EventForm;
