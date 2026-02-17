
import React from 'react';
import { Grid3X3, Box, FileCheck, Receipt, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../../constants';
import { EventBooking, Invoice, InvoiceItem, Product, ModuleType, User } from '../../../types';

interface BillingTabProps {
  activeEvent: EventBooking;
  invoices: Invoice[];
  products: Product[];
  onGenerateInvoice: (invoice: Invoice) => void;
  onNavigate: (module: ModuleType) => void;
  currentUser: User;
}

const BillingTab: React.FC<BillingTabProps> = ({ activeEvent, invoices, products, onGenerateInvoice, onNavigate, currentUser }) => {
  
  const calculateRentalsTotal = (stands: any[], eventItems: any[]) => {
    const standsTotal = stands.reduce((acc, s) => acc + (s.area * (s.pricePerSqm || 5000)), 0);
    const itemsTotal = eventItems.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      return acc + (item.quantity * (product?.priceRetail || 0));
    }, 0);
    return standsTotal + itemsTotal;
  };

  const getParticipantStats = (participantId: string) => {
      const pStands = (activeEvent?.stands || []).filter(s => s.participantId === participantId);
      const pItems = (activeEvent?.items || []).filter(i => i.participantId === participantId);
      const rentalsTotal = calculateRentalsTotal(pStands, pItems);
      const total = rentalsTotal + (activeEvent?.registrationFee || 0);
      return { stands: pStands, items: pItems, total };
  };

  const generateParticipantInvoice = (participantId: string) => {
    const stats = getParticipantStats(participantId);
    const participant = (activeEvent.participants || []).find(p => p.clientId === participantId);
    if (stats.stands.length === 0 && stats.items.length === 0 && (!activeEvent.registrationFee || activeEvent.registrationFee === 0)) return alert("Rien à facturer pour ce participant.");
    
    const invoiceItems: InvoiceItem[] = [];
    
    // Frais d'inscription
    if (activeEvent.registrationFee && activeEvent.registrationFee > 0) {
        invoiceItems.push({ 
            productId: 'SRV-INSCRIPTION', 
            name: `Frais Inscription - ${activeEvent.title}`, 
            quantity: 1, 
            unitPriceHT: activeEvent.registrationFee, 
            tvaRate: 19 
        });
    }

    // Location Stands
    stats.stands.forEach(s => {
        invoiceItems.push({ 
            productId: 'SRV-LOC-STAND', 
            name: `Location Stand N°${s.number} (${s.area}m²) - ${s.type}`, 
            quantity: s.area, 
            unitPriceHT: s.pricePerSqm || 5000, 
            tvaRate: 19 
        });
    });

    // Services / Matériel
    stats.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        invoiceItems.push({
            productId: item.productId,
            name: product?.name || item.name,
            quantity: item.quantity,
            unitPriceHT: product?.priceRetail || 0,
            tvaRate: 19
        });
    });

    const totalHT = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.unitPriceHT), 0);
    const totalTVA = totalHT * 0.19;
    
    // Note : Pour le B2B, généralement pas de Timbre, sauf si paiement Cash explicite. 
    // Ici on initialise à 0, modifiable dans le module Ventes.
    const newInvoice: Invoice = { 
        id: `INV-EVT-${Date.now()}`, 
        number: `PRO-${new Date().getFullYear()}-${activeEvent.id.slice(-4)}-${Math.floor(Math.random()*1000)}`, 
        date: new Date().toISOString().split('T')[0], 
        partnerId: participantId, 
        partnerName: participant?.clientName || 'Inconnu', 
        items: invoiceItems, 
        totalHT: totalHT, 
        totalTVA: totalTVA, 
        timbreFiscal: 0, 
        totalTTC: totalHT + totalTVA, 
        status: 'Draft', 
        type: 'Proforma', // On crée d'abord une Proforma pour validation
        paymentMethod: 'Transfer', 
        eventId: activeEvent.id, // LIEN CLÉ AVEC L'ÉVÉNEMENT
        createdBy: currentUser.name, 
        updatedAt: Date.now() 
    };

    if (confirm(`Générer la facture Proforma pour ${participant?.clientName} ?\nMontant estimé : ${formatCurrency(newInvoice.totalTTC)}`)) { 
        onGenerateInvoice(newInvoice);
        // Redirection immédiate vers le module Ventes pour finaliser/imprimer
        onNavigate(ModuleType.SALES); 
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
              <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b dark:border-slate-700 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                      <th className="px-8 py-6 whitespace-nowrap">Participant / Exposant</th>
                      <th className="px-8 py-6 whitespace-nowrap">Détail Affectations</th>
                      <th className="px-8 py-6 whitespace-nowrap">État Facturation</th>
                      <th className="px-8 py-6 text-right whitespace-nowrap">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {(activeEvent.participants || []).map(p => {
                      const stats = getParticipantStats(p.clientId);
                      const generatedInvoices = invoices.filter(inv => inv.partnerId === p.clientId && inv.eventId === activeEvent.id);
                      return (
                      <tr key={p.clientId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-6">
                              <p className="text-sm font-black text-slate-900 dark:text-white uppercase leading-tight truncate max-w-[200px]">{p.clientName}</p>
                              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter mt-1 whitespace-nowrap">Net Estimé: {formatCurrency(stats.total * 1.19)}</p>
                          </td>
                          <td className="px-8 py-6">
                              <div className="flex space-x-3 whitespace-nowrap">
                                  <div className="flex items-center text-[10px] font-black text-slate-500 uppercase"><Grid3X3 size={14} className="mr-1.5 text-indigo-400" /> {stats.stands.length} Stand(s)</div>
                                  <div className="flex items-center text-[10px] font-black text-slate-500 uppercase"><Box size={14} className="mr-1.5 text-emerald-400" /> {stats.items.length} Article(s)</div>
                              </div>
                          </td>
                          <td className="px-8 py-6">
                              {generatedInvoices.length > 0 ? (
                                  <div className="space-y-1">
                                      {generatedInvoices.map(inv => (
                                          <div key={inv.id} className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-800 w-fit">
                                              <FileCheck size={12} className="text-emerald-600" />
                                              <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400">{inv.number} ({inv.status})</span>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <span className="text-[9px] font-bold text-slate-400 uppercase italic whitespace-nowrap">Aucun document émis</span>
                              )}
                          </td>
                          <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                  <button onClick={() => generateParticipantInvoice(p.clientId)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all active:scale-95">
                                      <Receipt size={16} className="mr-2" /> Facturer
                                  </button>
                                  {generatedInvoices.length > 0 && (
                                      <button onClick={() => onNavigate(ModuleType.SALES)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 transition-all shadow-sm" title="Voir dans Ventes">
                                          <ExternalLink size={18} />
                                      </button>
                                  )}
                              </div>
                          </td>
                      </tr>
                      );
                  })}
                  {(activeEvent.participants || []).length === 0 && (
                      <tr><td colSpan={4} className="py-24 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucun exposant à facturer</td></tr>
                  )}
              </tbody>
          </table>
          </div>
      </div>
    </div>
  );
};

export default BillingTab;
