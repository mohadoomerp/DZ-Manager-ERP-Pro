import React from 'react';
import { X } from 'lucide-react';
import { EventBooking, User } from '../../../types';

interface StaffTabProps {
  activeEvent: EventBooking;
  users: User[];
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
}

const StaffTab: React.FC<StaffTabProps> = ({ activeEvent, users, setEvents }) => {
  const assignAgent = (userId: string) => {
    setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
            const currentAgents = ev.assignedAgents || [];
            if (currentAgents.includes(userId)) return ev;
            return { ...ev, assignedAgents: [...currentAgents, userId], updatedAt: Date.now() };
        } 
        return ev;
    }));
  };

  const removeAgent = (userId: string) => {
    setEvents(prev => prev.map(ev => {
        if (ev.id === activeEvent.id) {
            return { ...ev, assignedAgents: (ev.assignedAgents || []).filter(id => id !== userId), updatedAt: Date.now() };
        } 
        return ev;
    }));
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 dark:text-white">Équipe Organisatrice</h3>
            <select onChange={(e) => { if(e.target.value) assignAgent(e.target.value); }} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase outline-none">
              <option value="">+ Assigner un membre</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeEvent.assignedAgents || []).map(agentId => {
              const user = users.find(u => u.id === agentId);
              if (!user) return null;
              return (
                  <div key={agentId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black">{user.name[0]}</div>
                        <div><p className="text-xs font-black text-slate-900 dark:text-white uppercase">{user.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{user.role}</p></div>
                    </div>
                    <button onClick={() => removeAgent(agentId)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-xl"><X size={16}/></button>
                  </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default StaffTab;