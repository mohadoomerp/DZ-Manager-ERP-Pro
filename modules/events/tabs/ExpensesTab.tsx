import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
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

  return (
    <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Nouvelle Dépense</h4>
          <div className="space-y-4">
            <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Libellé</label><input value={newExpense.label} onChange={e => setNewExpense({...newExpense, label: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-indigo-600" /></div>
            <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Montant (DA)</label><input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-indigo-600" /></div>
            <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Catégorie</label>
                <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-2xl font-black text-xs outline-none">
                  {['Logistique', 'Marketing', 'Restauration', 'Personnel', 'Autre'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <button onClick={handleAddExpense} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-rose-700 transition-all mt-4">Enregistrer Dépense</button>
          </div>
      </div>
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                  <th className="px-8 py-5">Libellé</th>
                  <th className="px-8 py-5">Catégorie</th>
                  <th className="px-8 py-5">Montant</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {(activeEvent.expenses || []).map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-5 font-black text-slate-900 dark:text-white text-sm">{exp.label}<br/><span className="text-[9px] text-slate-400 font-bold uppercase">{exp.date} • {exp.paidBy}</span></td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">{exp.category}</td>
                      <td className="px-8 py-5 font-black text-rose-600">{formatCurrency(exp.amount)}</td>
                      <td className="px-8 py-5 text-right"><button onClick={() => handleDeleteExpense(exp.id)} className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
                {(activeEvent.expenses || []).length === 0 && (
                  <tr><td colSpan={4} className="py-20 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucune dépense enregistrée</td></tr>
                )}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default ExpensesTab;