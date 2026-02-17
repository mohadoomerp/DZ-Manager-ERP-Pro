
import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, Trash2, Edit3, Printer, Search, 
  Building2, BadgeCheck, ShieldCheck, Mail, Phone, ScanBarcode, X, QrCode, UserCheck, UserMinus
} from 'lucide-react';
import { EventBooking, ExhibitorTeamMember, CompanySettings, BadgeTemplate } from '../../../types';
import { formatCurrency } from '../../../constants';

interface ExhibitorTeamsTabProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  companySettings: CompanySettings;
}

const ExhibitorTeamsTab: React.FC<ExhibitorTeamsTabProps> = ({ event, setEvents, companySettings }) => {
  const [selectedExhibitorId, setSelectedExhibitorId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ExhibitorTeamMember | null>(null);
  const [badgePreview, setBadgePreview] = useState<ExhibitorTeamMember | null>(null);

  const filteredMembers = useMemo(() => {
    return (event.exhibitorTeams || []).filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchExh = selectedExhibitorId === 'all' || m.exhibitorId === selectedExhibitorId;
      return matchSearch && matchExh;
    });
  }, [event.exhibitorTeams, searchTerm, selectedExhibitorId]);

  const handleToggleCheckIn = (id: string) => {
    setEvents(prev => prev.map(ev => {
        if (ev.id === event.id) {
            return {
                ...ev,
                exhibitorTeams: (ev.exhibitorTeams || []).map(m => m.id === id ? { ...m, isCheckedIn: !m.isCheckedIn, updatedAt: Date.now() } : m)
            };
        }
        return ev;
    }));
  };

  const handleSaveMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const member: ExhibitorTeamMember = {
      id: editingMember?.id || `TEAM-${Date.now()}`,
      exhibitorId: fd.get('exhibitorId') as string,
      name: fd.get('name') as string,
      position: fd.get('position') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      badgeNumber: editingMember?.badgeNumber || `EXH-${Math.floor(1000 + Math.random() * 9000)}`,
      isCheckedIn: editingMember?.isCheckedIn || false,
      updatedAt: Date.now()
    };

    setEvents(prev => prev.map(ev => ev.id === event.id ? {
      ...ev,
      exhibitorTeams: editingMember 
        ? (ev.exhibitorTeams || []).map(m => m.id === editingMember.id ? member : m)
        : [...(ev.exhibitorTeams || []), member]
    } : ev));
    
    setIsModalOpen(false);
    setEditingMember(null);
  };

  const deleteMember = (id: string) => {
    if(confirm("Supprimer ce membre de l'équipe ?")) {
      setEvents(prev => prev.map(ev => ev.id === event.id ? {
        ...ev,
        exhibitorTeams: (ev.exhibitorTeams || []).filter(m => m.id !== id)
      } : ev));
    }
  };

  const BadgePreview = ({ member }: { member: ExhibitorTeamMember }) => {
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

    const exhibitor = event.participants.find(p => p.clientId === member.exhibitorId);
    const qrData = `DZ-CHECKIN|${event.id}|${member.id}`;
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
               <div className="w-full h-8 bg-slate-900" />
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
              {member.name.toUpperCase()}
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
              {exhibitor?.clientName.toUpperCase() || 'EXPOSANT'}
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
            <div className="absolute transform -translate-x-1/2 px-6 py-2 bg-indigo-900 text-white font-black uppercase shadow-lg rounded-full" style={{ 
                left: `${template.fields.category.x}%`,
                top: `${template.fields.category.y}%`, 
                fontSize: `${template.fields.category.fontSize}px` 
            }}>
                <span className="font-black uppercase tracking-[0.2em]">EXPOSANT</span>
            </div>
          )}

          <div className="absolute bottom-4 left-0 right-0 no-print flex justify-center space-x-2 px-4">
             <button onClick={() => setBadgePreview(null)} className="px-6 py-3 bg-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Fermer</button>
             <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl flex items-center hover:bg-indigo-700 transition-all"><Printer size={16} className="mr-2"/> Imprimer</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><ScanBarcode size={24} /></div>
              <div>
                  <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">Staff Exposants</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contrôle des accès des équipes stands</p>
              </div>
          </div>
          <button onClick={() => {setEditingMember(null); setIsModalOpen(true);}} className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all hover:bg-indigo-700">
              <Plus size={18} className="mr-2" /> Ajouter Staff
          </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Chercher par nom ou numéro de badge..." className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none" />
          </div>
          <select value={selectedExhibitorId} onChange={e => setSelectedExhibitorId(e.target.value)} className="w-full md:w-auto px-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase text-slate-900 dark:text-white outline-none">
            <option value="all">Tous les exposants</option>
            {event.participants.map(p => <option key={p.clientId} value={p.clientId}>{p.clientName}</option>)}
          </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(m => {
            const exhibitor = event.participants.find(p => p.clientId === m.exhibitorId);
            return (
              <div key={m.id} className={`bg-white dark:bg-slate-900 p-6 rounded-[40px] border-2 transition-all relative overflow-hidden group ${m.isCheckedIn ? 'border-emerald-500 shadow-lg' : 'border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                <div className="absolute top-0 right-0 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-bl-3xl text-[9px] font-black text-slate-500 uppercase">
                    Badge: {m.badgeNumber}
                </div>
                
                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">{m.name[0]}</div>
                    <div>
                        <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm leading-tight">{m.name}</h4>
                        <div className={`flex items-center text-[8px] font-black uppercase mt-1 ${m.isCheckedIn ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {m.isCheckedIn ? <><BadgeCheck size={12} className="mr-1" /> Sur Site</> : 'Attendu'}
                        </div>
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center truncate"><Building2 size={12} className="mr-2" /> Stand: {exhibitor?.clientName || 'Inconnu'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{m.position}</p>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex space-x-1">
                        <button onClick={() => {setEditingMember(m); setIsModalOpen(true);}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button>
                        <button onClick={() => setBadgePreview(m)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"><Printer size={14}/></button>
                    </div>
                    
                    <button 
                        onClick={() => handleToggleCheckIn(m.id)}
                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm flex items-center ${m.isCheckedIn ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        {m.isCheckedIn ? <><UserMinus size={12} className="mr-2" /> Sortie</> : <><UserCheck size={12} className="mr-2" /> Entrée</>}
                    </button>
                </div>
              </div>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="col-span-full py-20 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucun membre d'équipe enregistré</div>
          )}
      </div>

      {badgePreview && <BadgePreview member={badgePreview} />}

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase tracking-widest">{editingMember ? 'Mise à jour' : 'Ajouter un Badge Exposant'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24}/></button>
                </div>
                <form onSubmit={handleSaveMember} className="p-10 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Exposant / Entreprise</label>
                        <select name="exhibitorId" required defaultValue={editingMember?.exhibitorId} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-600">
                            <option value="">-- Sélectionner l'exposant --</option>
                            {event.participants.map(p => <option key={p.clientId} value={p.clientId}>{p.clientName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Nom Complet</label>
                        <input name="name" required defaultValue={editingMember?.name} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all uppercase" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Fonction</label>
                        <input name="position" required defaultValue={editingMember?.position} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Email</label>
                            <input name="email" type="email" defaultValue={editingMember?.email} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Téléphone</label>
                            <input name="phone" required defaultValue={editingMember?.phone} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600 transition-all" />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                        Enregistrer Membre
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExhibitorTeamsTab;
