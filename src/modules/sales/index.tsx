import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LayoutGrid, FileText, History, AppWindow, List, Banknote, X, Save, CreditCard } from 'lucide-react';
import { Invoice, Partner, Product, InvoiceItem, CompanySettings, Transaction, POSType } from '../../types';
import POSView from './views/POSView';
import InvoiceBuilderView from './views/InvoiceBuilderView';
import HistoryView from './views/HistoryView';
import TicketTemplate from './templates/TicketTemplate';
import A4InvoiceTemplate from './templates/A4InvoiceTemplate';
import { formatCurrency } from '../../constants';

interface SalesModuleProps {
  clients: Partner[];
  setClients: React.Dispatch<React.SetStateAction<Partner[]>>;
  products: Product[];
  invoices: Invoice[];
  companySettings: CompanySettings;
  onSaveInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onStockUpdate?: (productId: string, quantityChange: number) => void;
  onTransactionAdd?: (tx: Transaction) => void;
}

const SalesModule: React.FC<SalesModuleProps> = ({ 
  clients, setClients, products, invoices, companySettings, 
  onSaveInvoice, onUpdateInvoice, onDeleteInvoice,
  onStockUpdate, onTransactionAdd
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'invoice' | 'history'>('pos');
  
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  
  const [posCategory, setPosCategory] = useState<string>('All');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  
  const [invoiceType, setInvoiceType] = useState<Invoice['type']>('Invoice');
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Check' | 'Transfer'>('Cash');
  
  const [globalDiscount, setGlobalDiscount] = useState<number>(0); 

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (printingInvoice) {
      // Delay to ensure the DOM is updated with the printable component
      const timer = setTimeout(() => {
        window.print();
        // Optional: Reset printing state after print. Commented out to allow reprint if needed.
        // setPrintingInvoice(null); 
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingInvoice]);

  const totals = useMemo(() => {
    const htBrut = cart.reduce((acc, item) => acc + (item.quantity * item.unitPriceHT), 0);
    const discountRate = Math.min(Math.max(Number(globalDiscount) || 0, 0), 100);
    const discountAmount = (htBrut * discountRate) / 100;
    const netCommercial = Math.max(0, htBrut - discountAmount);
    let tvaRate = 0.19;
    // POS invoices have no TVA applied in this view
    if (activeTab === 'pos' || isTaxExempt) tvaRate = 0;
    const tva = netCommercial * tvaRate;
    let timbre = 0;
    // Timbre fiscal applies only for cash payments on non-exempt invoices in the builder view
    if (paymentMode === 'Cash' && activeTab === 'invoice' && !isTaxExempt) {
        const baseTTC = netCommercial + tva;
        timbre = Math.min(Math.max(Math.ceil(baseTTC * 0.01), 5), 2500);
    }
    const ttc = netCommercial + tva + timbre;
    return { ht: htBrut, discountRate, discountAmount, netCommercial, tva, timbre, ttc };
  }, [cart, isTaxExempt, paymentMode, activeTab, globalDiscount]);

  const changeDue = useMemo(() => {
      if (typeof receivedAmount === 'number' && receivedAmount >= totals.ttc) {
          return receivedAmount - totals.ttc;
      }
      return 0;
  }, [receivedAmount, totals.ttc]);

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
        tvaRate: 19 
      }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      const item = newCart[idx];
      if (!item) return prev;
      if (item.quantity + delta <= 0) {
        newCart.splice(idx, 1);
      } else {
        newCart[idx] = { ...item, quantity: item.quantity + delta };
      }
      return newCart;
    });
  };

  const resetForm = () => {
      setCart([]);
      setSelectedClient(null);
      setEditingInvoiceId(null);
      setEditingNumber(null);
      setGlobalDiscount(0);
      setIsTaxExempt(false);
      setInvoiceType('Invoice');
      setPaymentMode('Cash');
      setReceivedAmount('');
      setPrintingInvoice(null);
  };

  const loadInvoiceIntoState = (invoice: Invoice) => {
      setCart(invoice.items);
      setSelectedClient(clients.find(c => c.id === invoice.partnerId) || { id: invoice.partnerId, name: invoice.partnerName } as Partner);
      setEditingInvoiceId(invoice.id);
      setEditingNumber(invoice.number);
      setGlobalDiscount(invoice.globalDiscount || 0);
      setInvoiceType(invoice.type);
      setIsTaxExempt(!!invoice.isTaxExempt);
      setPaymentMode(invoice.paymentMethod);
  };

  const handleEditInvoice = (invoice: Invoice) => {
      loadInvoiceIntoState(invoice);
      setActiveTab(invoice.excludeTva ? 'pos' : 'invoice');
  };

  const handlePrintHistory = (invoice: Invoice) => {
      // Pour l'impression, on met simplement à jour l'état printingInvoice avec les données complètes
      // On ne change pas l'onglet actif
      setPrintingInvoice(invoice);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return alert("Panier vide");
    const isPos = activeTab === 'pos';
    const invoiceData: Invoice = {
        id: editingInvoiceId || `INV-${Date.now()}`,
        number: editingNumber || `${isPos ? 'TICKET' : 'FACT'}-${new Date().getFullYear()}-${invoices.length + 1001}`,
        date: new Date().toISOString().split('T')[0],
        partnerId: selectedClient?.id || 'CLIENT-PASSAGER',
        partnerName: selectedClient?.name || 'Client Comptoir',
        items: cart,
        totalHT: totals.ht,
        totalTVA: totals.tva,
        timbreFiscal: totals.timbre,
        totalTTC: totals.ttc,
        globalDiscount: globalDiscount,
        status: isPos ? 'Paid' : (editingInvoiceId ? (invoices.find(i=>i.id === editingInvoiceId)?.status || 'Validated') : 'Validated'),
        type: isPos ? 'Invoice' : invoiceType,
        paymentMethod: paymentMode,
        excludeTva: isPos,
        isTaxExempt: isTaxExempt,
        updatedAt: Date.now(),
        paidAmount: isPos ? totals.ttc : (editingInvoiceId ? (invoices.find(i=>i.id === editingInvoiceId)?.paidAmount || 0) : 0)
    };
    
    if (editingInvoiceId) onUpdateInvoice(invoiceData);
    else {
        onSaveInvoice(invoiceData);
        cart.forEach(item => { if(onStockUpdate) onStockUpdate(item.productId, -item.quantity); });
        if (isPos && onTransactionAdd) {
            onTransactionAdd({ id: `TX-${Date.now()}`, date: invoiceData.date, title: `Vente Comptoir ${invoiceData.number}`, amount: invoiceData.totalTTC, type: 'income', category: 'Ventes', referenceId: invoiceData.id, account: 'Caisse Principale', updatedAt: Date.now() });
        }
    }
    
    // Déclenche l'impression
    setPrintingInvoice(invoiceData);
    
    // Reset form fields but keep print state briefly
    setTimeout(() => {
        setCart([]);
        setSelectedClient(null);
        setEditingInvoiceId(null);
        setEditingNumber(null);
        setGlobalDiscount(0);
        setReceivedAmount('');
    }, 100);
  };
  
  const onOpenPaymentModal = (invoice: Invoice) => {
    setInvoiceToPay(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePayment = (amount: number, method: 'Cash' | 'Check' | 'Transfer') => {
    if (!invoiceToPay || !onTransactionAdd) return;
    
    onTransactionAdd({
        id: `TX-PAY-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        title: `Paiement Facture ${invoiceToPay.number}`,
        amount: amount,
        type: 'income',
        category: 'Règlement Client',
        referenceId: invoiceToPay.id,
        account: method === 'Cash' ? 'Caisse Principale' : 'Compte BDL',
        updatedAt: Date.now()
    });

    const newPaidAmount = (invoiceToPay.paidAmount || 0) + amount;
    const newStatus = newPaidAmount >= invoiceToPay.totalTTC ? 'Paid' : 'Partially Paid';
    
    onUpdateInvoice({ ...invoiceToPay, paidAmount: newPaidAmount, status: newStatus, updatedAt: Date.now() });
    
    setIsPaymentModalOpen(false);
    setInvoiceToPay(null);
  };
  
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const posViewProps = {
    products, categories, posCategory, setPosCategory, searchTerm, setSearchTerm, addToCart,
    updateQty, cart, totals, receivedAmount, setReceivedAmount, changeDue, handleCheckout, resetForm,
    editingInvoiceId, editingNumber, globalDiscount, setGlobalDiscount
  };

  const PaymentModal = () => {
    if (!invoiceToPay) return null;
    const remaining = invoiceToPay.totalTTC - (invoiceToPay.paidAmount || 0);
    const [amount, setAmount] = useState<number | ''>(remaining);
    const [method, setMethod] = useState<'Cash' | 'Check' | 'Transfer'>('Cash');
    
    const handleSubmit = () => {
        if (typeof amount !== 'number' || amount <= 0 || amount > remaining) {
            alert(`Montant invalide. Doit être entre 0.01 et ${formatCurrency(remaining)}`);
            return;
        }
        handlePayment(amount, method);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest">Encaisser la Facture</h3>
                    <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={16}/></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <p className="text-xs text-slate-400 font-bold uppercase">Reste à payer</p>
                        <p className="text-4xl font-black text-slate-800 dark:text-white">{formatCurrency(remaining)}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{invoiceToPay.number} • {invoiceToPay.partnerName}</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Montant à encaisser (DA)</label>
                        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-black text-2xl text-emerald-600 text-center outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Méthode</label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            {(['Cash', 'Check', 'Transfer'] as const).map(m => (
                                <button key={m} onClick={() => setMethod(m)} className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-all ${method === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleSubmit} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center">
                        <Save size={16} className="mr-2"/> Confirmer Paiement
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center no-print">
            <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 w-fit">
                <button onClick={() => setActiveTab('pos')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} className="mr-2"/> Caisse</button>
                <button onClick={() => setActiveTab('invoice')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoice' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={16} className="mr-2"/> Bureau</button>
                <button onClick={() => setActiveTab('history')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} className="mr-2"/> Historique</button>
            </div>
        </div>
        
        {/* COMPOSANT D'IMPRESSION ISOLE - IDENTIFIÉ PAR ID POUR CSS PRINT */}
        {printingInvoice && (
            <div id="print-area" className="hidden print:block">
                {printingInvoice.excludeTva ? (
                    <TicketTemplate 
                        items={printingInvoice.items} 
                        totals={{
                            ht: printingInvoice.totalHT,
                            tva: printingInvoice.totalTVA,
                            timbre: printingInvoice.timbreFiscal,
                            ttc: printingInvoice.totalTTC,
                            discountAmount: (printingInvoice.totalHT * (printingInvoice.globalDiscount || 0)) / 100
                        }} 
                        receivedAmount={printingInvoice.totalTTC} 
                        changeDue={0} 
                        companySettings={companySettings} 
                        ticketNumber={printingInvoice.number} 
                        globalDiscount={printingInvoice.globalDiscount} 
                    />
                ) : (
                    <A4InvoiceTemplate 
                        invoice={printingInvoice} 
                        companySettings={companySettings} 
                        client={clients.find(c => c.id === printingInvoice.partnerId) || null} 
                        items={printingInvoice.items} 
                        totals={{
                            ht: printingInvoice.totalHT,
                            discountAmount: (printingInvoice.totalHT * (printingInvoice.globalDiscount || 0)) / 100,
                            netCommercial: printingInvoice.totalHT - ((printingInvoice.totalHT * (printingInvoice.globalDiscount || 0)) / 100),
                            tva: printingInvoice.totalTVA,
                            timbre: printingInvoice.timbreFiscal,
                            ttc: printingInvoice.totalTTC
                        }}
                        paymentMode={printingInvoice.paymentMethod}
                        isTaxExempt={!!printingInvoice.isTaxExempt}
                        globalDiscount={printingInvoice.globalDiscount || 0}
                    />
                )}
            </div>
        )}

        <div className="animate-in slide-in-from-bottom-4 duration-500 no-print">
            {activeTab === 'pos' && <POSView {...posViewProps} /> }
            {activeTab === 'invoice' && <InvoiceBuilderView products={products} clients={clients} selectedClient={selectedClient} setSelectedClient={setSelectedClient} searchTerm={searchTerm} setSearchTerm={setSearchTerm} addToCart={addToCart} cart={cart} totals={totals} companySettings={companySettings} invoiceType={invoiceType} setInvoiceType={setInvoiceType} paymentMode={paymentMode} setPaymentMode={setPaymentMode} isTaxExempt={isTaxExempt} setIsTaxExempt={setIsTaxExempt} globalDiscount={globalDiscount} setGlobalDiscount={setGlobalDiscount} handleCheckout={handleCheckout} resetForm={resetForm} editingInvoiceId={editingInvoiceId} editingNumber={editingNumber} />}
            {activeTab === 'history' && <HistoryView invoices={invoices} handleEditInvoice={handleEditInvoice} handlePrintHistory={handlePrintHistory} onDeleteInvoice={onDeleteInvoice} onOpenPaymentModal={onOpenPaymentModal} />}
        </div>
        
        {isPaymentModalOpen && <PaymentModal />}
    </div>
  );
};

export default SalesModule;