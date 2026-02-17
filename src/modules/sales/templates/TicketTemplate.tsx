import React from 'react';
import { CompanySettings, InvoiceItem } from '../../../types';
import { formatCurrency } from '../../../constants';

interface TicketTemplateProps {
  items: InvoiceItem[];
  totals: { ht: number; discountAmount?: number; netCommercial?: number; tva: number; timbre: number; ttc: number };
  receivedAmount: number | '';
  changeDue: number;
  companySettings: CompanySettings;
  ticketNumber: string;
  globalDiscount?: number;
}

const TicketTemplate: React.FC<TicketTemplateProps> = ({
  items, totals, receivedAmount, changeDue, companySettings, ticketNumber, globalDiscount
}) => {
  return (
    <div className="hidden print:block absolute top-0 left-0 bg-white text-black font-mono text-[10px] w-[80mm] p-2 leading-tight">
        <style>{`
            @media print {
                @page { margin: 0; size: 80mm auto; }
                body { margin: 0; padding: 0; background: white; }
                .no-print { display: none !important; }
                .print-ticket { display: block !important; width: 100%; }
            }
        `}</style>
        <div className="text-center mb-2 pb-1 border-b border-dashed border-black">
            <h2 className="text-xs font-black uppercase">{companySettings.name}</h2>
            <p className="text-[8px]">{companySettings.address}</p>
        </div>
        
        <div className="mb-2 text-[8px]">
            <p>Date: {new Date().toLocaleString()}</p>
            <p>Ticket #: {ticketNumber}</p>
        </div>

        <table className="w-full mb-2 text-left">
            <thead>
                <tr className="border-b border-black">
                    <th className="py-1">Art.</th>
                    <th className="py-1 text-center">Qté</th>
                    <th className="py-1 text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, i) => (
                    <tr key={i}>
                        <td className="py-1 truncate max-w-[40mm]">{item.name}</td>
                        <td className="py-1 text-center">x{item.quantity}</td>
                        <td className="py-1 text-right font-bold">{(item.unitPriceHT * item.quantity).toFixed(0)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-1 mb-2">
            <div className="flex justify-between text-[10px] text-slate-600">
                <span>TOTAL HT</span>
                <span>{formatCurrency(totals.ht).replace('DZD', '')}</span>
            </div>
            
            {globalDiscount && globalDiscount > 0 && (
                <div className="flex justify-between text-[10px] text-rose-600 font-bold">
                    <span>REMISE ({globalDiscount}%)</span>
                    <span>-{formatCurrency(totals.discountAmount || 0).replace('DZD', '')}</span>
                </div>
            )}

            <div className="flex justify-between text-sm font-black mt-1">
                <span>TOTAL NET</span>
                <span>{formatCurrency(totals.ttc).replace('DZD', '')} DA</span>
            </div>
            
            {typeof receivedAmount === 'number' && (
                <div className="text-[8px] mt-1 border-t border-gray-200 pt-1">
                    <div className="flex justify-between"><span>Espèces Reçu</span><span>{receivedAmount}</span></div>
                    <div className="flex justify-between font-bold text-emerald-700"><span>Rendu</span><span>{changeDue.toFixed(0)}</span></div>
                </div>
            )}
        </div>

        <div className="text-center text-[7px] mt-4">
            <p>NIF: {companySettings.nif}</p>
            <p>Merci de votre confiance !</p>
        </div>
    </div>
  );
};

export default TicketTemplate;