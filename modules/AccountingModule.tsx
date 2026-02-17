
import React, { useState, useMemo } from 'react';
import { BookOpen, FileText, Download, TrendingUp, AlertTriangle, ListFilter, Calendar, ChevronRight, Printer, ShieldCheck, Landmark, Users, Briefcase, Building } from 'lucide-react';
import { formatCurrency, TAX_RATES } from '../constants';
import { Invoice, Transaction, Purchase, Partner, Employee } from '../types';

interface AccountingModuleProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients: Partner[];
  suppliers: Partner[];
  transactions: Transaction[];
  employees?: Employee[];
}

const AccountingModule: React.FC<AccountingModuleProps> = ({ invoices, purchases, clients, suppliers, transactions, employees = [] }) => {
  const [activeTab, setActiveTab] = useState<'g50' | 'das' | '301bis' | 'dac' | 'ledger'>('g50');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // --- LOGIQUE ÉTAT 301 BIS (Ex État 104) ---
  const etat301Data = useMemo(() => {
    const data: Record<string, { partner: Partner, ht: number, tva: number, ttc: number }> = {};
    invoices.filter(i => i.status === 'Validated' && i.type === 'Invoice' && i.date.startsWith(selectedYear)).forEach(inv => {
      if (!data[inv.partnerId]) {
        const p = clients.find(c => c.id === inv.partnerId);
        if (p) data[inv.partnerId] = { partner: p, ht: 0, tva: 0, ttc: 0 };
      }
      if (data[inv.partnerId]) {
        data[inv.partnerId].ht += inv.totalHT;
        data[inv.partnerId].tva += inv.totalTVA;
        data[inv.partnerId].ttc += inv.totalTTC;
      }
    });
    return Object.values(data);
  }, [invoices, clients, selectedYear]);

  // --- LOGIQUE G50 (Mensuel) ---
  const g50Calculations = useMemo(() => {
    const monthSales = invoices.filter(i => i.date.startsWith(selectedMonth) && i.status === 'Validated');
    const monthPurchases = purchases.filter(p => p.date.startsWith(selectedMonth) && p.status === 'Validated');
    
    const caHt = monthSales.reduce((acc, i) => acc + i.totalHT, 0);
    const tap = caHt * TAX_RATES.TAP_RATE; // TAP
    const tvaCollectee = monthSales.reduce((acc, i) => acc + i.totalTVA, 0);
    const tvaDeductible = monthPurchases.reduce((acc, i) => acc + i.amountTVA, 0);
    const timbre = monthSales.reduce((acc, i) => acc + i.timbreFiscal, 0);
    
    // Estimation IRG Salaire (Simplifiée pour la démo : Base * Nb Employés)
    // Dans une version complète, cela viendrait des bulletins de paie générés
    let irgSalaires = 0;
    employees.forEach(emp => {
       // Simulation rapide de l'IRG mensuel moyen basé sur le salaire de base
       const base = emp.baseSalary;
       if (base > 30000) irgSalaires += (base * 0.15); // Taux moyen simulé
    });
    
    const totalAPayer = tap + Math.max(0, tvaCollectee - tvaDeductible) + irgSalaires + timbre;

    return { caHt, tap, tvaCollectee, tvaDeductible, irgSalaires, timbre, totalAPayer };
  }, [selectedMonth, invoices, purchases, employees]);

  // --- LOGIQUE DAC (Déclaration Annuelle CA - G1) ---
  const dacCalculations = useMemo(() => {
      const yearInvoices = invoices.filter(i => i.date.startsWith(selectedYear) && i.status === 'Validated');
      const caGlobal = yearInvoices.reduce((acc, i) => acc + i.totalHT, 0);
      const tapAnnuelle = caGlobal * TAX_RATES.TAP_RATE;
      const ibs = caGlobal * 0.19; // IBS estimatif à 19% (dépend du bénéfice réel en compta)
      
      return { caGlobal, tapAnnuelle, ibs };
  }, [invoices, selectedYear]);

  // --- LOGIQUE DAS (Déclaration Annuelle Salaires) ---
  const dasData = useMemo(() => {
      return employees.map(emp => {
          // Simulation annuelle : Salaire mensuel * 12 (À connecter aux vrais bulletins dans le futur)
          const brutAnnuel = (emp.baseSalary + emp.presenceBonus) * 12;
          const cnasAnnuel = brutAnnuel * 0.09;
          const imposableAnnuel = brutAnnuel - cnasAnnuel;
          // Barème IRG simplifié annuel
          const irgAnnuel = imposableAnnuel * 0.20; // Moyenne pour l'exemple
          
          return {
              emp,
              brutAnnuel,
              cnasAnnuel,
              imposableAnnuel,
              irgAnnuel,
              netAnnuel: brutAnnuel - cnasAnnuel - irgAnnuel
          };
      });
  }, [employees]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 w-full md:w-fit overflow-x-auto no-scrollbar no-print">
        <button onClick={() => setActiveTab('g50')} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'g50' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>G50 (Mensuel)</button>
        <button onClick={() => setActiveTab('das')} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'das' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>DAS (Salaires)</button>
        <button onClick={() => setActiveTab('301bis')} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === '301bis' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>État 301 Bis</button>
        <button onClick={() => setActiveTab('dac')} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'dac' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>DAC (G1)</button>
        <button onClick={() => setActiveTab('ledger')} className={`px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ledger' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>Grand Livre</button>
      </div>

      {activeTab === 'g50' && (
        <div className="space-y-8 max-w-5xl mx-auto">
           <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 no-print">
              <div><h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">Déclaration G50 (C50)</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Déclaration mensuelle des impôts</p></div>
              <div className="flex items-center space-x-3">
                 <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-xs outline-none dark:text-white" />
                 <button onClick={() => window.print()} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"><Printer size={20}/></button>
              </div>
           </div>

           <div className="bg-white border-2 border-slate-900 p-10 font-serif text-slate-900 print:border-none print:p-4 min-h-[1200px]">
              <div className="flex justify-between border-b-2 border-slate-900 pb-6 mb-8">
                 <div className="space-y-1">
                    <h1 className="text-sm font-black uppercase">République Algérienne Démocratique et Populaire</h1>
                    <p className="text-[10px] font-bold">Ministère des Finances - DGI</p>
                    <p className="text-[10px] font-bold">Inspection des Impôts</p>
                    <div className="mt-4 p-2 bg-slate-100 border border-slate-300 inline-block rounded text-[10px] font-black uppercase">Série G N° 50</div>
                 </div>
                 <div className="text-right space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">Période : {selectedMonth}</p>
                    <p className="text-[9px] font-bold">NIF : 002416001234567</p>
                    <p className="text-[9px] font-bold">Raison Sociale : ENTREPRISE ALGERIENNE</p>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 text-[10px] font-black uppercase">I. TAP (Taxe sur l'Activité Professionnelle)</div>
                    <div className="p-4 grid grid-cols-3 gap-4 text-xs">
                       <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Chiffre d'Affaires (HT)</p><p className="font-black">{formatCurrency(g50Calculations.caHt)}</p></div>
                       <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Taux</p><p className="font-black">2.00 % (Exonéré Prod)</p></div>
                       <div className="bg-slate-50 p-2 rounded border border-slate-100"><p className="text-[9px] font-bold text-slate-700 uppercase mb-1">Montant à Payer</p><p className="font-black text-sm">{formatCurrency(g50Calculations.tap)}</p></div>
                    </div>
                 </div>

                 <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 text-[10px] font-black uppercase">II. TVA (Taxe sur la Valeur Ajoutée)</div>
                    <div className="p-4 space-y-4">
                       <div className="flex justify-between items-center text-xs border-b pb-2 border-slate-100">
                          <span className="font-bold">TVA Collectée (Ventes):</span>
                          <span className="font-black text-emerald-600">{formatCurrency(g50Calculations.tvaCollectee)}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs border-b pb-2 border-slate-100">
                          <span className="font-bold">TVA Déductible (Achats):</span>
                          <span className="font-black text-rose-600">{formatCurrency(g50Calculations.tvaDeductible)}</span>
                       </div>
                       <div className="flex justify-between items-center bg-slate-50 p-3 rounded">
                          <span className="text-[10px] font-black uppercase">A Payer / Précompte :</span>
                          <span className="text-base font-black">{formatCurrency(Math.max(0, g50Calculations.tvaCollectee - g50Calculations.tvaDeductible))}</span>
                       </div>
                    </div>
                 </div>

                 <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 text-[10px] font-black uppercase">III. IRG / IBS (Retenues à la source)</div>
                    <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                       <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">IRG Salaires</p><p className="font-black">{formatCurrency(g50Calculations.irgSalaires)}</p></div>
                       <div><p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Timbre Fiscal</p><p className="font-black">{formatCurrency(g50Calculations.timbre)}</p></div>
                    </div>
                 </div>

                 <div className="bg-slate-900 p-10 rounded-2xl text-white flex justify-between items-center mt-10 shadow-xl">
                    <div>
                       <h2 className="text-[11px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">Total à Payer</h2>
                       <p className="text-5xl font-black tracking-tighter">{formatCurrency(g50Calculations.totalAPayer)}</p>
                    </div>
                    <div className="text-right border-l border-white/20 pl-10 space-y-1">
                       <p className="text-[10px] font-black uppercase">Cadre Réservé au Caissier</p>
                       <div className="w-48 h-20 border-2 border-dashed border-white/20 mt-2 flex items-center justify-center text-[8px] font-bold uppercase opacity-30">Cachet & Signature</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'das' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 no-print">
              <div><h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">Déclaration Annuelle des Salaires (DAS)</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Série G N° 29 - Exercice {selectedYear}</p></div>
              <div className="flex items-center space-x-3">
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-xs outline-none dark:text-white"><option value="2024">2024</option><option value="2025">2025</option></select>
                 <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl"><Printer size={16} className="mr-3" /> Imprimer DAS</button>
              </div>
           </div>
           
           <div className="bg-white border p-12 min-h-[1000px] font-serif print:border-none print:p-0 print:text-xs">
              <h1 className="text-xl font-black uppercase text-center mb-10 border-b-2 border-slate-900 pb-4">État des Traitements et Salaires (DAS)</h1>
              <table className="w-full border-collapse border border-slate-900 text-[10px]">
                 <thead>
                    <tr className="bg-slate-100 uppercase text-center font-black">
                       <th className="border border-slate-900 p-2">Matricule</th>
                       <th className="border border-slate-900 p-2">Nom & Prénom</th>
                       <th className="border border-slate-900 p-2">Fonction</th>
                       <th className="border border-slate-900 p-2 bg-slate-200">Salaire Brut Annuel</th>
                       <th className="border border-slate-900 p-2">Retenue SS (9%)</th>
                       <th className="border border-slate-900 p-2">Imposable</th>
                       <th className="border border-slate-900 p-2 bg-slate-200">Retenue IRG</th>
                       <th className="border border-slate-900 p-2">Net Annuel</th>
                    </tr>
                 </thead>
                 <tbody>
                    {dasData.map((d, i) => (
                       <tr key={i}>
                          <td className="border border-slate-900 p-2 font-mono">{d.emp.cnasNumber || 'N/A'}</td>
                          <td className="border border-slate-900 p-2 font-bold uppercase">{d.emp.name}</td>
                          <td className="border border-slate-900 p-2">{d.emp.position}</td>
                          <td className="border border-slate-900 p-2 text-right bg-slate-50 font-black">{formatCurrency(d.brutAnnuel)}</td>
                          <td className="border border-slate-900 p-2 text-right">{formatCurrency(d.cnasAnnuel)}</td>
                          <td className="border border-slate-900 p-2 text-right">{formatCurrency(d.imposableAnnuel)}</td>
                          <td className="border border-slate-900 p-2 text-right bg-slate-50 font-black">{formatCurrency(d.irgAnnuel)}</td>
                          <td className="border border-slate-900 p-2 text-right font-black">{formatCurrency(d.netAnnuel)}</td>
                       </tr>
                    ))}
                 </tbody>
                 <tfoot>
                    <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                       <td colSpan={3} className="p-3 text-right">Totaux Généraux</td>
                       <td className="p-3 text-right">{formatCurrency(dasData.reduce((acc, d) => acc + d.brutAnnuel, 0))}</td>
                       <td className="p-3 text-right">{formatCurrency(dasData.reduce((acc, d) => acc + d.cnasAnnuel, 0))}</td>
                       <td className="p-3 text-right">{formatCurrency(dasData.reduce((acc, d) => acc + d.imposableAnnuel, 0))}</td>
                       <td className="p-3 text-right">{formatCurrency(dasData.reduce((acc, d) => acc + d.irgAnnuel, 0))}</td>
                       <td className="p-3 text-right">{formatCurrency(dasData.reduce((acc, d) => acc + d.netAnnuel, 0))}</td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>
      )}

      {activeTab === '301bis' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 no-print">
              <div><h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">État des Clients (301 Bis)</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Anciennement État 104 - Exercice {selectedYear}</p></div>
              <div className="flex items-center space-x-3">
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-xs outline-none dark:text-white"><option value="2024">2024</option><option value="2025">2025</option></select>
                 <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl"><Printer size={16} className="mr-3" /> Imprimer 301 Bis</button>
              </div>
           </div>
           
           <div className="bg-white border p-12 min-h-[1000px] font-serif print:border-none print:p-0">
              <div className="text-center mb-10 pb-6 border-b-2 border-slate-900">
                 <h1 className="text-xl font-black uppercase">ÉTAT DÉTAILLÉ DES CLIENTS (301 BIS)</h1>
                 <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">(Art. 224 du Code des Impôts Directs)</p>
                 <div className="mt-4 flex justify-center space-x-10 text-[9px] font-black uppercase text-slate-500">
                    <p>Série G., n° 3 bis.</p>
                    <p>Année : {selectedYear}</p>
                 </div>
              </div>

              <table className="w-full border-collapse border border-slate-900">
                 <thead>
                    <tr className="bg-slate-100 text-[9px] font-black uppercase text-center">
                       <th className="border border-slate-900 p-2 w-24">NIF Client</th>
                       <th className="border border-slate-900 p-2 w-24">RC</th>
                       <th className="border border-slate-900 p-2">RAISON SOCIALE / NOM</th>
                       <th className="border border-slate-900 p-2 w-48">ADRESSE</th>
                       <th className="border border-slate-900 p-2 w-32">MONTANT HT</th>
                       <th className="border border-slate-900 p-2 w-32">TVA FACTURÉE</th>
                       <th className="border border-slate-900 p-2 w-32">MONTANT TTC</th>
                    </tr>
                 </thead>
                 <tbody className="text-[10px] font-bold">
                    {etat301Data.map((row, i) => (
                      <tr key={i}>
                         <td className="border border-slate-900 p-2 font-mono text-center">{row.partner.nif}</td>
                         <td className="border border-slate-900 p-2 font-mono text-center">{row.partner.rc}</td>
                         <td className="border border-slate-900 p-2 uppercase">{row.partner.name}</td>
                         <td className="border border-slate-900 p-2 text-[8px] uppercase leading-tight">{row.partner.address}</td>
                         <td className="border border-slate-900 p-2 text-right">{formatCurrency(row.ht)}</td>
                         <td className="border border-slate-900 p-2 text-right font-black">{formatCurrency(row.tva)}</td>
                         <td className="border border-slate-900 p-2 text-right">{formatCurrency(row.ttc)}</td>
                      </tr>
                    ))}
                    {[...Array(Math.max(0, 15 - etat301Data.length))].map((_, i) => (
                      <tr key={`empty-${i}`} className="h-10"><td className="border border-slate-900"/><td className="border border-slate-900"/><td className="border border-slate-900"/><td className="border border-slate-900"/><td className="border border-slate-900"/><td className="border border-slate-900"/><td className="border border-slate-900"/></tr>
                    ))}
                 </tbody>
                 <tfoot>
                    <tr className="bg-slate-200 text-xs font-black uppercase">
                       <td colSpan={4} className="border border-slate-900 p-4 text-right">TOTAUX GÉNÉRAUX</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(etat301Data.reduce((acc, r) => acc + r.ht, 0))}</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(etat301Data.reduce((acc, r) => acc + r.tva, 0))}</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(etat301Data.reduce((acc, r) => acc + r.ttc, 0))}</td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'dac' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 no-print">
              <div><h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">Déclaration Annuelle CA (DAC)</h3><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Série G N° 1 - Exercice {selectedYear}</p></div>
              <div className="flex items-center space-x-3">
                 <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-xs outline-none dark:text-white"><option value="2024">2024</option><option value="2025">2025</option></select>
                 <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl"><Printer size={16} className="mr-3" /> Imprimer DAC</button>
              </div>
           </div>
           
           <div className="bg-white border p-12 font-serif text-slate-900 print:border-none print:p-0">
              <div className="text-center mb-12">
                 <h1 className="text-2xl font-black uppercase mb-2">DÉCLARATION ANNUELLE DES RÉSULTATS (DAC)</h1>
                 <p className="text-sm font-bold">RÉGIME DU RÉEL</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                 <div className="p-6 border border-slate-900 rounded-lg">
                    <h4 className="font-black uppercase mb-4 text-xs underline">I. Identification</h4>
                    <p className="text-xs mb-1">Raison Sociale : <span className="font-bold">ENTREPRISE ALGERIENNE</span></p>
                    <p className="text-xs mb-1">Activité : <span className="font-bold">COMMERCE & SERVICES</span></p>
                    <p className="text-xs">Adresse : <span className="font-bold">ALGER, ALGERIE</span></p>
                 </div>
                 <div className="p-6 border border-slate-900 rounded-lg">
                    <h4 className="font-black uppercase mb-4 text-xs underline">II. Résumé Exercice</h4>
                    <p className="text-xs mb-1">Période : <span className="font-bold">01/01/{selectedYear} au 31/12/{selectedYear}</span></p>
                    <p className="text-xs">NIF : <span className="font-bold font-mono">002416001234567</span></p>
                 </div>
              </div>

              <table className="w-full border-collapse border border-slate-900 mb-8">
                 <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase">
                       <th className="p-4 text-left">Désignation</th>
                       <th className="p-4 text-right">Montant (DZD)</th>
                    </tr>
                 </thead>
                 <tbody className="text-sm font-bold">
                    <tr>
                       <td className="border border-slate-900 p-4">1. Chiffre d'Affaires Global (HT)</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(dacCalculations.caGlobal)}</td>
                    </tr>
                    <tr>
                       <td className="border border-slate-900 p-4">2. TAP Due (2%)</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(dacCalculations.tapAnnuelle)}</td>
                    </tr>
                    <tr className="bg-slate-100">
                       <td className="border border-slate-900 p-4">3. IBS Estimatif (19% sur Résultat Fiscal)</td>
                       <td className="border border-slate-900 p-4 text-right">{formatCurrency(dacCalculations.ibs)}</td>
                    </tr>
                 </tbody>
              </table>

              <div className="flex justify-between items-end mt-20">
                 <div>
                    <p className="text-xs font-bold">Fait à Alger, le {new Date().toLocaleDateString()}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xs font-bold uppercase mb-8">Signature et Cachet du Contribuable</p>
                    <div className="w-64 h-32 border-2 border-slate-300 border-dashed rounded-xl"></div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-widest mb-10 flex items-center"><Landmark size={20} className="mr-3" /> Synthèse des Tiers (Grand Livre Auxiliaire)</h3>
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase">Créances Clients (Débit)</span>
                    <span className="text-xl font-black text-indigo-600">{formatCurrency(clients.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0))}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                    <span className="text-[11px] font-black text-slate-400 uppercase">Dettes Fournisseurs (Crédit)</span>
                    <span className="text-xl font-black text-rose-600">{formatCurrency(suppliers.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0))}</span>
                 </div>
              </div>
           </div>
           <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between">
              <div>
                 <h3 className="text-xs font-black uppercase text-indigo-300 tracking-widest mb-6">Contrôle de Gestion</h3>
                 <p className="text-sm font-bold opacity-70 mb-10 leading-relaxed">Générez les rapports annuels pour le commissaire aux comptes en un clic.</p>
              </div>
              <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center shadow-2xl">
                 <Download size={16} className="mr-3" /> Exporter Grand Livre (Excel)
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AccountingModule;
