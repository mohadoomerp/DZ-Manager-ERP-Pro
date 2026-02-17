

import React, { useState } from 'react';
// Added missing Save icon import
import { UserCheck, ScanFace, Printer, Trash2, Edit3, Plus, Search, Mail, Phone, Building2, CheckCircle2, X, QrCode, UserMinus, Send, Loader2, MailCheck, ShieldCheck, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { EventBooking, Visitor, CompanySettings, BadgeTemplate } from '../../../types';
import { formatCurrency } from '../../../constants';

interface VisitorsTabProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  companySettings: CompanySettings;
}

const CATEGORIES: Record<string, string> = {
  'pro': 'bg-indigo-600',
  'vip': 'bg-amber-500',
  'press': 'bg-rose-500',
  'student': 'bg-emerald-600',
};

const CATEGORY_LABELS: Record<string, string> = {
    'pro': 'Visiteur Pro',
    'vip': 'VIP',
    'press': 'Presse',
    'student': 'Étudiant'
};

const VisitorsTab: React.FC<VisitorsTabProps> = ({ event, setEvents, companySettings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [badgePreview, setBadgePreview] = useState<Visitor | null>(null);
  
  // États pour l'envoi d'email
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null); // ID du visiteur
  const [emailPreview, setEmailPreview] = useState<{ visitor: Visitor; content: string } | null>(null);

  const filteredVisitors = (event.visitors || []).filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleCheckIn = (id: string) => {
      setEvents(prev => prev.map(ev => {
          if (ev.id === event.id) {
              return {
                  ...ev,
                  visitors: (ev.visitors || []).map(v => v.id === id ? { ...v, isCheckedIn: !v.isCheckedIn, updatedAt: Date.now() } : v)
              };
          }
          return ev;
      }));
  };

  const handleSendBadgeEmail = async (visitor: Visitor) => {
      setIsSendingEmail(visitor.id);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            Génère un email professionnel de confirmation d'inscription pour l'événement suivant :
            Événement : ${event.title}
            Visiteur : ${visitor.name} (${visitor.company})
            Catégorie : ${visitor.category}
            Lieu : ${companySettings.address}, ${companySettings.wilaya}
            
            Instructions :
            1. Ton chaleureux et professionnel.
            2. Mentionne que son badge avec QR Code est joint (ou disponible en bas de l'email).
            3. Ajoute une note sur la protection des données personnelles selon la loi algérienne 18-07.
            4. Réponds en Français.
            Retourne UNIQUEMENT le corps de l'email en format HTML simple, sans balises <html> ou <body>.
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          const emailContent = response.text || "Erreur de génération du message.";
          
          // Simulation d'envoi réussi
          setTimeout(() => {
              setEvents(prev => prev.map(ev => ev.id === event.id ? {
                  ...ev,
                  visitors: (ev.visitors || []).map(v => v.id === visitor.id ? { ...v, isEmailSent: true, emailSentAt: Date.now() } : v)
              } : ev));
              
              setEmailPreview({ visitor, content: emailContent });
              setIsSendingEmail(null);
          }, 1500);

      } catch (error) {
          alert("Erreur lors de la génération de l'email.");
          setIsSendingEmail(null);
      }
  };

  const handleSaveVisitor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const visitor: Visitor = {
      id: editingVisitor?.id || `VIS-${Date.now()}`,
      name: fd.get('name') as string,
      company: fd.get('company') as string,
      category: fd.get('category') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      isCheckedIn: editingVisitor?.isCheckedIn || false,
      // Fixed isEmailSent property which is required by Visitor interface
      isEmailSent: editingVisitor?.isEmailSent || false,
      updatedAt: Date.now()
    };

    setEvents(prev => prev.map(ev => ev.id === event.id ? {
      ...ev,
      visitors: editingVisitor 
        ? (ev.visitors || []).map(v => v.id === editingVisitor.id ? visitor : v)
        : [...(ev.visitors || []), visitor]
    } : ev));
    
    setIsModalOpen(false);
    setEditingVisitor(null);

    // Auto-envoi pour les nouveaux si coché (simulé)
    if (!editingVisitor) {
        handleSendBadgeEmail(visitor);
    }
  };

  const BadgePreview = ({ visitor }: { visitor: Visitor }) => {
    const template: BadgeTemplate = event.badgeTemplate || {
      widthMm: 85,
      heightMm: 120,
      fields: {
        name: { x: 50, y: 40, fontSize: 24, color: '#000000', isBold: true, isVisible: true },
        company: { x: 50, y: 50, fontSize: 16, color: '#666666', isBold: false, isVisible: true },
        category: { x: 50, y: 85, fontSize: 14, color: '#ffffff', isBold: true, isVisible: true },
        qrCode: { x: 50, y: 70, size: 80, isVisible: true }
      }
    };

    const colorClass = CATEGORIES[visitor.category] || 'bg-slate-900';
    const qrData = `DZ-CHECKIN|${event.id}|${visitor.id}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    return (
      <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div 
          className="bg-white shadow-2xl flex flex-col text-black font-sans relative overflow-hidden print:shadow-none print:static"
          style={{ width: `${template.widthMm}mm`, height: `${template.heightMm}mm` }}
        >
          {template.backgroundImage ? (
            <img src={template.backgroundImage} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0">
               <div className={`w-full h-8 ${colorClass}`} />
               <div className="p-6 flex flex-col items-center">
                  {event.logoUrl && <img src={event.logoUrl} className="h-16 object-contain mb-6" />}
               </div>
            </div>
          )}

          {template.fields.name.isVisible && (
            <div className="absolute transform -translate-x-1/2 text-center" style={{ 
                left: `${template.fields.name.x}%`, 
                top: `${template.fields.name.y}%`, 
                fontSize: `${template.fields.name.fontSize}px`, 
                color: template.fields.name.color, 
                fontWeight: template.fields.name.isBold ? '900' : '400',
                whiteSpace: 'nowrap'
            }}>
              {visitor.name.toUpperCase()}
            </div>
          )}

          {template.fields.company.isVisible && (
            <div className="absolute transform -translate-x-1/2 text-center" style={{ 
                left: `${template.fields.company.x}%`, 
                top: `${template.fields.company.y}%`, 
                fontSize: `${template.fields.company.fontSize}px`, 
                color: template.fields.company.color, 
                fontWeight: template.fields.company.isBold ? '900' : '400',
                whiteSpace: 'nowrap'
            }}>
              {visitor.company.toUpperCase()}
            </div>
          )}

          {template.fields.qrCode.isVisible && (
            <div className="absolute transform -translate-x-1/2 bg-white p-1 rounded-lg flex items-center justify-center border-2 border-slate-50" style={{ 
                left: `${template.fields.qrCode.x}%`,
                top: `${template.fields.qrCode.y}%`, 
                width: `${template.fields.qrCode.size}px`, 
                height: `${template.fields.qrCode.size}px` 
            }}>
              <img src={qrImageUrl} alt="Check-in QR" className="w-full h-full object-contain" />
            </div>
          )}

          {template.fields.category.isVisible && (
            <div className={`absolute transform -translate-x-1/2 px-6 py-2 ${colorClass} text-white font-black uppercase shadow-lg rounded-full`} style={{ 
                left: `${template.fields.category.x}%`,
                top: `${template.fields.category.y}%`, 
                fontSize: `${template.fields.category.fontSize}px` 
            }}>
                <span className="font-black uppercase tracking-[0.2em]">{CATEGORY_LABELS[visitor.category] || 'VISITEUR'}</span>
            </div>
          )}

          <div className="absolute bottom-4 left-0 right-0 no-print flex justify-center space-x-2 px-4">
             <button onClick={() => setBadgePreview(null)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Fermer</button>
             <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-indigo-700 transition-all"><Printer size={16} className="mr-2"/> Imprimer</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center"><QrCode size={20} className="mr-2 text-indigo-500" /> Gestion des Entrées</h3>
        <button onClick={() => {setEditingVisitor(null); setIsModalOpen(true);}} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">+ Enregistrer Visiteur</button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
        <Search className="text-slate-400" size={18} />
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Chercher par nom, société, ID..." className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-slate-700 dark:text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVisitors.map(v => (
          <div key={v.id} className={`bg-white dark:bg-slate-900 p-6 rounded-[32px] border-2 transition-all group relative overflow-hidden ${v.isCheckedIn ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-slate-100 dark:border-slate-800'}`}>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${CATEGORIES[v.category] || 'bg-slate-100'} text-white shadow-sm`}>{CATEGORY_LABELS[v.category] || 'Visiteur'}</span>
                    <div className="flex flex-col items-end">
                        {v.isCheckedIn ? (
                            <div className="flex items-center text-emerald-500 font-black text-[9px] uppercase tracking-widest animate-pulse">
                                <UserCheck size={14} className="mr-1" /> Sur Site
                            </div>
                        ) : (
                            <div className="text-slate-300 font-black text-[9px] uppercase tracking-widest">
                                Attendu
                            </div>
                        )}
                        {v.isEmailSent && (
                            <div className="flex items-center text-blue-500 font-black text-[7px] uppercase mt-1">
                                <MailCheck size={10} className="mr-1" /> Badge Envoyé
                            </div>
                        )}
                    </div>
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase truncate text-sm">{v.name}</h4>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{v.company}</p>
                
                <div className="mt-8 flex justify-between items-center">
                    <div className="flex space-x-1">
                        <button onClick={() => {setEditingVisitor(v); setIsModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Modifier"><Edit3 size={14}/></button>
                        <button onClick={() => setBadgePreview(v)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Badge"><Printer size={14}/></button>
                        <button 
                            disabled={!!isSendingEmail}
                            onClick={() => handleSendBadgeEmail(v)} 
                            className={`p-2 rounded-lg transition-all ${v.isEmailSent ? 'text-blue-500 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="Renvoyer l'email"
                        >
                            {isSendingEmail === v.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14}/>}
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => handleToggleCheckIn(v.id)}
                        className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm flex items-center ${v.isCheckedIn ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'}`}
                    >
                        {v.isCheckedIn ? <><UserMinus size={12} className="mr-2" /> Annuler Pointage</> : <><UserCheck size={12} className="mr-2" /> Valider Entrée</>}
                    </button>
                </div>
            </div>
          </div>
        ))}
        {filteredVisitors.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 font-black uppercase text-xs">Aucun visiteur trouvé</div>
        )}
      </div>

      {/* Modal Simulation Réception Email */}
      {emailPreview && (
          <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <Mail size={20} className="text-indigo-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest">Confirmation d'Envoi (Simulation)</h3>
                      </div>
                      <button onClick={() => setEmailPreview(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Destinataire</p>
                          <p className="font-bold text-slate-900">{emailPreview.visitor.name} &lt;{emailPreview.visitor.email}&gt;</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase mt-4 mb-1">Objet</p>
                          <p className="font-bold text-slate-900">Votre badge d'accès pour {event.title}</p>
                      </div>
                      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 text-sm text-slate-700 leading-relaxed shadow-inner max-h-60 overflow-y-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: emailPreview.content }} />
                      
                      <div className="flex items-center justify-center p-4 bg-indigo-50 rounded-3xl border border-dashed border-indigo-200">
                         <div className="text-center">
                            <QrCode size={40} className="mx-auto text-indigo-600 mb-2" />
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Badge QR Code attaché</p>
                         </div>
                      </div>

                      <div className="flex justify-center pt-4">
                          <button onClick={() => setEmailPreview(null)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Fermer la prévisualisation</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {badgePreview && <BadgePreview visitor={badgePreview} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-tight">{editingVisitor ? 'Modifier Visiteur' : 'Nouveau Visiteur'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
                </div>
                <form onSubmit={handleSaveVisitor} className="p-10 space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet</label>
                        <input name="name" required placeholder="NOM ET PRÉNOM" defaultValue={editingVisitor?.name} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entreprise</label>
                        <input name="company" placeholder="SOCIÉTÉ" defaultValue={editingVisitor?.company} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                            <input name="email" type="email" required placeholder="email@domaine.dz" defaultValue={editingVisitor?.email} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</label>
                            <select name="category" defaultValue={editingVisitor?.category || 'pro'} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600">
                                {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex items-center space-x-3">
                        <ShieldCheck size={20} className="text-indigo-600" />
                        <p className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase leading-relaxed">
                            L'enregistrement déclenchera l'envoi automatique du badge par email conformément à la loi 18-07.
                        </p>
                    </div>

                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center">
                        <Save size={18} className="mr-2" /> Valider l'inscription
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default VisitorsTab;
