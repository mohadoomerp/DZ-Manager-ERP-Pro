
import React, { useState, useMemo } from 'react';
import { Trash2, Wallet, PieChart, TrendingDown, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../../constants';
import { EventBooking, EventExpense, Transaction, User } from '../../../types';

interface ExpensesTabProps {
  activeEvent: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  onTransactionAdd: (tx: Transaction) => void;
  currentUser: User;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ activeEvent, setEvents, onTransactionAdd, currentUser }) => {
  const [newExpense, setNewExpense] = useState<{ label: string; amount: number; category: EventExpense['category']; paidBy: string }>({ 
    label: '', amount: 0, category: 'Autre', paidBy: currentUser.name 
  });

  const getAbbreviation = (title: string) => {
    if (!title) return "EVT";
    return title.split(/[\s'-]/).filter(word => word.length > 2).map(word => word[0].toUpperCase()).join('').slice(0, 6);
  };

  const handleAddExpense = () => {
    if (!newExpense.label || newExpense.amount <= 0) return alert("Saisie invalide");
    const expense: EventExpense = { id: `EXP-${Date.now()}`, ...newExpense, date: new Date().toISOString().split('T')[0] };
    
    setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, expenses: [...(ev.expenses || []), expense], updatedAt: Date.now() } : ev));
    
    onTransactionAdd({ 
        id: `TX-EVT-EXP-${Date.now()}`, 
        date: expense.date, 
        title: `Dépense Event ${getAbbreviation(activeEvent.title)} - ${expense.label}`, 
        amount: expense.amount, 
        type: 'expense', 
        category: 'Frais Événement', 
        referenceId: expense.id, 
        account: 'Caisse Principale', 
        updatedAt: Date.now() 
    });
    
    setNewExpense({ label: '', amount: 0, category: 'Autre', paidBy: currentUser.name });
  };

  const handleDeleteExpense = (id: string) => {
      if(!confirm("Supprimer cette dépense du registre ? (Note: La transaction financière restera dans la caisse globale pour traçabilité)")) return;
      setEvents(prev => prev.map(ev => ev.id === activeEvent.id ? { ...ev, expenses: (ev.expenses || []).filter(e => e.id !== id), updatedAt: Date.now() } : ev));
  };

  const stats = useMemo(() => {
    const total = (activeEvent.expenses || []).reduce((acc, e) => acc + e.amount, 0);
    const count = (activeEvent.expenses || []).length;
    const byCat = (activeEvent.expenses || []).reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);
    return { total, count, byCat };
  }, [activeEvent.expenses]);

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Colonne Gauche : Formulaire */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                <Wallet size={16} className="mr-2 text-indigo-500" /> Nouvelle Dépense
            </h4>
            <div className="space-y-5">
              <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-1">Intitulé de la dépense</label>
                  <input 
                    value={newExpense.label} 
                    onChange={e => setNewExpense({...newExpense, label: e.target.value})} 
                    placeholder="Ex: Impression Bâches, Traiteur..."
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl font-black text-sm outline-none transition-all" 
                  />
              </div>
              <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-1">Montant (DZD)</label>
                  <input 
                    type="number" 
                    value={newExpense.amount || ''} 
                    onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} 
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl font-black text-sm outline-none transition-all" 
                  />
              </div>
              <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 block mb-1">Catégorie Budgétaire</label>
                  <select 
                    value={newExpense.category} 
                    onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} 
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 dark:focus:border-indigo-500 rounded-2xl font-black text-xs outline-none transition-all"
                  >
                    {['Logistique', 'Marketing', 'Restauration', 'Personnel', 'Autre'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="pt-4">
                  <button 
                    onClick={handleAddExpense} 
                    className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] font-black uppercase text-xs shadow-xl shadow-rose-600/20 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <TrendingDown size={16} className="mr-2" /> Décaisser
                  </button>
                  <p className="text-[8px] text-center text-slate-400 mt-3 font-bold">
                    Cette action créera automatiquement une écriture en caisse.
                  </p>
              </div>
            </div>
        </div>
      </div>

      {/* Colonne Droite : Liste & Stats */}
      <div className="lg:col-span-2 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Dépenses</p>
                      <p className="text-3xl font-black tracking-tighter">{formatCurrency(stats.total)}</p>
                  </div>
                  <TrendingDown size={80} className="absolute -bottom-4 -right-4 text-rose-500 opacity-20 pointer-events-none" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                   <div className="flex items-center justify-between">
                       <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre d'opérations</p>
                           <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.count}</p>
                       </div>
                       <div className="h-10 w-px bg-slate-100 dark:bg-slate-800"></div>
                       <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Poste Principal</p>
                           <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase truncate max-w-[100px]">
                               {Object.entries(stats.byCat).sort((a,b) => (b[1] as number) - (a[1] as number))[0]?.[0] || '-'}
                           </p>
                       </div>
                   </div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Journal des Sorties</h3>
                  <div className="flex gap-2">
                     {/* Category Chips */}
                     {Object.entries(stats.byCat).slice(0, 3).map(([cat, amount]) => (
                         <div key={cat} className="px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm flex items-center">
                             <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>
                             <span className="text-[8px] font-black uppercase text-slate-500">{cat}: {formatCurrency(amount as number).split('DZD')[0]}</span>
                         </div>
                     ))}
                  </div>
              </div>
              
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 font-black text-slate-400 uppercase text-[9px] tracking-widest">
                        <th className="px-8 py-5">Libellé / Date</th>
                        <th className="px-8 py-5">Catégorie</th>
                        <th className="px-8 py-5 text-right">Montant</th>
                        <th className="px-8 py-5 text-right w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {(activeEvent.expenses || []).map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                            <td className="px-8 py-5">
                                <p className="font-black text-slate-900 dark:text-white text-xs">{exp.label}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{exp.date} • Par {exp.paidBy}</p>
                            </td>
                            <td className="px-8 py-5">
                                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-500">{exp.category}</span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-rose-600 text-sm">{formatCurrency(exp.amount)}</td>
                            <td className="px-8 py-5 text-right">
                                <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14}/>
                                </button>
                            </td>
                        </tr>
                        ))}
                        {(activeEvent.expenses || []).length === 0 && (
                        <tr><td colSpan={4} className="py-20 text-center font-black text-slate-300 dark:text-slate-600 uppercase text-xs tracking-widest">Aucune dépense enregistrée</td></tr>
                        )}
                    </tbody>
                </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ExpensesTab;
