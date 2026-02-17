
import React, { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Truck, Search, X, Save, AlertCircle, PackagePlus, ChevronLeft, Trash2, Printer, Calculator } from 'lucide-react';
import { formatCurrency, numberToWords } from '../constants';
import { Purchase, Product, Partner, PurchaseItem, Transaction, User, AuditLog, ModuleType } from '../types';

interface PurchasesModuleProps {
  suppliers: Partner[];
  products: Product[];
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
  onDeletePurchase: (id: string) => void; // Nouvelle prop
}

const PurchasesModule: React.FC<PurchasesModuleProps> = ({ suppliers, products, purchases, setPurchases, setProducts, setTransactions, currentUser, onAddLog, onDeletePurchase }) => {
  const [view, setView] = useState<'list' | 'create' | 'preview'>('list');
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Partner | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [docType, setDocType] = useState<Purchase['type']>('PurchaseInvoice');

  const logoUrl = localStorage.getItem('company_logo');

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => !p.isDeleted);
  }, [purchases]);

  const totals = useMemo(() => {
    const ht = items.reduce((acc, item) => acc + (item.quantity * item.unitPriceHT), 0);
    const tva = ht * 0.19;
    return { ht, tva, ttc: ht + tva };
  }, [items]);

  const handleSavePurchase = (isFinal = true) => {
    if (!selectedSupplier || items.length === 0) return alert("Données manquantes.");

    const purchaseData: Purchase = {
      id: `PUR-${Date.now()}`,
      number: `BR-2024-${purchases.length + 101}`,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      date: new Date().toISOString().split('T')[0],
      items: items,
      amountHT: totals.ht,
      amountTVA: totals.tva,
      amountTTC: totals.ttc,
      status: isFinal ? 'Validated' : 'Draft',
      type: docType,
      createdBy: currentUser.name,
      updatedAt: Date.now()
    };

    if (isFinal) {
      setProducts(prev => prev.map(p => {
        const item = items.find(it => it.productId === p.id);
        if (item) return { ...p, stock: p.stock + item.quantity, updatedAt: Date.now() };
        return p;
      }));

      const newTx: Transaction = {
        id: `TX-PUR-${Date.now()}`,
        date: purchaseData.date,
        title: `Achat ${purchaseData.number} - ${purchaseData.supplierName}`,
        amount: purchaseData.amountTTC,
        type: 'expense',
        category: 'Achats',
        referenceId: purchaseData.id,
        account: 'Caisse Principale',
        createdBy: currentUser.name,
        updatedAt: Date.now()
      };
      setTransactions(prev => [newTx, ...prev]);
      onAddLog('CREATE', ModuleType.PURCHASES, `Nouvel achat ${purchaseData.number} validé`);
    } else {
      onAddLog('CREATE', ModuleType.PURCHASES, `Brouillon achat ${purchaseData.number}`);
    }

    setPurchases([purchaseData, ...purchases]);
    setActivePurchase(purchaseData);
    setView('preview');
  };

  const PrintableBR = ({ purchase }: { purchase: Purchase }) => (
    <div className="bg-white p-12 max-w-4xl mx-auto shadow-2xl border border-slate-200 text-slate-900 font-serif min-h-[1100px] flex flex-col print:shadow-none print:border-none">
      <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8 mb-10">
        <div className="flex items-center space-x-6">
          {logoUrl && <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain" />}
          <div>
            <h1 className="text-xl font-black uppercase">SARL DZ MANAGER SOLUTIONS</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Bon de Réception / Achat</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-indigo-600 uppercase mb-2">BON DE RÉCEPTION</h2>
          <p className="text-xs font-black bg-slate-900 text-white px-4 py-1 inline-block rounded-md tracking-widest">N° {purchase.number}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2">DATE : {purchase.date}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-10">
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Fournisseur</p>
           <h3 className="text-lg font-black text-slate-900 uppercase">{purchase.supplierName}</h3>
           <p className="text-xs font-bold text-slate-500 mt-2">Dossier: {purchase.supplierId}</p>
        </div>
      </div>

      <table className="w-full mb-12">
        <thead>
          <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            <th className="px-4 py-4 text-left rounded-tl-xl">Article</th>
            <th className="px-4 py-4 text-center">Qté Reçue</th>
            <th className="px-4 py-4 text-right">P.U HT</th>
            <th className="px-4 py-4 text-right rounded-tr-xl">Total HT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100">
          {purchase.items.map((item, idx) => (
            <tr key={idx} className="text-xs font-bold">
              <td className="px-4 py-4">{item.name}</td>
              <td className="px-4 py-4 text-center">{item.quantity}</td>
              <td className="px-4 py-4 text-right">{formatCurrency(item.unitPriceHT)}</td>
              <td className="px-4 py-4 text-right font-black">{formatCurrency(item.quantity * item.unitPriceHT)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-auto pt-8 flex justify-between items-end border-t border-slate-100">
         <div className="w-72 bg-slate-900 text-white p-6 rounded-[32px] space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-indigo-300"><span>TOTAL HT</span><span>{formatCurrency(purchase.amountHT)}</span></div>
            <div className="flex justify-between text-[10px] font-bold text-indigo-300"><span>TVA (19%)</span><span>{formatCurrency(purchase.amountTVA)}</span></div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
               <span className="text-xs font-black uppercase tracking-widest">NET À PAYER</span>
               <span className="text-lg font-black">{formatCurrency(purchase.amountTTC)}</span>
            </div>
         </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {view === 'preview' && activePurchase ? (
        <div className="space-y-6">
           <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm sticky top-0 z-20">
             <button onClick={() => setView('list')} className="flex items-center space-x-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all"><ChevronLeft size={16} /> <span>Retour</span></button>
             <button onClick={() => window.print()} className="flex items-center space-x-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-800 transition-all shadow-xl"><Printer size={18} /> <span>Imprimer BR</span></button>
           </div>
           <PrintableBR purchase={activePurchase} />
        </div>
      ) : view === 'create' ? (
        <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
             <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-50 rounded-2xl"><PackagePlus size={24} /></div><h2 className="text-xl font-black uppercase tracking-widest">Réception de Stock</h2></div>
             <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
          </div>
          <div className="p-10 grid grid-cols-1 lg:grid-cols-4 gap-10">
             <div className="lg:col-span-3 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50 rounded-[32px] border border-slate-200">
                   <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"><option value="PurchaseInvoice">Facture d'Achat</option><option value="Order">Bon de Réception</option></select>
                   <select value={selectedSupplier?.id || ''} onChange={(e) => setSelectedSupplier(suppliers.find(s => s.id === e.target.value) || null)} className="md:col-span-2 px-5 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-800 outline-none"><option value="">-- Fournisseur --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                </div>
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden">
                   <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-6 py-4">Article</th><th className="px-6 py-4 text-center">Qté</th><th className="px-6 py-4 text-right">P.U HT</th><th className="px-6 py-4 text-center"></th></tr></thead><tbody className="divide-y divide-slate-50">{items.map((item, idx) => (<tr key={idx}><td className="px-6 py-4 font-black">{item.name}</td><td className="px-6 py-4 text-center"><input type="number" min="1" value={item.quantity} onChange={e => { const n = [...items]; n[idx].quantity = parseInt(e.target.value) || 0; setItems(n); }} className="w-16 text-center bg-slate-100 rounded-lg py-1 font-black" /></td><td className="px-6 py-4 text-right">{formatCurrency(item.unitPriceHT)}</td><td className="px-6 py-4 text-center"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button></td></tr>))}</tbody></table>
                </div>
             </div>
             <div className="space-y-8">
                <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 shadow-2xl">
                   <h3 className="text-xs font-black uppercase text-indigo-300">Résumé Achat</h3>
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-400"><span>TOTAL HT</span><span>{formatCurrency(totals.ht)}</span></div>
                      <div className="flex justify-between text-xs font-bold text-slate-400"><span>TVA (19%)</span><span>{formatCurrency(totals.tva)}</span></div>
                      <div className="pt-4 border-t border-white/10"><p className="text-[10px] font-black text-indigo-300 uppercase mb-1">À PAYER (DZD)</p><p className="text-3xl font-black">{formatCurrency(totals.ttc)}</p></div>
                   </div>
                   <button onClick={() => handleSavePurchase(true)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl tracking-widest active:scale-95 transition-all">Enregistrer & Stocker</button>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 h-[300px] overflow-y-auto">
                   {products.map(p => (<button key={p.id} onClick={() => setItems([...items, { productId: p.id, name: p.name, quantity: 1, unitPriceHT: p.priceRetail * 0.7, tvaRate: 0.19 }])} className="w-full p-3 mb-2 bg-slate-50 border rounded-xl flex justify-between group hover:border-indigo-500 transition-all text-left"><div><p className="text-xs font-black">{p.name}</p><p className="text-[9px] text-slate-400 font-black">Stock: {p.stock}</p></div><Plus size={14} className="text-slate-300 group-hover:text-indigo-600" /></button>))}
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="flex justify-between items-center"><h2 className="text-xl font-black uppercase text-slate-800 tracking-tighter">Réceptions Fournisseurs</h2><button onClick={() => { setView('create'); setItems([]); setSelectedSupplier(null); }} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all"><Plus size={18} className="mr-3" /> Nouvelle Réception</button></div>
           <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 uppercase text-[10px] tracking-widest"><th className="px-8 py-5">Bon de Réception</th><th className="px-8 py-5">Fournisseur</th><th className="px-8 py-5">Montant TTC</th><th className="px-8 py-5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredPurchases.map((pur) => (<tr key={pur.id} className="hover:bg-slate-50 group transition-colors cursor-pointer" onClick={() => { setActivePurchase(pur); setView('preview'); }}><td className="px-8 py-5 font-black text-slate-700 text-sm"><div>{pur.number}</div><div className="text-[9px] text-slate-400">{pur.date}</div></td><td className="px-8 py-5 text-xs font-black text-indigo-600 uppercase">{pur.supplierName}</td><td className="px-8 py-5 font-black text-slate-800 text-sm">{formatCurrency(pur.amountTTC)}</td><td className="px-8 py-5 text-right flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-2.5 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Printer size={16} /></button><button onClick={(e) => { e.stopPropagation(); onDeletePurchase(pur.id); }} className="p-2.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
        </div>
      )}
    </div>
  );
};

export default PurchasesModule;
