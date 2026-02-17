
import React, { useState } from 'react';
import { X, Layers, DoorOpen, PersonStanding, Speaker, Info, HeartPulse, Flame, Presentation, Utensils, Crown, Settings2, Zap, Wifi, Package, UserCheck, Box } from 'lucide-react';
import { EventBooking, StandType, UtilityType } from '../../../types';

interface StandsTabProps {
  activeEvent: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  activePavilionId: string;
}

const DEFAULT_PRICES: Record<StandType, number> = {
  'amenage': 18000,
  'nu': 14000,
  'exterieur': 8000,
  'chapiteau': 25000
};

const getUtilityIcon = (type: UtilityType, className: string = 'w-full h-full') => {
    const props = { className, strokeWidth: 1.5 };
    switch (type) {
        case 'porte': return <DoorOpen {...props} />;
        case 'sanitaire': return <PersonStanding {...props} />;
        case 'scene': return <Speaker {...props} />;
        case 'info': return <Info {...props} />;
        case 'secours': return <HeartPulse {...props} />;
        case 'extincteur': return <Flame {...props} />;
        case 'conference': return <Presentation {...props} />;
        case 'restauration': return <Utensils {...props} />;
        case 'vip': return <Crown {...props} />;
        case 'technique': return <Settings2 {...props} />;
        case 'stockage': return <Package {...props} />;
        case 'electricite': return <Zap {...props} />;
        case 'wifi': return <Wifi {...props} />;
        case 'accueil': return <UserCheck {...props} />;
        default: return <Box {...props} />;
    }
}

const StandsTab: React.FC<StandsTabProps> = ({ activeEvent, setEvents, activePavilionId }) => {
  const [newStand, setNewStand] = useState({ 
    number: '', 
    width: 3, 
    depth: 3, 
    pricePerSqm: DEFAULT_PRICES['amenage'], 
    type: 'amenage' as StandType, 
    shape: 'rect' as 'rect' | 'L', 
    cutoutWidth: 2, 
    cutoutDepth: 2 
  });

  const handleTypeChange = (type: StandType) => {
    setNewStand(prev => ({
      ...prev,
      type,
      pricePerSqm: DEFAULT_PRICES[type]
    }));
  };

  const addStand = () => {
    if (!newStand.number || newStand.width <= 0 || newStand.depth <= 0) return alert("Dimensions et numéro requis.");
    let area = newStand.width * newStand.depth;
    if (newStand.shape === 'L' && newStand.cutoutWidth < newStand.width && newStand.cutoutDepth < newStand.depth) {
      area -= (newStand.cutoutWidth * newStand.cutoutDepth);
    }

    setEvents(prev => prev.map(ev => {
      if (ev.id === activeEvent.id) {
        // Place default at x:0, y:0
        const newStandData = { ...newStand, id: `ST-${Date.now()}`, area: parseFloat(area.toFixed(2)), pavilionId: activePavilionId, x: 0, y: 0, rotation: 0 };
        const updatedEvent = { ...ev, stands: [...(ev.stands || []), newStandData], updatedAt: Date.now() };
        return updatedEvent;
      }
      return ev;
    }));
    
    const numMatch = newStand.number.match(/(\d+)$/);
    if (numMatch) {
      setNewStand({ ...newStand, number: newStand.number.replace(/\d+$/, (parseInt(numMatch[0]) + 1).toString()) });
    }
  };

  const handleAssignStand = (standId: string, participantId: string) => {
    setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, stands: ev.stands.map(s => s.id === standId ? { ...s, participantId: participantId || undefined } : s), updatedAt: Date.now() } : ev));
  };

  const addUtilitySpace = (type: UtilityType) => {
    const defaults: Record<UtilityType, { label: string, width: number, depth: number }> = {
        'porte': { label: "Porte", width: 1.5, depth: 0.5 }, 
        'sanitaire': { label: "Sanitaires", width: 4, depth: 3 },
        'scene': { label: "Scène", width: 6, depth: 4 }, 
        'info': { label: "Point Info", width: 3, depth: 2 },
        'secours': { label: "Secours", width: 3, depth: 3 }, 
        'extincteur': { label: "Extincteur", width: 0.5, depth: 0.5 },
        'conference': { label: "Salle Conf.", width: 10, depth: 8 },
        'restauration': { label: "Traiteur", width: 5, depth: 4 },
        'vip': { label: "Espace VIP", width: 6, depth: 5 },
        'technique': { label: "Régie", width: 3, depth: 2 },
        'stockage': { label: "Stockage", width: 4, depth: 3 },
        'electricite': { label: "Elec.", width: 0.8, depth: 0.8 },
        'wifi': { label: "Borne Wifi", width: 0.5, depth: 0.5 },
        'accueil': { label: "Accueil", width: 4, depth: 2 }
    };
    // Place default at x:0, y:0
    const newSpace = { id: `util-${Date.now()}`, type, pavilionId: activePavilionId, x: 0, y: 0, rotation: 0, ...defaults[type] };
    setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, utilitySpaces: [...(ev.utilitySpaces || []), newSpace], updatedAt: Date.now() } : ev));
  };

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Créer un Stand</h4>
          <div className="space-y-4">
            <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Numéro</label><input value={newStand.number} onChange={e => setNewStand({...newStand, number: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-indigo-600" placeholder="A101" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Largeur (m)</label><input type="number" value={newStand.width} onChange={e => setNewStand({...newStand, width: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-indigo-600" /></div>
                <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Profondeur (m)</label><input type="number" value={newStand.depth} onChange={e => setNewStand({...newStand, depth: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-indigo-600" /></div>
            </div>
            <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Type de Stand</label>
                <select value={newStand.type} onChange={e => handleTypeChange(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-xs outline-none">
                  <option value="amenage">Aménagé (Classique)</option>
                  <option value="nu">Nu (Surface seule)</option>
                  <option value="exterieur">Extérieur</option>
                  <option value="chapiteau">Chapiteau (Carré)</option>
                </select>
            </div>
            <div>
               <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Prix par m² (DA)</label>
               <input type="number" value={newStand.pricePerSqm} onChange={e => setNewStand({...newStand, pricePerSqm: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-800 rounded-2xl font-black text-sm text-emerald-700 outline-none" />
            </div>
            <div className="flex items-center space-x-2 pt-2">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Forme en L ?</label>
                <input type="checkbox" checked={newStand.shape === 'L'} onChange={e => setNewStand({...newStand, shape: e.target.checked ? 'L' : 'rect'})} className="w-5 h-5 accent-indigo-600" />
            </div>
            {newStand.shape === 'L' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div><label className="text-[8px] font-bold uppercase">Découpe L (m)</label><input type="number" value={newStand.cutoutWidth} onChange={e => setNewStand({...newStand, cutoutWidth: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 rounded border outline-none text-xs" /></div>
                    <div><label className="text-[8px] font-bold uppercase">Découpe P (m)</label><input type="number" value={newStand.cutoutDepth} onChange={e => setNewStand({...newStand, cutoutDepth: parseFloat(e.target.value) || 0})} className="w-full px-2 py-1 rounded border outline-none text-xs" /></div>
                </div>
            )}
            <button onClick={addStand} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all mt-4">Ajouter Stand au Plan</button>
          </div>
          <div className="mt-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Layers size={14} className="mr-2"/> Éléments & Utilitaires</h4>
              <div className="grid grid-cols-3 gap-2">
                  {(['porte', 'sanitaire', 'scene', 'info', 'secours', 'extincteur', 'conference', 'restauration', 'vip', 'technique', 'stockage', 'electricite', 'wifi', 'accueil'] as UtilityType[]).map(type => (
                    <button key={type} onClick={() => addUtilitySpace(type)} className="aspect-square flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 dark:border-slate-700" title={`Ajouter ${type}`}>
                      {getUtilityIcon(type, "w-6 h-6")}
                      <span className="text-[7px] font-black uppercase mt-1 truncate w-full text-center">{type}</span>
                    </button>
                  ))}
              </div>
          </div>
      </div>
      
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {(activeEvent.stands || []).map(stand => {
            const participant = (activeEvent.participants || []).find(p => p.clientId === stand.participantId);
            return (
              <div key={stand.id} className={`p-4 rounded-3xl border-2 transition-all ${participant ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-slate-900 dark:text-white">{stand.number}</span>
                    <button onClick={() => setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? {...ev, stands: ev.stands.filter(s => s.id !== stand.id)} : ev))} className="text-rose-400 hover:text-rose-600"><X size={14}/></button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{stand.type} • {stand.area} m²</p>
                  <p className="text-[9px] font-mono text-emerald-600 mb-2">{stand.pricePerSqm} DA/m²</p>
                  <div className="mt-3">
                    <select value={stand.participantId || ''} onChange={(e) => handleAssignStand(stand.id, e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-[9px] font-bold outline-none">
                        <option value="">-- Libre --</option>
                        {(activeEvent.participants || []).map(p => <option key={p.clientId} value={p.clientId}>{p.clientName}</option>)}
                    </select>
                  </div>
              </div>
            );
          })}
          {(activeEvent.stands || []).length === 0 && (
            <div className="col-span-full py-20 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucun stand créé</div>
          )}
      </div>
    </div>
  );
};

export default StandsTab;
