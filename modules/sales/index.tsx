import React, { useState, useMemo, useRef } from 'react';
import { LayoutGrid, FileText, History, AppWindow, List } from 'lucide-react';
import { Invoice, Partner, Product, InvoiceItem, CompanySettings, Transaction, POSType } from '../../types';
import RetailPOSView from './views/RetailPOSView';
import ServicePOSView from './views/ServicePOSView';
import InvoiceBuilderView from './views/InvoiceBuilderView';
import HistoryView from './views/HistoryView';
import TicketTemplate from './templates/TicketTemplate';
import A4InvoiceTemplate from './templates/A4InvoiceTemplate';

interface SalesModuleProps {
  clients: Partner[];
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
  clients, products, invoices, companySettings, 
  onSaveInvoice, onUpdateInvoice, onDeleteInvoice,
  onStockUpdate, onTransactionAdd
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'invoice' | 'history'>('pos');
  const [posMode, setPosMode] = useState<POSType>(companySettings.posType || 'Retail');
  
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  
  const [posCategory, setPosCategory] = useState<string>('All');
  const [receivedAmount, setReceivedAmount] = useState<number | ''>('');
  const [printFormat, setPrintFormat] = useState<'A4' | 'Ticket'>('Ticket');

  const [invoiceType, setInvoiceType] = useState<Invoice['type']>('Invoice');
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Check' | 'Transfer'>('Cash');
  
  const [globalDiscount, setGlobalDiscount] = useState<number>(0); 

  const totals = useMemo(() => {
    const htBrut = cart.reduce((acc, item) => acc + (item.quantity * item.unitPriceHT), 0);
    const discountRate = Math.min(Math.max(Number(globalDiscount) || 0, 0), 100);
    const discountAmount = (htBrut * discountRate) / 100;
    const netCommercial = Math.max(0, htBrut - discountAmount);
    let tvaRate = 0.19;
    if (activeTab === 'pos' || isTaxExempt) tvaRate = 0;
    const tva = netCommercial * tvaRate;
    let timbre = 0;
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
    setCart(prev => prev.map((item, i) => {
        if (i === idx) return { ...item, quantity: Math.max(1, item.quantity + delta) };
        return item;
    }));
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
      if (invoice.excludeTva) {
          setActiveTab('pos');
          setPrintFormat('Ticket');
      } else {
          setActiveTab('invoice');
          setPrintFormat('A4');
      }
  };

  const handlePrintHistory = (invoice: Invoice) => {
      loadInvoiceIntoState(invoice);
      setPrintFormat(invoice.excludeTva ? 'Ticket' : 'A4');
      setTimeout(() => window.print(), 500);
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
        status: isPos ? 'Paid' : 'Validated',
        type: isPos ? 'Invoice' : invoiceType,
        paymentMethod: paymentMode,
        excludeTva: isPos,
        isTaxExempt: isTaxExempt,
        updatedAt: Date.now()
    };
    if (editingInvoiceId) onUpdateInvoice(invoiceData);
    else {
        onSaveInvoice(invoiceData);
        cart.forEach(item => { if(onStockUpdate) onStockUpdate(item.productId, -item.quantity); });
        if ((isPos || paymentMode === 'Cash') && onTransactionAdd) {
            onTransactionAdd({ id: `TX-${Date.now()}`, date: invoiceData.date, title: `Vente ${invoiceData.number}`, amount: invoiceData.totalTTC, type: 'income', category: 'Ventes', referenceId: invoiceData.id, account: 'Caisse Principale', updatedAt: Date.now() });
        }
    }
    setPrintFormat(isPos ? 'Ticket' : 'A4');
    setTimeout(() => window.print(), 500);
    resetForm();
  };
  
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const posViewProps = {
    products, categories, posCategory, setPosCategory, searchTerm, setSearchTerm, addToCart,
    updateQty, cart, totals, receivedAmount, setReceivedAmount, changeDue, handleCheckout, resetForm,
    editingInvoiceId, editingNumber, globalDiscount, setGlobalDiscount
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center no-print">
            <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 w-fit">
                <button onClick={() => setActiveTab('pos')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} className="mr-2"/> Caisse</button>
                <button onClick={() => setActiveTab('invoice')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoice' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><FileText size={16} className="mr-2"/> Bureau</button>
                <button onClick={() => setActiveTab('history')} className={`flex items-center px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><History size={16} className="mr-2"/> Historique</button>
            </div>
            {activeTab === 'pos' && (
                <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[18px] shadow-sm border border-slate-200 dark:border-slate-800 w-fit">
                    <button onClick={() => setPosMode('Retail')} className={`flex items-center px-5 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'Retail' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}><AppWindow size={14} className="mr-2"/> Retail</button>
                    <button onClick={() => setPosMode('Service')} className={`flex items-center px-5 py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all ${posMode === 'Service' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400'}`}><List size={14} className="mr-2"/> Service</button>
                </div>
            )}
        </div>

        {printFormat === 'Ticket' && <TicketTemplate items={cart} totals={totals} receivedAmount={receivedAmount} changeDue={changeDue} companySettings={companySettings} ticketNumber={editingNumber || `${new Date().getFullYear()}-${invoices.length + 1001}`} globalDiscount={globalDiscount} />}
        {printFormat === 'A4' && <div className="hidden print:block absolute top-0 left-0 w-full"><A4InvoiceTemplate invoice={{ type: invoiceType, number: editingNumber || '---' }} companySettings={companySettings} client={selectedClient} items={cart} totals={totals} paymentMode={paymentMode} isTaxExempt={isTaxExempt} globalDiscount={globalDiscount} /></div>}

        <div className="animate-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'pos' && (
              posMode === 'Retail' 
                ? <RetailPOSView {...posViewProps} /> 
                : <ServicePOSView {...posViewProps} />
            )}
            {activeTab === 'invoice' && <InvoiceBuilderView products={products} clients={clients} selectedClient={selectedClient} setSelectedClient={setSelectedClient} searchTerm={searchTerm} setSearchTerm={setSearchTerm} addToCart={addToCart} cart={cart} totals={totals} companySettings={companySettings} invoiceType={invoiceType} setInvoiceType={setInvoiceType} paymentMode={paymentMode} setPaymentMode={setPaymentMode} isTaxExempt={isTaxExempt} setIsTaxExempt={setIsTaxExempt} globalDiscount={globalDiscount} setGlobalDiscount={setGlobalDiscount} handleCheckout={handleCheckout} resetForm={resetForm} editingInvoiceId={editingInvoiceId} editingNumber={editingNumber} />}
            {activeTab === 'history' && <HistoryView invoices={invoices} handleEditInvoice={handleEditInvoice} handlePrintHistory={handlePrintHistory} onDeleteInvoice={onDeleteInvoice} />}
        </div>
    </div>
  );
};

export default SalesModule;
