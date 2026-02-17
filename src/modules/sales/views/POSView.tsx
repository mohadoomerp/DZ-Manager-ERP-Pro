import React, { useRef, useEffect } from 'react';
import { Search, ScanBarcode, ShoppingCart, Trash2, Minus, Plus, RefreshCw, Printer, Banknote, Percent } from 'lucide-react';
import { Product, InvoiceItem } from '../../../types';
import { formatCurrency } from '../../../constants';

interface POSViewProps {
  products: Product[];
  categories: string[];
  posCategory: string;
  setPosCategory: (cat: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  addToCart: (product: Product) => void;
  updateQty: (index: number, delta: number) => void;
  cart: InvoiceItem[];
  totals: { ttc: number; discountAmount: number };
  receivedAmount: number | '';
  setReceivedAmount: (amount: number | '') => void;
  changeDue: number;
  handleCheckout: () => void;
  resetForm: () => void;
  editingInvoiceId: string | null;
  editingNumber: string | null;
  globalDiscount: number;
  setGlobalDiscount: (val: number) => void;
}

const POSView: React.FC<POSViewProps> = ({
  products, categories, posCategory, setPosCategory, searchTerm, setSearchTerm,
  addToCart, updateQty, cart, totals, receivedAmount, setReceivedAmount, changeDue,
  handleCheckout, resetForm, editingInvoiceId, editingNumber, globalDiscount, setGlobalDiscount
}) => {
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const focusInput = () => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
                searchInputRef.current.select();
            }
        };
        const timer = setTimeout(focusInput, 100);
        return () => clearTimeout(timer);
    }, [cart.length]); 

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = searchTerm.trim();
            if (!code) return;

            const product = products.find(p => p.code === code);
            if (product) {
                addToCart(product);
                setSearchTerm(''); // Clear for next scan
            } else {
                alert(`Produit avec code-barres "${code}" non trouvé.`);
                setSearchTerm('');
            }
        }
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] overflow-hidden">
        <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        placeholder="Scanner code-barres ou rechercher..."
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none font-bold shadow-inner"
                    />
                </div>
            </div>

            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                {categories.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setPosCategory(cat)}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${posCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 hover:border-indigo-300 border border-slate-200 dark:border-slate-700'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.filter(p => !p.isDeleted && (posCategory === 'All' || p.category === posCategory) && (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))).map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => addToCart(p)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-3xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 hover:shadow-xl transition-all flex flex-col items-start text-left group h-40 justify-between active:scale-95 relative overflow-hidden"
                        >
                            <div className="w-full relative z-10">
                                <span className="font-black text-slate-800 dark:text-white text-xs line-clamp-2 uppercase leading-tight group-hover:text-indigo-600 transition-colors">{p.name}</span>
                                <p className="text-[9px] text-slate-400 mt-1 font-mono">{p.code}</p>
                            </div>
                            <div className="w-full flex justify-between items-end relative z-10">
                                <span className={`text-[9px] font-black uppercase ${p.stock <= p.minStock ? 'text-rose-500' : 'text-slate-400'}`}>{p.stock} unités</span>
                                <span className="bg-slate-900 text-white dark:bg-indigo-600 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm">{formatCurrency(p.priceRetail).split('DZD')[0]}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="lg:col-span-4 flex flex-col bg-slate-900 text-white rounded-[32px] shadow-2xl overflow-hidden relative">
            <div className="p-6 bg-slate-800/80 backdrop-blur-md border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500 rounded-xl"><ShoppingCart size={20}/></div>
                    <div>
                        <h3 className="font-black uppercase text-sm">{editingInvoiceId ? 'MODIFICATION' : 'ENCOURS'}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{cart.length} Articles</p>
                    </div>
                </div>
                <button onClick={resetForm} className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400 transition-colors"><Trash2 size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar-light">
                {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                        <div className="flex-1 min-w-0 mr-4">
                            <p className="font-bold text-sm truncate uppercase">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{formatCurrency(item.unitPriceHT).split('DZD')[0]} x {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="font-black text-sm">{formatCurrency(item.unitPriceHT * item.quantity).split('DZD')[0]}</span>
                            <div className="flex flex-col space-y-1">
                                <button onClick={() => updateQty(idx, 1)} className="p-1.5 hover:bg-emerald-500 rounded bg-slate-800 text-[10px]"><Plus size={12}/></button>
                                <button onClick={() => updateQty(idx, -1)} className="p-1.5 hover:bg-rose-500 rounded bg-slate-800 text-[10px]"><Minus size={12}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-rose-400 text-[10px] font-black uppercase">
                        <Percent size={14} className="mr-2" /> Remise (%)
                    </div>
                    <div className="flex gap-1">
                        {[0, 5, 10, 15].map(p => (
                            <button key={p} onClick={() => setGlobalDiscount(p)} className={`px-2 py-1 rounded-lg text-[9px] font-black border transition-all ${globalDiscount === p ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                                {p}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2000, 5000].map(amt => (
                        <button key={amt} onClick={() => setReceivedAmount(amt)} className="bg-slate-700 hover:bg-emerald-500 py-3 rounded-xl text-[10px] font-black transition-all">{amt} DA</button>
                    ))}
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Reçu (DA)</label>
                        <input 
                            type="number" 
                            value={receivedAmount} 
                            onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || '')}
                            placeholder="0"
                            className="w-full mt-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-xl font-black text-emerald-400 outline-none focus:border-emerald-500" 
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rendu (DA)</label>
                        <div className="mt-1 w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-xl font-black text-white h-[52px] flex items-center justify-end">
                            {formatCurrency(changeDue).replace('DZD', '')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-emerald-600 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-xs font-black uppercase text-emerald-200">Net à Payer (DA)</span>
                        {globalDiscount > 0 && <span className="text-[9px] font-bold text-white/60">Remise {globalDiscount}% incluse</span>}
                    </div>
                    <span className="text-4xl font-black tracking-tighter text-white">{formatCurrency(totals.ttc).replace('DZD', '')}</span>
                </div>
                <button onClick={handleCheckout} className="w-full py-5 bg-white text-emerald-600 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center hover:bg-emerald-50">
                    {editingInvoiceId ? <RefreshCw size={24} className="mr-3" /> : <Printer size={24} className="mr-3" />} 
                    {editingInvoiceId ? 'VALIDER MODIFICATION' : 'ENCAISSER & IMPRIMER'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default POSView;
