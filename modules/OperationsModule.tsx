
import React, { useMemo, useState } from 'react';
import { Zap, Activity, Clock, AlertTriangle, TrendingUp, Users, ShoppingCart, Package, ArrowRight, CheckCircle2, ListChecks, Bell, History, Server, Network, User as UserIcon, ShieldCheck, DatabaseZap, Search } from 'lucide-react';
import ModuleLayout from '../components/ModuleLayout';
import { formatCurrency } from '../constants';
import { Invoice, Lead, Product, Partner, Transaction, AttendanceRecord, AuditLog, User, EventBooking } from '../types';

interface OperationsModuleProps {
  invoices: Invoice[];
  leads: Lead[];
  products: Product[];
  clients: Partner[];
  transactions: Transaction[];
  attendance: AttendanceRecord[];
  onNavigate: (module: any) => void;
  auditLogs?: AuditLog[];
  events: EventBooking[];
  currentUser: User;
}

const OperationsModule: React.FC<OperationsModuleProps> = ({ 
  invoices, leads, products, clients, transactions, attendance, onNavigate, auditLogs = [], events, currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'pulse' | 'audit'>('pulse');
  const [auditSearch, setAuditSearch] = useState('');

  const visibleLeads = useMemo(() => {
    if (currentUser.role === 'SALES') {
      const assignedEventIds = new Set(events.filter(e => e.assignedAgents?.includes(currentUser.id)).map(e => e.id));
      return leads.filter(l => l.eventId && assignedEventIds.has(l.eventId));
    }
    return leads;
  }, [leads, events, currentUser]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => 
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) || 
      log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.module.toLowerCase().includes(auditSearch.toLowerCase())
    );
  }, [auditLogs, auditSearch]);

  const operationalPulse = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = invoices.filter(i => i.date === today && i.type === 'Invoice').length;
    const newLeads = visibleLeads.filter(l => l.createdAt === today).length;
    const stockAlerts = products.filter(p => p.stock <= p.minStock).length;
    const presentEmployees = attendance.filter(a => a.date === today && a.status === 'Present').length;
    
    return { todaySales, newLeads, stockAlerts, presentEmployees };
  }, [invoices, visibleLeads, products, attendance]);

  return (
    <ModuleLayout 
      title="Centre des Opérations" 
      subtitle="Contrôle Central & Traçabilité Réseau" 
      icon={<Zap size={24} />}
      actions={
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
           <button onClick={() => setActiveTab('pulse')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pulse' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Temps Réel</button>
           <button onClick={() => setActiveTab('audit')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Registre Audit</button>
        </div>
      }
    >
      {activeTab === 'pulse' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden group shadow-2xl border-b-4 border-indigo-500">
                  <div className="relative z-10">
                     <div className="flex items-center space-x-2 mb-2">
                        <DatabaseZap size={14} className="text-emerald-400 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Liaison Centralisée Active</p>
                     </div>
                     <h3 className="text-4xl font-black tracking-tighter mb-8">{operationalPulse.todaySales} <span className="text-xl opacity-40">Opérations/Jour</span></h3>
                     <div className="flex items-center space-x-4">
                        <div className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase border border-emerald-500/30">Statut HUB : Opérationnel</div>
                     </div>
                  </div>
                  <Activity size={200} className="absolute -bottom-10 -right-10 opacity-5 text-white pointer-events-none" />
               </div>

               <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-amber-500 transition-colors">
                  <div className="flex justify-between items-start">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entrants CRM</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{operationalPulse.newLeads} <span className="text-sm opacity-40 uppercase">Aujourd'hui</span></h3>
                     </div>
                     <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl"><ListChecks size={20} /></div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                     <span className="text-[9px] font-black text-slate-400 uppercase">Synchronisation LAN active</span>
                     <button onClick={() => onNavigate('CRM')} className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"><ArrowRight size={16} /></button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[
                 { label: 'Alerte Stock', val: operationalPulse.stockAlerts, icon: <AlertTriangle />, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10' },
                 { label: 'Effectif Présent', val: operationalPulse.presentEmployees, icon: <Users />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                 { label: 'Objets Synchronisés', val: invoices.length + visibleLeads.length + transactions.length, icon: <Network />, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' }
               ].map((stat, i) => (
                 <div key={i} className={`p-8 rounded-[32px] ${stat.bg} border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all flex flex-col justify-between h-44 shadow-sm group`}>
                    <div className={`${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.val}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center">
                   <History size={16} className="mr-3 text-indigo-600" /> Activité en Direct
                </h4>
                <div className="mt-1 flex items-center space-x-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <p className="text-[8px] font-black text-slate-400 uppercase">Hub Synchronisé</p>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {auditLogs.length > 0 ? auditLogs.slice(0, 20).map((log) => (
                  <div key={log.id} className="flex space-x-4 group animate-in slide-in-from-right-4">
                     <div className="flex flex-col items-center shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ring-4 ring-white dark:ring-slate-900 z-10 ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'DELETE' ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                        <div className="w-px flex-1 bg-slate-100 dark:bg-slate-800 my-1"></div>
                     </div>
                     <div className="flex-1 pb-6 border-b border-slate-50 dark:border-slate-800 last:border-0">
                        <div className="flex justify-between items-start mb-1">
                           <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight group-hover:text-indigo-600 transition-colors">{log.details}</p>
                           <span className="text-[8px] font-mono text-slate-400 whitespace-nowrap ml-4">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{log.userName}</p>
                          <span className="text-[7px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400 font-black uppercase">{log.module}</span>
                        </div>
                     </div>
                  </div>
                )) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30">
                      <Clock size={48} className="text-slate-300 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aucune activité enregistrée</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 gap-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registre d'Audit Global</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Historique complet des actions effectuées sur le réseau</p>
              </div>
              <div className="relative w-full md:w-96">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                   value={auditSearch}
                   onChange={e => setAuditSearch(e.target.value)}
                   placeholder="Chercher par utilisateur, module, action..." 
                   className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-600 transition-all" 
                 />
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 font-black text-slate-400 uppercase text-[9px] tracking-[0.2em]">
                       <th className="px-10 py-5 w-48">Horodatage</th>
                       <th className="px-10 py-5 w-48">Utilisateur</th>
                       <th className="px-10 py-5 w-32">Module</th>
                       <th className="px-10 py-5">Action réalisée</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-10 py-6">
                           <div className="flex items-center text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                              <Clock size={12} className="mr-2 text-indigo-500" />
                              {new Date(log.timestamp).toLocaleString()}
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600"><UserIcon size={14}/></div>
                              <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white">{log.userName}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[8px] font-black uppercase">{log.module}</span>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center">
                              <span className={`mr-4 px-3 py-1 rounded-lg text-[8px] font-black text-white ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'DELETE' ? 'bg-rose-500' : 'bg-indigo-500'}`}>{log.action}</span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.details}</span>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr><td colSpan={4} className="py-32 text-center text-slate-300 uppercase font-black tracking-widest text-xs">Aucun log correspondant à votre recherche</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </ModuleLayout>
  );
};

export default OperationsModule;
