import React from 'react';
import { Invoice, CompanySettings, Partner, InvoiceItem } from '../../../types';
import { numberToWords } from '../../../constants';

interface A4InvoiceTemplateProps {
  invoice: Partial<Invoice>;
  companySettings: CompanySettings;
  client: Partner | null;
  items: InvoiceItem[];
  totals: { ht: number; discountAmount: number; netCommercial: number; tva: number; timbre: number; ttc: number };
  paymentMode: string;
  isTaxExempt: boolean;
  globalDiscount: number;
}

const A4InvoiceTemplate: React.FC<A4InvoiceTemplateProps> = ({
  invoice, companySettings, client, items, totals, paymentMode, isTaxExempt, globalDiscount
}) => {
  const formatNum = (amount: number) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const formatDA = (amount: number) => formatNum(amount) + ' DA';

  const docTitle = {
    'Invoice': 'FACTURE',
    'Proforma': 'FACTURE PROFORMA',
    'Quote': 'DEVIS',
    'Delivery': 'BON DE LIVRAISON',
    'Order': 'BON DE COMMANDE'
  }[invoice.type || 'Invoice'];

  const totalHT = invoice.type === 'Proforma' ? totals.ht : totals.netCommercial;

  return (
    <div className="bg-white w-[210mm] min-h-[297mm] p-10 mx-auto shadow-lg print:shadow-none print:w-full print:h-full print:m-0 text-slate-900 font-sans text-xs relative flex flex-col box-border">
      
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-10">
        
        {/* COMPANY INFO (LEFT) */}
        <div className="w-[55%]">
            <div className="mb-5 flex items-start gap-4">
                {companySettings.logoUrl && (
                    <img src={companySettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                )}
                <div>
                    <h1 className="text-lg font-black uppercase text-indigo-900 leading-tight">{companySettings.name}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{companySettings.legalForm}</p>
                </div>
            </div>
            
            <div className="text-[9px] text-slate-600 font-medium mb-3 uppercase tracking-tight">
                <p>{companySettings.address}</p>
                <p>{companySettings.commune}, {companySettings.wilaya}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] text-slate-800">
                <p><span className="font-bold">N.I.F :</span> <span className="font-mono">{companySettings.nif}</span></p>
                <p><span className="font-bold">N.I.S :</span> <span className="font-mono">{companySettings.nis}</span></p>
                <p><span className="font-bold">R.C :</span> <span className="font-mono">{companySettings.rc}</span></p>
                <p><span className="font-bold">A.I :</span> <span className="font-mono">{companySettings.ai}</span></p>
                <p className="col-span-2"><span className="font-bold">R.I.B :</span> <span className="font-mono">{companySettings.rib}</span></p>
            </div>
        </div>

        {/* INVOICE INFO (RIGHT) */}
        <div className="w-[40%] text-right flex flex-col items-end">
             <h2 className="text-2xl font-black text-indigo-600 uppercase mb-3 tracking-tighter">{docTitle}</h2>
             <div className="bg-slate-50 rounded-lg p-3 w-full border border-slate-100">
                 <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                     <span className="text-[9px] font-bold text-slate-400 uppercase">Numéro</span>
                     <span className="text-sm font-black text-slate-800">{invoice.number || '---'}</span>
                 </div>
                 <div className="flex justify-between items-center mb-1">
                     <span className="text-[9px] font-bold text-slate-400 uppercase">Date</span>
                     <span className="text-xs font-bold text-slate-800">{invoice.date}</span>
                 </div>
                 <div className="flex justify-between items-center">
                     <span className="text-[9px] font-bold text-slate-400 uppercase">Mode</span>
                     <span className="text-xs font-bold text-slate-800 uppercase">{paymentMode === 'Check' ? 'CHÈQUE' : paymentMode === 'Transfer' ? 'VIREMENT' : 'ESPÈCES'}</span>
                 </div>
             </div>
        </div>
      </div>

      {/* CLIENT SECTION (CENTERED BOX) */}
      <div className="relative mb-10 pt-3">
          <div className="absolute -top-0 left-6 bg-white px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">
              Client / Destinataire
          </div>
          <div className="border border-slate-300 rounded-2xl p-6 bg-white relative">
             <h3 className="text-base font-black uppercase text-slate-900 mb-1 tracking-tight">{client?.name || 'CLIENT COMPTOIR'}</h3>
             <p className="text-[10px] text-slate-600 font-medium uppercase mb-4 w-2/3">{client?.address}</p>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] pt-3 border-t border-slate-100">
                 <div>
                    <span className="block font-bold text-slate-400 uppercase mb-0.5">N.I.F</span>
                    <span className="font-mono font-bold text-slate-700">{client?.nif || '-'}</span>
                 </div>
                 <div>
                    <span className="block font-bold text-slate-400 uppercase mb-0.5">A.I</span>
                    <span className="font-mono font-bold text-slate-700">{client?.ai || '-'}</span>
                 </div>
                 <div>
                    <span className="block font-bold text-slate-400 uppercase mb-0.5">R.C</span>
                    <span className="font-mono font-bold text-slate-700">{client?.rc || '-'}</span>
                 </div>
                 <div>
                    <span className="block font-bold text-slate-400 uppercase mb-0.5">N.I.S</span>
                    <span className="font-mono font-bold text-slate-700">{client?.nis || '-'}</span>
                 </div>
             </div>
          </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="flex-grow mb-8">
          <table className="w-full border-collapse">
              <thead>
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-100">
                      <th className="py-3 pl-2 w-12 text-left">#</th>
                      <th className="py-3 text-left">Désignation</th>
                      <th className="py-3 w-20 text-center">Qté</th>
                      <th className="py-3 w-32 text-right">P.U H.T</th>
                      <th className="py-3 w-32 text-right pr-2">Montant H.T</th>
                  </tr>
              </thead>
              <tbody className="text-[10px]">
                  {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-none">
                          <td className="py-3 pl-2 text-slate-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                          <td className="py-3 font-bold text-slate-700 uppercase">{item.name}</td>
                          <td className="py-3 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="py-3 text-right font-mono text-slate-600">{formatNum(item.unitPriceHT)}</td>
                          <td className="py-3 pr-2 text-right font-mono font-black text-slate-900">{formatNum(item.quantity * item.unitPriceHT)}</td>
                      </tr>
                  ))}
                  {/* Minimum rows spacing */}
                  {items.length < 8 && Array.from({length: 8 - items.length}).map((_, i) => (
                       <tr key={`empty-${i}`}><td className="py-4">&nbsp;</td><td colSpan={4}></td></tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* FOOTER SECTION */}
      <div className="border-t-2 border-slate-900 pt-6">
          <div className="flex justify-between items-start mb-10">
              
              {/* AMOUNT IN WORDS */}
              <div className="w-[55%] pt-1">
                  <p className="text-[8px] font-bold text-slate-500 uppercase mb-2 tracking-wide italic">Arrêté la présente facture à la somme de :</p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-[11px] font-black uppercase text-slate-800 leading-relaxed">
                          {numberToWords(totals.ttc)}.
                      </p>
                  </div>
              </div>

              {/* TOTALS TABLE */}
              <div className="w-[35%]">
                  <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-500 uppercase text-[10px]">Total H.T</span>
                          <span className="font-mono font-bold text-slate-800">{formatDA(totalHT)}</span>
                      </div>
                      
                      {!isTaxExempt && (
                          <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-500 uppercase text-[10px]">T.V.A (19%)</span>
                              <span className="font-mono font-bold text-slate-800">{formatDA(totals.tva)}</span>
                          </div>
                      )}
                      
                      {totals.timbre > 0 && (
                          <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-500 uppercase text-[10px]">Timbre</span>
                              <span className="font-mono font-bold text-slate-800">{formatDA(totals.timbre)}</span>
                          </div>
                      )}

                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                          <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">Net à Payer</span>
                          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-sm">
                             <span className="font-mono font-black text-sm">{formatDA(totals.ttc)}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* SIGNATURES */}
          <div className="flex justify-between px-8 mb-6">
              <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-12">Cachet et Signature Client</p>
                  <div className="w-32 border-b border-slate-300 mx-auto"></div>
              </div>
              <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-12">Direction / Comptabilité</p>
                  <div className="w-32 border-b border-slate-300 mx-auto"></div>
              </div>
          </div>
      </div>

      {/* PAGE BOTTOM */}
      <div className="mt-auto pt-4 text-center border-t border-slate-100">
          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              DZ-MANAGER ERP • Solution de Gestion Intégrée Algérie • Page 1/1
          </p>
      </div>

    </div>
  );
};

export default A4InvoiceTemplate;