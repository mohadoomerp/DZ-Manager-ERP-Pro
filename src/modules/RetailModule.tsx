import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ScanBarcode, ShoppingCart, Trash2, Minus, Plus, RefreshCw, 
  Printer, Banknote, CreditCard, X, Percent
} from 'lucide-react';
import { Product, Invoice, InvoiceItem, CompanySettings, Transaction } from '../types';
import { formatCurrency } from '../constants';
import TicketTemplate from './sales/templates/TicketTemplate';

interface RetailModuleProps {
  products: Product[];
  companySettings: CompanySettings;
  onSaveInvoice: (invoice: Invoice) => void;
  onStockUpdate: (productId: string, quantityChange: number) => void;
  onTransactionAdd: (tx: Transaction) => void;
}

const RetailModule: React.FC<RetailModuleProps> = ({ 
  products, companySettings, onSaveInvoice, onStockUpdate, onTransactionAdd 
}) => {
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [globalDiscount, setGlobalDiscount] = useState<number>(0); 
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card'>('Cash');
  const [ticketNumber, setTicketNumber] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
        }
    };
    if (!isPaymentModalOpen) {
        const timer = setTimeout(focusInput, 100);
        return () => clearTimeout(timer);
    }
  }, [isPaymentModalOpen]);

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const code = searchTerm.trim();
        if (!code) return;

        const product = products.find(p => p.code === code);
        if (product) {
            addToCart(product);
            setSearchTerm('');
        } else {
            alert(`Produit avec code-barres "${code}" non trouvé.`);
            setSearchTerm('');
        }
    }
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      !p.isDeleted && 
      (selectedCategory === 'All' || p.category === selectedCategory) &&
      (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, selectedCategory, searchTerm]);

  const totals = useMemo(() => {
    const htBrut = cart.reduce((acc, item) => acc + (item.quantity * item.unitPriceHT), 0);
    const discountRate = Math.min(Math.max(Number(globalDiscount) || 0, 0), 100);
    const discountAmount = (htBrut * discountRate) / 100;
    const netCommercial = Math.max(0, htBrut - discountAmount);
    const ttc = netCommercial; 
    
    return { ht: htBrut, discountAmount, netCommercial, tva: 0, timbre: 0, ttc };
  }, [cart, globalDiscount]);

  const changeDue = useMemo(() => Math.max(0, receivedAmount - totals.ttc), [receivedAmount, totals.ttc]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        quantity: 1, 
        unitPriceHT: product.priceRetail, 
        tvaRate: 0 
      }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[idx];
      item.quantity += delta;
      if (item.quantity <= 0) {
        newCart.splice(idx, 1);
      }
      return newCart;
    });
  };

  const clearCart = () => {
      setCart([]);
      setReceivedAmount(0);
      setGlobalDiscount(0);
      setIsPaymentModalOpen(false);
  };

  const handlePaymentClick = () => {
      if (cart.length === 0) return;
      setReceivedAmount(totals.ttc);
      setIsPaymentModalOpen(true);
      setTicketNumber(`TK-${new Date().getFullYear()}-${Math.floor(Date.now() / 1000).toString().slice(-6)}`);
  };

  const finalizeTransaction = () => {
      const invoiceData: Invoice = {
          id: `TICKET-${Date.now()}`,
          number: ticketNumber,
          date: new Date().toISOString().split('T')[0],
          partnerId: 'CLIENT-PASSAGER',
          partnerName: 'Client Comptoir',
          items: cart,
          totalHT: totals.ht, 
          totalTVA: 0,
          timbreFiscal: 0,
          totalTTC: totals.ttc,
          globalDiscount: globalDiscount,
          status: 'Paid',
          type: 'Invoice',
          paymentMethod: paymentMethod === 'Cash' ? 'Cash' : 'Transfer', 
          excludeTva: true,
          updatedAt: Date.now()
      };
      onSaveInvoice(invoiceData);
      cart.forEach(item => onStockUpdate(item.productId, -item.quantity));
      onTransactionAdd({
          id: `TX-POS-${Date.now()}`,
          date: invoiceData.date,
          title: `Vente Comptoir ${ticketNumber}`,
          amount: totals.ttc,
          type: 'income',
          category: 'Ventes',
          referenceId: invoiceData.id,
          account: 'Caisse Principale',
          updatedAt: Date.now()
      });
      setTimeout(() => window.print(), 100);
      clearCart();
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        placeholder="Scanner code-barres ou rechercher..."
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-700 dark:text-white"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><ScanBarcode size={20} /></div>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-3 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500'}`}>{cat}</button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(p => (
                        <button key={p.id} onClick={() => addToCart(p)} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl border-2 border-transparent hover:border-indigo-500 transition-all flex flex-col items-start text-left group h-40 justify-between active:scale-95">
                            <span className="font-black text-slate-800 dark:text-white text-xs line-clamp-2 uppercase">{p.name}</span>
                            <div className="w-full flex justify-between items-end">
                                <span className={`text-[9px] font-bold ${p.stock <= p.minStock ? 'text-rose-500' : 'text-slate-400'}`}>S: {p.stock}</span>
                                <span className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg text-indigo-600 font-black text-xs">{formatCurrency(p.priceRetail).split('DZD')[0]}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="w-96 flex flex-col bg-slate-900 text-white rounded-[32px] shadow-2xl overflow-hidden relative border-l border-slate-800">
            <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500 rounded-xl"><ShoppingCart size={20}/></div>
                    <div><h3 className="font-black uppercase text-sm">Ticket</h3><p className="text-[10px] text-slate-400 font-bold">{cart.length} Lignes</p></div>
                </div>
                <button onClick={clearCart} className="p-2 hover:bg-slate-700 rounded-lg text-rose-400 transition-colors"><Trash2 size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-900">
                {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl">
                        <div className="flex-1 min-w-0 mr-2">
                            <p className="font-bold text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.unitPriceHT} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-black text-xs">{item.unitPriceHT * item.quantity}</span>
                            <div className="flex flex-col space-y-1">
                                <button onClick={() => updateQty(idx, 1)} className="p-0.5 hover:bg-emerald-500 rounded bg-slate-800"><Plus size={10}/></button>
                                <button onClick={() => updateQty(idx, -1)} className="p-0.5 hover:bg-rose-500 rounded bg-slate-800"><Minus size={10}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-slate-400 uppercase flex items-center"><Percent size={12} className="mr-2 text-rose-500"/> Remise (%)</label>
                    <div className="flex gap-1">
                        {[0, 5, 10, 15].map(p => (
                            <button key={p} onClick={() => setGlobalDiscount(p)} className={`px-2 py-1 rounded-md text-[10px] font-black transition-all ${globalDiscount === p ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{p}%</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-800 border-t border-slate-700 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-slate-400">Net à Payer</span>
                        {globalDiscount > 0 && <span className="text-[9px] font-bold text-rose-400">Remise {globalDiscount}% (-{formatCurrency(totals.discountAmount).split('DZD')[0]})</span>}
                    </div>
                    <span className="text-4xl font-black tracking-tighter text-emerald-400">{formatCurrency(totals.ttc).split('DZD')[0]} <span className="text-sm">DA</span></span>
                </div>
                <button onClick={handlePaymentClick} disabled={cart.length === 0} className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"><Banknote size={20} className="mr-3" /> Encaisser</button>
            </div>
        </div>

        {isPaymentModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                        <div><h3 className="text-xl font-black uppercase tracking-tight">Règlement</h3><p className="text-[10px] text-slate-400 font-bold">Ticket #{ticketNumber}</p></div>
                        <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="text-center"><p className="text-xs font-black text-slate-400 uppercase mb-2">Montant Total</p><p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(totals.ttc)}</p></div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setPaymentMethod('Cash')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${paymentMethod === 'Cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-400'}`}><Banknote size={32} className="mb-2" /><span className="text-xs font-black uppercase">Espèces</span></button>
                            <button onClick={() => setPaymentMethod('Card')} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${paymentMethod === 'Card' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400'}`}><CreditCard size={32} className="mb-2" /><span className="text-xs font-black uppercase">Carte / Virement</span></button>
                        </div>
                        {paymentMethod === 'Cash' && (
                            <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl">
                                <div className="grid grid-cols-3 gap-2">{[1000, 2000, 5000].map(val => (<button key={val} onClick={() => setReceivedAmount(val)} className="py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold shadow-sm">{val} DA</button>))}</div>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">Reçu :</span><input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)} className="w-full pl-20 pr-4 py-3 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl font-black text-xl text-right outline-none" autoFocus /></div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700"><span className="text-xs font-black uppercase text-slate-500">Rendu monnaie :</span><span className={`text-2xl font-black ${changeDue >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(changeDue)}</span></div>
                            </div>
                        )}
                        <button onClick={finalizeTransaction} disabled={paymentMethod === 'Cash' && receivedAmount < totals.ttc} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl flex items-center justify-center disabled:opacity-50"><Printer size={20} className="mr-3" /> Valider & Imprimer</button>
                    </div>
                </div>
            </div>
        )}
        <div className="hidden"><TicketTemplate items={cart} totals={totals} receivedAmount={receivedAmount} changeDue={changeDue} companySettings={companySettings} ticketNumber={ticketNumber} globalDiscount={globalDiscount} /></div>
    </div>
  );
};

export default RetailModule;
