import React from 'react';
import { Trash2 } from 'lucide-react';
import { EventBooking, Partner } from '../../../types';

interface ParticipantsTabProps {
  activeEvent: EventBooking;
  clients: Partner[];
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
}

const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ activeEvent, clients, setEvents }) => {
  
  const addParticipant = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const currentParticipants = activeEvent?.participants || [];
    if (currentParticipants.find(p => p.clientId === clientId)) return alert("Ce client est déjà participant.");
    
    setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { 
        ...ev, 
        participants: [...(ev.participants || []), { clientId: client.id, clientName: client.name, joinedAt: new Date().toISOString().split('T')[0] }], 
        updatedAt: Date.now() 
    } : ev));
  };

  const removeParticipant = (clientId: string) => {
    if ((activeEvent?.stands || []).find(s => s.participantId === clientId) || (activeEvent?.items || []).find(i => i.participantId === clientId)) return alert("Impossible : a des stands ou du matériel.");
    setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { 
        ...ev, 
        participants: (ev.participants || []).filter(p => p.clientId !== clientId), 
        updatedAt: Date.now() 
    } : ev));
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-widest">Liste des Exposants</h3>
        <div className="flex items-center space-x-2">
            <select onChange={(e) => { if(e.target.value) addParticipant(e.target.value); }} className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase outline-none">
              <option value="">+ Ajouter un client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                  <th className="px-8 py-5">Raison Sociale</th>
                  <th className="px-8 py-5">Stands Loués</th>
                  <th className="px-8 py-5">Date Inscription</th>
                  <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {(activeEvent.participants || []).map(p => {
                  const clientStands = (activeEvent.stands || []).filter(s => s.participantId === p.clientId);
                  return (
                    <tr key={p.clientId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-sm">{p.clientName}</td>
                      <td className="px-8 py-5 text-xs font-bold text-indigo-600">{clientStands.length > 0 ? clientStands.map(s => s.number).join(', ') : 'Aucun'}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500">{p.joinedAt}</td>
                      <td className="px-8 py-5 text-right">
                          <button onClick={() => removeParticipant(p.clientId)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
              })}
              {(activeEvent.participants || []).length === 0 && (
                  <tr><td colSpan={4} className="py-20 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucun exposant inscrit</td></tr>
              )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipantsTab;