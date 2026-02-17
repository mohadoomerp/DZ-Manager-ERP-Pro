
import React, { useState, useMemo } from 'react';
import { LayoutTemplate, Plus, Trash2, Settings2, Save, Eye, Copy, Share2, CheckCircle2, ChevronRight, ListPlus, X, Download, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import { EventBooking, CategoryFormConfig, FormField, FormFieldType } from '../../../types';

interface FormBuilderTabProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
}

const CATEGORIES = [
  { id: 'pro', label: 'Visiteur Pro', color: 'bg-indigo-600' },
  { id: 'vip', label: 'VIP', color: 'bg-amber-500' },
  { id: 'press', label: 'Presse', color: 'bg-rose-500' },
  { id: 'student', label: 'Étudiant', color: 'bg-emerald-600' },
];

const FIELD_TYPES: { id: FormFieldType; label: string }[] = [
  { id: 'text', label: 'Texte Court' },
  { id: 'textarea', label: 'Texte Long (Paragraphe)' },
  { id: 'email', label: 'Adresse Email' },
  { id: 'tel', label: 'Numéro de Téléphone' },
  { id: 'select', label: 'Liste de choix' },
  { id: 'checkbox', label: 'Case à cocher (Oui/Non)' },
];

const FormBuilderTab: React.FC<FormBuilderTabProps> = ({ event, setEvents }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(CATEGORIES[0].id);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const currentConfig = useMemo(() => {
    const existing = (event.formConfigs || []).find(c => c.categoryId === selectedCatId);
    return existing || { categoryId: selectedCatId, isEnabled: true, fields: [], welcomeMessage: 'Bienvenue sur le formulaire d\'inscription.' };
  }, [event.formConfigs, selectedCatId]);

  // Génération du lien public (Simulation)
  const publicLink = useMemo(() => {
      return `https://reg.dz-manager.dz/e/${event.id}/register?cat=${selectedCatId}`;
  }, [event.id, selectedCatId]);

  // URL du QR Code (Utilisation d'une API de génération de QR Code rapide)
  const qrCodeImageUrl = useMemo(() => {
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicLink)}`;
  }, [publicLink]);

  const updateConfig = (updates: Partial<CategoryFormConfig>) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === event.id) {
        const configs = ev.formConfigs || [];
        const index = configs.findIndex(c => c.categoryId === selectedCatId);
        const newConfigs = [...configs];
        if (index >= 0) {
          newConfigs[index] = { ...newConfigs[index], ...updates };
        } else {
          newConfigs.push({ ...currentConfig, ...updates });
        }
        return { ...ev, formConfigs: newConfigs, updatedAt: Date.now() };
      }
      return ev;
    }));
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(publicLink);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
  };

  const addField = () => {
    const newField: FormField = { id: `field-${Date.now()}`, label: 'Nouveau champ', type: 'text', required: false, placeholder: 'Votre réponse...' };
    updateConfig({ fields: [...currentConfig.fields, newField] });
  };

  const removeField = (fieldId: string) => {
    updateConfig({ fields: currentConfig.fields.filter(f => f.id !== fieldId) });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    updateConfig({ fields: currentConfig.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      
      {/* Sidebar: Catégories & Statut */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
          <div className="flex items-center space-x-3 text-indigo-600">
            <LayoutTemplate size={24} />
            <h3 className="font-black uppercase text-sm tracking-widest">Form Engine</h3>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cible du formulaire</label>
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCatId === cat.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">{cat.label}</span>
                  </div>
                  {selectedCatId === cat.id && <CheckCircle2 size={16} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
             <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut Public</span>
                <button 
                  onClick={() => updateConfig({ isEnabled: !currentConfig.isEnabled })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${currentConfig.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${currentConfig.isEnabled ? 'left-7' : 'left-1'}`} />
                </button>
             </div>
             
             <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setIsShareOpen(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg">
                    <Share2 size={16} className="mr-2 text-indigo-400" /> Partager / QR Code
                </button>
                <button onClick={() => setIsPreviewOpen(true)} className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-200 dark:border-slate-700">
                    <Eye size={14} className="mr-2" /> Prévisualiser
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content: Field Builder */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[600px]">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl shadow-sm"><Settings2 size={24} /></div>
              <div>
                 <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Éditeur de champs</h4>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personnalisation pour {CATEGORIES.find(c => c.id === selectedCatId)?.label}</p>
              </div>
            </div>
            <button onClick={addField} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-lg flex items-center hover:bg-indigo-700 transition-all">
              <Plus size={16} className="mr-2" /> Ajouter un champ
            </button>
          </div>

          <div className="space-y-4 flex-1">
             <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Message de bienvenue</label>
                <textarea 
                  value={currentConfig.welcomeMessage}
                  onChange={e => updateConfig({ welcomeMessage: e.target.value })}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Merci de remplir vos informations pour obtenir votre badge..."
                  rows={2}
                />
             </div>

             <div className="h-px bg-slate-100 dark:bg-slate-800 my-6" />

             {currentConfig.fields.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center py-20">
                  <ListPlus size={64} className="mb-4 text-indigo-200" />
                  <p className="text-sm font-black uppercase">Aucun champ personnalisé</p>
                  <p className="text-xs">Les champs standards sont automatiquement inclus.</p>
               </div>
             ) : (
               <div className="space-y-4">
                  {currentConfig.fields.map((field, idx) => (
                    <div key={field.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700 group animate-in slide-in-from-top-2">
                       <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase">Libellé du champ</label>
                                   <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold outline-none" />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[9px] font-black text-slate-400 uppercase">Type de saisie</label>
                                   <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as any })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold outline-none">
                                      {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                   </select>
                                </div>
                             </div>
                             {field.type === 'select' && (
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">Options (séparées par des virgules)</label>
                                  <input value={field.options?.join(', ') || ''} onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })} className="w-full px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold outline-none" placeholder="Option 1, Option 2..." />
                               </div>
                             )}
                          </div>
                          <div className="flex items-center space-x-6 shrink-0 border-l border-slate-200 dark:border-slate-700 pl-6">
                             <label className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={field.required} onChange={e => updateField(field.id, { required: e.target.checked })} className="w-4 h-4 accent-indigo-600 rounded" /><span className="text-[9px] font-black uppercase text-slate-500">Obligatoire</span></label>
                             <button onClick={() => removeField(field.id)} className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Modal de Partage & QR Code */}
      {isShareOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                 <div className="flex items-center space-x-3">
                    <QrIcon size={24} />
                    <h3 className="text-xl font-black uppercase tracking-tight">Lien d'inscription</h3>
                 </div>
                 <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
              </div>
              <div className="p-10 text-center space-y-8">
                 <div className="space-y-2">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {CATEGORIES.find(c => c.id === selectedCatId)?.label}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Scanner pour s'enregistrer</p>
                 </div>

                 {/* QR Code Container */}
                 <div className="bg-white p-6 rounded-[40px] shadow-inner border-4 border-slate-50 mx-auto w-fit">
                    <img src={qrCodeImageUrl} alt="QR Code" className="w-48 h-48" />
                 </div>

                 <div className="space-y-4">
                    <div className="relative">
                        <input 
                            readOnly 
                            value={publicLink} 
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-[10px] font-mono font-bold text-slate-500 border border-slate-100 dark:border-slate-700 outline-none pr-12"
                        />
                        <button 
                            onClick={handleCopyLink}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${copyFeedback ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}
                        >
                            {copyFeedback ? <CheckCircle2 size={16}/> : <Copy size={16}/>}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <a href={qrCodeImageUrl} download={`QR_Register_${selectedCatId}.png`} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center hover:bg-slate-200 transition-all">
                            <Download size={14} className="mr-2" /> QR Code
                        </a>
                        <button className="py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center hover:bg-indigo-100 transition-all">
                            <ExternalLink size={14} className="mr-2" /> Tester
                        </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Prévisualisation (Simulation Mobile) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                 <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center"><Eye size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight">Mode Mobile</h3>
                       <p className="text-[10px] text-indigo-300 font-bold uppercase">{CATEGORIES.find(c => c.id === selectedCatId)?.label}</p>
                    </div>
                 </div>
                 <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                 <div className="text-center">
                    {event.logoUrl && <img src={event.logoUrl} className="h-16 mx-auto mb-4 object-contain" alt="Logo" />}
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight">{event.title}</h2>
                    <p className="text-xs text-indigo-600 font-bold mt-2 italic px-4">"{currentConfig.welcomeMessage}"</p>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-4">
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet *</label><input disabled className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm border-2 border-transparent" placeholder="MOHAMED AMINE..." /></div>
                       <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entreprise</label><input disabled className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm border-2 border-transparent" /></div>
                    </div>
                    <div className="space-y-4">
                       {currentConfig.fields.map(field => (
                          <div key={field.id} className="space-y-1">
                             <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">{field.label} {field.required && '*'}</label>
                             {field.type === 'select' ? (
                               <select disabled className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none border-2 border-transparent">{field.options?.map(opt => <option key={opt}>{opt}</option>)}</select>
                             ) : field.type === 'textarea' ? (
                               <textarea disabled className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm border-2 border-transparent h-24" />
                             ) : (
                               <input disabled type={field.type} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm border-2 border-transparent" />
                             )}
                          </div>
                       ))}
                    </div>
                    <button disabled className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl opacity-50">S'inscrire</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilderTab;
