
import React from 'react';
import { Ticket, Edit3, Printer, Trash2, Banknote } from 'lucide-react';
import { Invoice } from '../../../types';
import { formatCurrency } from '../../../constants';

interface HistoryViewProps {
  invoices: Invoice[];
  handleEditInvoice: (inv: Invoice) => void;
  handlePrintHistory: (inv: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onOpenPaymentModal: (inv: Invoice) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ invoices, handleEditInvoice, handlePrintHistory, onDeleteInvoice, onOpenPaymentModal }) => {
  
  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'Partially Paid':
        return 'bg-amber-100 text-amber-700';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-700';
      case 'Draft':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                      <th className="px-8 py-5">Réf / Date</th>
                      <th className="px-8 py-5">Client</th>
                      <th className="px-8 py-5 text-right">Montant / Payé</th>
                      <th className="px-8 py-5 text-center">Statut</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.filter(i => !i.isDeleted).map(inv => {
                      const remaining = inv.totalTTC - (inv.paidAmount || 0);
                      return (
                      <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-5">
                            <p className="font-black text-sm">{inv.number}</p>
                            <p className="text-xs text-slate-500">{inv.date}</p>
                          </td>
                          <td className="px-8 py-5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">{inv.partnerName}</td>
                          <td className="px-8 py-5 text-right">
                            <p className="font-black text-slate-900 dark:text-white">{formatCurrency(inv.totalTTC)}</p>
                            <p className={`text-xs font-bold ${remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {remaining > 0 ? `Reste: ${formatCurrency(remaining)}` : 'Soldé'}
                            </p>
                          </td>
                          <td className="px-8 py-5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${getStatusBadge(inv.status)}`}>
                                    {inv.status === 'Partially Paid' ? 'Partiel' : inv.status === 'Validated' ? 'Validé' : inv.status}
                                </span>
                                {inv.eventId && (
                                    <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase bg-purple-100 text-purple-700 flex items-center">
                                        <Ticket size={8} className="mr-1" /> ÉVÉNEMENT
                                    </span>
                                )}
                              </div>
                          </td>
                          <td className="px-8 py-5 text-right flex justify-end gap-2">
                              {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                                <button onClick={() => onOpenPaymentModal(inv)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Encaisser"><Banknote size={16}/></button>
                              )}
                              <button onClick={() => handleEditInvoice(inv)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Modifier"><Edit3 size={16}/></button>
                              <button onClick={() => handlePrintHistory(inv)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-indigo-600" title="Imprimer"><Printer size={16}/></button>
                              <button onClick={() => onDeleteInvoice(inv.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Supprimer"><Trash2 size={16}/></button>
                          </td>
                      </tr>
                  )})}
              </tbody>
          </table>
      </div>
  );
};

export default HistoryView;