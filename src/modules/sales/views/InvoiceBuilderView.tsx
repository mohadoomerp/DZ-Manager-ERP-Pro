import React from 'react';
import { User, Search, Settings2, X, Percent, Coins, CheckCircle2, RefreshCw, Plus } from 'lucide-react';
import { Product, Partner, CompanySettings, InvoiceItem, Invoice } from '../../../types';
import { formatCurrency } from '../../../constants';
import A4InvoiceTemplate from '../templates/A4InvoiceTemplate';

interface InvoiceBuilderViewProps {
  products: Product[];
  clients: Partner[];
  selectedClient: Partner | null;
  setSelectedClient: (client: Partner | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addToCart: (product: Product) => void;
  cart: InvoiceItem[];
  totals: { ht: number; discountAmount: number; netCommercial: number; tva: number; timbre: number; ttc: number };
  companySettings: CompanySettings;
  invoiceType: Invoice['type'];
  setInvoiceType: (type: Invoice['type']) => void;
  paymentMode: 'Cash' | 'Check' | 'Transfer';
  setPaymentMode: (mode: 'Cash' | 'Check' | 'Transfer') => void;
  isTaxExempt: boolean;
  setIsTaxExempt: (val: boolean) => void;
  globalDiscount: number;
  setGlobalDiscount: (val: number) => void;
  handleCheckout: () => void;
  resetForm: () => void;
  editingInvoiceId: string | null;
  editingNumber: string | null;
}

const InvoiceBuilderView: React.FC<InvoiceBuilderViewProps> = ({
  products, clients, selectedClient, setSelectedClient, searchTerm, setSearchTerm,
  addToCart, cart, totals, companySettings, invoiceType, setInvoiceType,
  paymentMode, setPaymentMode, isTaxExempt, setIsTaxExempt, globalDiscount, setGlobalDiscount,
  handleCheckout, resetForm, editingInvoiceId, editingNumber
}) => {
  return (
    <div className="grid grid-cols-12 gap-8 h-[calc(100vh-180px)] overflow-hidden">
        <div className="col-span-3 flex flex-col space-y-6 no-print">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><User size={16} className="mr-2 text-indigo-500"/> Client</h3>
                <select 
                    value={selectedClient?.id || ''} 
                    onChange={e => setSelectedClient(clients.find(c => c.id === e.target.value) || null)}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-xs font-bold outline-none"
                >
                    <option value="">-- CLIENT PASSAGER --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Chercher article..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-indigo-600"
                    />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                    {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl transition-all group flex justify-between items-center border border-transparent hover:border-indigo-200">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-[11px] truncate uppercase text-slate-700 dark:text-slate-200">{p.name}</p>
                                <p className="text-[9px] font-mono text-slate-400">{formatCurrency(p.priceRetail)}</p>
                            </div>
                            <Plus size={14} className="ml-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="col-span-6 print:col-span-12 print:w-full print:absolute print:top-0 print:left-0 print:z-[200] overflow-y-auto no-scrollbar pb-10">
            <div className="origin-top scale-[0.95] xl:scale-100 transition-transform">
                <A4InvoiceTemplate 
                    invoice={{ type: invoiceType, number: editingNumber || '---' }} 
                    companySettings={companySettings}
                    client={selectedClient}
                    items={cart}
                    totals={totals}
                    paymentMode={paymentMode}
                    isTaxExempt={isTaxExempt}
                    globalDiscount={globalDiscount}
                />
            </div>
        </div>

        <div className="col-span-3 space-y-6 no-print overflow-y-auto no-scrollbar pb-20">
            <button onClick={resetForm} className="w-full py-4 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-[24px] font-black text-[10px] uppercase flex items-center justify-center transition-all">
                <X size={16} className="mr-2"/> Réinitialiser
            </button>

            <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center"><Settings2 size={16} className="mr-2"/> Paramètres</h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 ml-1">Type de Document</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Invoice', 'Proforma', 'Delivery', 'Quote'].map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setInvoiceType(t as any)}
                                    className={`px-3 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${invoiceType === t ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                >
                                    {t === 'Invoice' ? 'Facture' : t === 'Delivery' ? 'Livraison' : t === 'Quote' ? 'Devis' : t}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 ml-1">Mode de Règlement</label>
                        <select 
                            value={paymentMode} 
                            onChange={(e) => setPaymentMode(e.target.value as any)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-black outline-none text-white"
                        >
                            <option value="Cash" className="text-black">Espèces (+Timbre)</option>
                            <option value="Check" className="text-black">Chèque Bancaire</option>
                            <option value="Transfer" className="text-black">Virement / CCP</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center"><Coins size={16} className="mr-2"/> Taxes & Remises</h3>
                
                <div className="space-y-6">
                    <label className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${isTaxExempt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                        <input type="checkbox" checked={isTaxExempt} onChange={e => setIsTaxExempt(e.target.checked)} className="w-5 h-5 accent-indigo-600 mr-3" />
                        <div>
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase">Exonération TVA</p>
                        </div>
                    </label>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                         <div className="flex justify-between items-center mb-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase flex items-center"><Percent size={12} className="mr-1 text-rose-500"/> Remise Globale (%)</label>
                            {globalDiscount > 0 && (
                                <span className="text-[10px] font-black text-rose-600">-{formatCurrency(totals.discountAmount)}</span>
                            )}
                         </div>
                         <div className="relative">
                            <input 
                                type="number" 
                                min="0"
                                max="100"
                                value={globalDiscount} 
                                onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-black outline-none pr-10"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                         </div>
                    </div>
                </div>
            </div>

            <button onClick={handleCheckout} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center justify-center">
                {editingInvoiceId ? <RefreshCw size={20} className="mr-3" /> : <CheckCircle2 size={20} className="mr-3"/>} 
                {editingInvoiceId ? 'METTRE À JOUR' : 'VALIDER & IMPRIMER'}
            </button>
        </div>
    </div>
  );
};

export default InvoiceBuilderView;