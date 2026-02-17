import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, ShieldCheck, X, Save, Calculator, Printer, FileText, Plus, Landmark, History, Search, Trash2, Lock, Unlock, AlertTriangle, Coins, Banknote } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Transaction, User, AuditLog, ModuleType, DailyClosing } from '../types';

interface FinanceModuleProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  closings: DailyClosing[];
  setClosings: React.Dispatch<React.SetStateAction<DailyClosing[]>>;
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
  onDeleteTransaction: (id: string) => void; // Nouvelle prop
}

// Configuration des coupures monétaires algériennes
const MONEY_UNITS = [
  { val: 2000, label: '2000 DA' },
  { val: 1000, label: '1000 DA' },
  { val: 500, label: '500 DA' },
  { val: 200, label: '200 DA' },
  { val: 100, label: '100 DA' },
  { val: 50, label: '50 DA' },
  { val: 20, label: '20 DA' },
  { val: 10, label: '10 DA' },
];

const FinanceModule: React.FC<FinanceModuleProps> = ({ transactions, setTransactions, closings, setClosings, currentUser, onAddLog, onDeleteTransaction }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'closing' | 'history'>('current');
  const [view, setView] = useState<'dashboard' | 'receipt' | 'z_report'>('dashboard');
  
  // États modale Transaction
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  
  // États modale Clôture
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [billetage, setBilletage] = useState<Record<number, number>>({});
  const [closingNote, setClosingNote] = useState('');
  
  // État Z-Report Actif pour visualisation
  const [activeZReport, setActiveZReport] = useState<DailyClosing | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // --- CALCULS DU JOUR (Session en cours) ---
  const lastClosingDate = useMemo(() => {
      if (closings.length === 0) return '1970-01-01'; // Si aucune clôture, on prend tout
      // On trie pour trouver la dernière date de clôture
      const sorted = [...closings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0].date;
  }, [closings]);

  const lastClosingBalance = useMemo(() => {
      if (closings.length === 0) return 0;
      const sorted = [...closings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return sorted[0].cashBalance; // Solde théorique de la veille = Ouverture d'aujourd'hui
  }, [closings]);

  const currentSessionData = useMemo(() => {
      // Transactions APRÈS la dernière clôture (ou transactions du jour si pas clôturé hier)
      // Note: Pour simplifier, on filtre les transactions dont la date est > lastClosingDate ou (date == today et pas encore clôturé ce jour)
      // Une logique robuste utiliserait un ID de session, mais ici on utilise la date.
      
      const today = new Date().toISOString().split('T')[0];
      const isTodayClosed = closings.some(c => c.date === today);

      const sessionTxs = transactions.filter(t => {
          if (t.isDeleted) return false; // Ne pas compter les transactions supprimées
          if (t.account !== 'Caisse Principale') return false; // On ne clôture que la caisse physique
          return t.date > lastClosingDate || (t.date === today && !isTodayClosed);
      });

      const income = sessionTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = sessionTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const theoreticalCash = lastClosingBalance + income - expense;

      return { income, expense, theoreticalCash, txs: sessionTxs, isClosed: isTodayClosed };
  }, [transactions, lastClosingDate, lastClosingBalance, closings]);

  // --- GESTION TRANSACTIONS ---
  const handleSaveTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentSessionData.isClosed && txType !== 'income') { // On peut toujours encaisser, mais attention à la date
       alert("Attention : La caisse de ce jour est clôturée. Cette opération sera comptabilisée pour la prochaine session.");
    }

    const formData = new FormData(e.currentTarget);
    const newTx: Transaction = {
      id: `TRX-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      title: formData.get('title') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: txType,
      category: formData.get('category') as string,
      account: formData.get('account') as string,
      createdBy: currentUser.name,
      updatedAt: Date.now()
    };

    // CORRECTION CRITIQUE : Utilisation de la mise à jour fonctionnelle pour éviter les conflits de sync
    setTransactions(prev => [newTx, ...prev]);
    onAddLog('CREATE', ModuleType.FINANCE, `Caisse : ${newTx.type === 'income' ? '+' : '-'}${newTx.amount} (${newTx.title})`);
    setIsTxModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (currentSessionData.isClosed) return alert("Impossible de modifier une transaction d'une journée clôturée.");
    onDeleteTransaction(id); // Appel au gestionnaire centralisé
  };

  // --- GESTION CLÔTURE ---
  const calculateBilletageTotal = () => {
      return Object.entries(billetage).reduce((acc, [val, qty]) => acc + (Number(val) * Number(qty)), 0);
  };

  const handleExecuteClosing = () => {
      const realTotal = calculateBilletageTotal();
      const difference = realTotal - Number(currentSessionData.theoreticalCash);
      
      if (difference !== 0) {
          if (!confirm(`ÉCART DÉTECTÉ : ${formatCurrency(difference)}. \nLe montant compté (${formatCurrency(realTotal)}) diffère du théorique (${formatCurrency(currentSessionData.theoreticalCash)}). \nConfirmer la clôture avec cet écart ?`)) {
              return;
          }
      }

      const newClosing: DailyClosing = {
          id: `CLO-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          closedAt: new Date().toISOString(),
          closedBy: currentUser.name,
          totalIncome: currentSessionData.income,
          totalExpense: currentSessionData.expense,
          cashBalance: currentSessionData.theoreticalCash, // On garde le théorique pour la continuité comptable, l'écart est noté
          bankBalance: transactions.filter(t => !t.isDeleted && t.account === 'Compte BDL').reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0),
          realCashCount: realTotal,
          difference: difference,
          note: closingNote,
          createdBy: currentUser.name,
          updatedAt: Date.now()
      };

      setClosings(prev => [newClosing, ...prev]);
      onAddLog('CREATE', ModuleType.FINANCE, `Clôture de caisse (Z-Report) : ${newClosing.date}`);
      setIsClosingModalOpen(false);
      setBilletage({});
      setActiveZReport(newClosing);
      setView('z_report');
  };

  // --- COMPOSANT : Z-REPORT ---
  const ZReportPreview = ({ closing }: { closing: DailyClosing }) => (
      <div className="bg-white p-8 max-w-lg mx-auto border-2 border-slate-900 shadow-xl font-mono text-xs uppercase print:border-none print:shadow-none print:w-full">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
              <h2 className="text-xl font-black">TICKET Z (CLÔTURE)</h2>
              <p>Réf: {closing.id}</p>
              <p>{new Date(closing.closedAt).toLocaleString()}</p>
              <p>Caissier: {closing.closedBy}</p>
          </div>
          
          <div className="space-y-2 mb-4 border-b-2 border-dashed border-slate-300 pb-4">
              <div className="flex justify-between"><span>OUVERTURE (Report):</span><span className="font-bold">{formatCurrency(lastClosingBalance)}</span></div>
              <div className="flex justify-between"><span>TOTAL RECETTES (+):</span><span className="font-bold">{formatCurrency(closing.totalIncome)}</span></div>
              <div className="flex justify-between"><span>TOTAL DÉPENSES (-):</span><span className="font-bold">{formatCurrency(closing.totalExpense)}</span></div>
          </div>

          <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm font-black"><span>SOLDE THÉORIQUE:</span><span>{formatCurrency(closing.cashBalance)}</span></div>
              <div className="flex justify-between"><span>SOLDE COMPTÉ (Réel):</span><span>{formatCurrency(closing.realCashCount || 0)}</span></div>
              <div className="flex justify-between">
                  <span>ÉCART DE CAISSE:</span>
                  <span className={`font-black ${(closing.difference || 0) < 0 ? 'text-rose-600' : (closing.difference || 0) > 0 ? 'text-emerald-600' : ''}`}>
                      {formatCurrency(closing.difference || 0)}
                  </span>
              </div>
          </div>

          {closing.note && (
              <div className="border p-2 mb-4 bg-slate-50">
                  <span className="font-bold block mb-1">NOTE:</span>
                  <span>{closing.note}</span>
              </div>
          )}

          <div className="text-center text-[10px] text-slate-500 mt-8">
              <p>Arrêté contradictoire de la caisse.</p>
              <p>Signature Caissier _________________</p>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & NAV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
         <div className="flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-emerald-600 shadow-sm"><Wallet size={24} /></div>
            <div>
               <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Terminal Caisse</h2>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gestion de Trésorerie & Clôtures</p>
            </div>
         </div>
         <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button onClick={() => { setActiveTab('current'); setView('dashboard'); }} className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'current' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}><Calculator size={14} className="mr-2"/> Caisse du Jour</button>
            <button onClick={() => { setActiveTab('closing'); setView('dashboard'); }} className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'closing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}><Lock size={14} className="mr-2"/> Clôture (Z)</button>
            <button onClick={() => { setActiveTab('history'); setView('dashboard'); }} className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}><History size={14} className="mr-2"/> Journal</button>
         </div>
      </div>

      {view === 'z_report' && activeZReport ? (
          <div className="space-y-6">
             <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-0 z-20 no-print">
                <button onClick={() => setView('dashboard')} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all">Retour</button>
                <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase flex items-center shadow-xl hover:bg-indigo-700 transition-all"><Printer size={16} className="mr-2"/> Imprimer Z-Report</button>
             </div>
             <ZReportPreview closing={activeZReport} />
          </div>
      ) : activeTab === 'current' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           {/* STATS DU JOUR */}
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                 <div className="relative z-10 flex justify-between items-start">
                    <div>
                       <p className="text-indigo-300 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center"><Unlock size={12} className="mr-2"/> Session Ouverte</p>
                       <h3 className="text-5xl font-black tracking-tighter">{formatCurrency(currentSessionData.theoreticalCash)}</h3>
                       <p className="text-sm font-bold text-slate-400 mt-1">Solde Théorique Actuel</p>
                    </div>
                    {currentSessionData.isClosed && <div className="bg-rose-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">Journée Clôturée</div>}
                 </div>
                 
                 <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                       <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Ouverture (Report)</p>
                       <p className="text-lg font-bold">{formatCurrency(lastClosingBalance)}</p>
                    </div>
                    <div className="bg-emerald-500/20 p-4 rounded-2xl backdrop-blur-sm border border-emerald-500/30">
                       <p className="text-[9px] text-emerald-300 font-black uppercase mb-1">Entrées (+)</p>
                       <p className="text-lg font-bold text-emerald-400">{formatCurrency(currentSessionData.income)}</p>
                    </div>
                    <div className="bg-rose-500/20 p-4 rounded-2xl backdrop-blur-sm border border-rose-500/30">
                       <p className="text-[9px] text-rose-300 font-black uppercase mb-1">Sorties (-)</p>
                       <p className="text-lg font-bold text-rose-400">{formatCurrency(currentSessionData.expense)}</p>
                    </div>
                 </div>
                 <Wallet size={250} className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none" />
              </div>

              <div className="space-y-4">
                 <button onClick={() => { setTxType('income'); setIsTxModalOpen(true); }} disabled={currentSessionData.isClosed} className="w-full h-32 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[32px] shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowUpRight size={32} className="mb-2" />
                    <span className="font-black uppercase text-xs tracking-widest">Encaisser</span>
                 </button>
                 <button onClick={() => { setTxType('expense'); setIsTxModalOpen(true); }} disabled={currentSessionData.isClosed} className="w-full h-32 bg-rose-500 hover:bg-rose-600 text-white rounded-[32px] shadow-lg shadow-rose-500/20 flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowDownRight size={32} className="mb-2" />
                    <span className="font-black uppercase text-xs tracking-widest">Décasser</span>
                 </button>
              </div>
           </div>

           {/* LISTE OPERATIONS DU JOUR */}
           <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h3 className="font-black text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">Opérations de la Session</h3>
                 <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[9px] font-bold text-slate-500">{new Date().toLocaleDateString()}</span>
              </div>
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                       <th className="px-8 py-4">Heure / Réf</th>
                       <th className="px-8 py-4">Libellé</th>
                       <th className="px-8 py-4">Catégorie</th>
                       <th className="px-8 py-4 text-right">Montant</th>
                       <th className="px-8 py-4 w-10"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {currentSessionData.txs.slice().reverse().map(tx => (
                       <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-4">
                             <p className="font-black text-xs text-slate-700 dark:text-slate-300">{new Date(tx.updatedAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             <p className="font-mono text-[9px] text-slate-400">{tx.id}</p>
                          </td>
                          <td className="px-8 py-4 font-bold text-xs text-slate-600 dark:text-slate-400 uppercase">{tx.title}</td>
                          <td className="px-8 py-4"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[9px] font-black uppercase text-slate-500">{tx.category}</span></td>
                          <td className={`px-8 py-4 text-right font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                          <td className="px-8 py-4 text-right">
                             {!currentSessionData.isClosed && (
                               <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                             )}
                          </td>
                       </tr>
                    ))}
                    {currentSessionData.txs.length === 0 && (
                       <tr><td colSpan={5} className="py-20 text-center font-black text-slate-300 uppercase text-xs">Aucune opération aujourd'hui</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      ) : activeTab === 'closing' ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           {/* SECTION CLÔTURE */}
           <div className="bg-indigo-900 text-white rounded-[40px] p-10 flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                 <div className="flex items-center space-x-4 mb-4">
                    <div className="p-3 bg-white/10 rounded-2xl"><Lock size={24} className="text-indigo-300"/></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Fin de Journée</h3>
                 </div>
                 <p className="text-indigo-200 text-xs font-medium leading-relaxed uppercase tracking-widest mb-8">
                    La clôture de caisse génère le Z-Report, fige les transactions du jour et calcule les écarts éventuels.
                    Assurez-vous d'avoir compté les espèces avant de procéder.
                 </p>
                 {currentSessionData.isClosed ? (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center space-x-3 w-fit">
                       <ShieldCheck size={20} className="text-emerald-400" />
                       <span className="font-black text-xs uppercase tracking-widest text-emerald-100">Journée déjà clôturée</span>
                    </div>
                 ) : (
                    <button onClick={() => setIsClosingModalOpen(true)} className="px-10 py-4 bg-white text-indigo-900 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-50 transition-all flex items-center">
                       <Calculator size={16} className="mr-3" /> Procéder à la Clôture
                    </button>
                 )}
              </div>
              <div className="mt-8 md:mt-0 relative z-10 bg-white/5 p-6 rounded-3xl border border-white/10 min-w-[280px]">
                 <p className="text-[10px] font-black text-indigo-300 uppercase mb-2">Solde à justifier</p>
                 <p className="text-4xl font-black tracking-tighter">{formatCurrency(currentSessionData.theoreticalCash)}</p>
              </div>
              <Lock size={300} className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none" />
           </div>

           {/* HISTORIQUE DES Z */}
           <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                 <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">Historique des Clôtures (Z)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
                 {closings.map(closing => (
                    <div key={closing.id} onClick={() => { setActiveZReport(closing); setView('z_report'); }} className="group cursor-pointer bg-slate-50 dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all shadow-sm hover:shadow-md relative overflow-hidden">
                       <div className="flex justify-between items-start mb-6">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-400 group-hover:text-indigo-600 transition-colors"><FileText size={20} /></div>
                          <span className="text-[9px] font-mono text-slate-400">{closing.date}</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Caisse</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(closing.cashBalance)}</p>
                       </div>
                       {(closing.difference || 0) !== 0 && (
                          <div className="mt-4 flex items-center space-x-2 text-rose-500">
                             <AlertTriangle size={14} />
                             <span className="text-[9px] font-black uppercase">Écart: {formatCurrency(closing.difference || 0)}</span>
                          </div>
                       )}
                       <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Printer size={16} className="text-indigo-600" />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
           {/* GRAND JOURNAL */}
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-widest">Grand Journal de Caisse</h3>
              <div className="relative w-64">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold outline-none" />
              </div>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                       <th className="px-8 py-4">Date</th>
                       <th className="px-8 py-4">Libellé</th>
                       <th className="px-8 py-4">Catégorie</th>
                       <th className="px-8 py-4">Compte</th>
                       <th className="px-8 py-4 text-right">Montant</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {transactions.filter(t => !t.isDeleted && t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(tx => (
                       <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-4 font-mono text-xs text-slate-500">{tx.date}</td>
                          <td className="px-8 py-4 font-bold text-xs text-slate-700 dark:text-slate-300 uppercase">{tx.title}</td>
                          <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">{tx.category}</td>
                          <td className="px-8 py-4 text-[10px] font-black uppercase text-indigo-500">{tx.account}</td>
                          <td className={`px-8 py-4 text-right font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* MODALE NOUVELLE TRANSACTION */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSaveTransaction} className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={`p-8 text-white flex items-center justify-between ${txType === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <h3 className="font-black uppercase tracking-widest text-sm">{txType === 'income' ? 'Recette de Caisse' : 'Dépense de Caisse'}</h3>
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Libellé</label><input name="title" required autoFocus className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600" /></div>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Montant (DA)</label><input name="amount" type="number" step="0.01" required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-950 dark:text-white outline-none focus:border-indigo-600" /></div>
                <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Catégorie</label><select name="category" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none"><option value="Ventes Diverses">Ventes Diverses</option><option value="Règlement Client">Règlement Client</option><option value="Frais Généraux">Frais Généraux</option><option value="Achats">Achats</option><option value="Salaires">Salaires</option><option value="Autre">Autre</option></select></div>
              </div>
              <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Compte</label><select name="account" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none"><option value="Caisse Principale">Espèces (Caisse Principale)</option><option value="Compte BDL">Banque (Virement)</option></select></div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-4 shadow-inner">
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="px-8 py-3.5 text-slate-700 dark:text-slate-400 font-black uppercase text-xs tracking-widest">Annuler</button>
              <button type="submit" className={`px-12 py-3.5 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>Valider</button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE CLÔTURE (BILLETAGE) */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="p-8 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-widest">Clôture de Caisse</h3>
                    <p className="text-[10px] text-indigo-300 font-bold uppercase">Billetage & Vérification</p>
                 </div>
                 <button onClick={() => setIsClosingModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 {/* Zone Billetage */}
                 <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Banknote size={16} className="mr-2"/> Comptage Espèces</h4>
                    <div className="space-y-3">
                       {MONEY_UNITS.map(unit => (
                          <div key={unit.val} className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                             <span className="w-20 text-xs font-black text-slate-700 dark:text-slate-300 text-right">{unit.label}</span>
                             <span className="text-slate-400 text-xs font-bold">x</span>
                             <input 
                               type="number" 
                               min="0" 
                               placeholder="0"
                               className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold outline-none focus:border-indigo-500"
                               value={billetage[unit.val] || ''}
                               onChange={(e) => setBilletage({...billetage, [unit.val]: parseInt(e.target.value) || 0})}
                             />
                             <span className="flex-1 text-right font-black text-slate-900 dark:text-white pr-4">
                                {formatCurrency(unit.val * (billetage[unit.val] || 0))}
                             </span>
                          </div>
                       ))}
                       <div className="flex items-center space-x-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                          <span className="w-20 text-[10px] font-black text-slate-500 uppercase text-right">Monnaie</span>
                          <span className="text-slate-400 text-xs font-bold invisible">x</span>
                          <input 
                             type="number" 
                             min="0" 
                             placeholder="Total Pièces"
                             className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold outline-none focus:border-indigo-500"
                             value={billetage[1] || ''}
                             onChange={(e) => setBilletage({...billetage, 1: parseFloat(e.target.value) || 0})}
                          />
                          <span className="flex-1 text-right font-black text-slate-900 dark:text-white pr-4">{formatCurrency(billetage[1] || 0)}</span>
                       </div>
                    </div>
                 </div>

                 {/* Zone Synthèse */}
                 <div className="w-full md:w-96 p-8 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between">
                    <div className="space-y-6">
                       <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm space-y-4">
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Solde Théorique (Logiciel)</p>
                             <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(currentSessionData.theoreticalCash)}</p>
                          </div>
                          <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
                          <div>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Solde Compté (Réel)</p>
                             <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(calculateBilletageTotal())}</p>
                          </div>
                       </div>

                       {calculateBilletageTotal() !== currentSessionData.theoreticalCash && (
                          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start space-x-3">
                             <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                             <div>
                                <p className="text-[10px] font-black text-rose-600 uppercase">Écart de Caisse Détecté</p>
                                <p className="text-lg font-black text-rose-700">{formatCurrency(calculateBilletageTotal() - currentSessionData.theoreticalCash)}</p>
                             </div>
                          </div>
                       )}

                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Note de clôture (Optionnel)</label>
                          <textarea 
                             value={closingNote}
                             onChange={(e) => setClosingNote(e.target.value)}
                             className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none h-24 resize-none"
                             placeholder="Ras."
                          />
                       </div>
                    </div>

                    <button onClick={handleExecuteClosing} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center transition-all active:scale-95 mt-6">
                       <Lock size={16} className="mr-3" /> Valider Clôture
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinanceModule;