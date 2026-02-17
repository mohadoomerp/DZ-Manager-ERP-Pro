
import React from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { Employee, CompanySettings } from '../../../types';
import { formatCurrency } from '../../../constants';
import { calculatePayrollData } from '../utils';

interface PayslipViewProps {
  employee: Employee;
  companySettings: CompanySettings;
  attendanceDate: string;
  attendanceRecords: any[];
  onBack: () => void;
}

const PayslipView: React.FC<PayslipViewProps> = ({ employee, companySettings, attendanceDate, attendanceRecords, onBack }) => {
  const payrollData = calculatePayrollData(employee, attendanceRecords, attendanceDate, companySettings);
  const today = new Date().toLocaleDateString('fr-DZ');
  
  // Période et Jours pour le tableau de pointage
  const [yearStr, monthStr] = attendanceDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const periodStr = new Date(year, month - 1, 1).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' }).toUpperCase();

  // Déterminer si cotisation
  const isCotisable = employee.isSociallyInsured !== undefined ? employee.isSociallyInsured : true;

  // Lignes du bulletin
  let rows = [];
  
  // 1. Salaire de base (Affiche toujours le montant complet dans GAINS)
  rows.push({
      code: 'R001',
      libelle: 'SALAIRE DE BASE',
      base: (companySettings.workingDaysCount || 30).toFixed(2),
      taux: '',
      gains: employee.baseSalary,
      retenues: 0
  });

  // 2. Retenue Absences (si applicable) - Nouvelle Logique
  if (payrollData.jourAbsents > 0 && payrollData.montantRetenueAbsence > 0) {
      rows.push({
          code: 'R002',
          libelle: 'RETENUE ABSENCE',
          base: payrollData.jourAbsents.toFixed(2), // Nombre de jours absents
          taux: formatCurrency(payrollData.tauxJournalier).replace('DZD', ''), // Taux journalier
          gains: 0,
          retenues: payrollData.montantRetenueAbsence
      });
  }

  // 3. Primes (Rubriques)
  employee.rubriques.forEach((r, idx) => {
      if (r.value > 0) {
          rows.push({
              code: `R${100 + idx}`,
              libelle: r.label.toUpperCase(),
              base: '',
              taux: '',
              gains: r.value,
              retenues: 0
          });
      }
  });

  // 4. Prime Présence
  if (payrollData.realBonus > 0) {
      rows.push({
          code: 'R200',
          libelle: 'PRIME DE PANIER/PRESENCE',
          base: '',
          taux: '',
          gains: payrollData.realBonus,
          retenues: 0
      });
  } else if (employee.presenceBonus > 0 && payrollData.hasPenalty) {
      // Optionnel : Afficher ligne vide ou commentaire pour bonus perdu
  }

  // 5. Retenues Légales
  // CNAS
  if (isCotisable) {
      rows.push({
          code: 'R500',
          libelle: 'RETENUE S.S (CNAS)',
          base: payrollData.salairePoste,
          taux: '9.00%',
          gains: 0,
          retenues: payrollData.cnas
      });
  } else {
      rows.push({
          code: 'R500',
          libelle: 'RETENUE S.S (NON AFFILIÉ)',
          base: 0,
          taux: '0.00%',
          gains: 0,
          retenues: 0
      });
  }

  // IRG
  rows.push({
      code: 'R600',
      libelle: 'RETENUE I.R.G (BAREME 2020)',
      base: payrollData.baseImposable,
      taux: '',
      gains: 0,
      retenues: payrollData.irg
  });

  // 6. Autres retenues (Prêts)
  if (payrollData.retenuesPrets > 0) {
      rows.push({
          code: 'R700',
          libelle: 'REMBOURSEMENT PRÊT/AVANCE',
          base: '',
          taux: '',
          gains: 0,
          retenues: payrollData.retenuesPrets
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20 no-print">
        <button onClick={onBack} className="flex items-center space-x-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">
            <ChevronLeft size={16} /> <span>Retour</span>
        </button>
        <button onClick={() => window.print()} className="px-10 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-indigo-700 transition-all shadow-xl">
            <Printer size={18} className="mr-3" /> Imprimer Bulletin
        </button>
      </div>
      
      <div className="bg-white p-8 max-w-[21cm] mx-auto border border-slate-300 min-h-[29.7cm] flex flex-col font-sans text-black print:p-0 print:border-none">
        
        {/* EN-TÊTE ENTREPRISE AVEC LOGO */}
        <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
            <div className="w-1/2 flex items-start gap-4">
                {companySettings.logoUrl && (
                    <img 
                        src={companySettings.logoUrl} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain object-left" 
                    />
                )}
                <div>
                    <h1 className="font-black text-xl uppercase mb-1">{companySettings.name}</h1>
                    <p className="text-xs">{companySettings.address}</p>
                    <div className="mt-2 text-[10px] font-bold">
                        <p>NIF : {companySettings.nif}</p>
                        <p>RC : {companySettings.rc}</p>
                        <p>NIS : {companySettings.nis}</p>
                    </div>
                </div>
            </div>
            <div className="w-1/2 text-right">
                <h2 className="text-2xl font-black uppercase">BULLETIN DE PAIE</h2>
                <p className="text-sm font-bold mt-1 bg-black text-white inline-block px-2 py-1">{periodStr}</p>
                <p className="text-[10px] font-bold mt-2">N° EMPLOYEUR : {companySettings.employerCnasNumber || '---'}</p>
            </div>
        </div>

        {/* INFO SALARIÉ */}
        <div className="border-2 border-black p-4 mb-4 grid grid-cols-2 gap-4 text-xs">
            <div>
                <p><span className="font-bold w-24 inline-block">MATRICULE :</span> {employee.id.split('-').pop()}</p>
                <p><span className="font-bold w-24 inline-block">NOM :</span> {(employee.name || '').toUpperCase()}</p>
                <p><span className="font-bold w-24 inline-block">FONCTION :</span> {(employee.position || '').toUpperCase()}</p>
            </div>
            <div>
                <p><span className="font-bold w-24 inline-block">N° SS :</span> {employee.cnasNumber || 'NON AFFILIÉ'}</p>
                <p><span className="font-bold w-24 inline-block">SIT. FAM :</span> {employee.familyStatus === 'Married' ? 'MARIÉ(E)' : 'CÉLIBATAIRE'} ({employee.childrenCount} ENF)</p>
                <p><span className="font-bold w-24 inline-block">MODE PAIEMENT :</span> {employee.bankRIB ? 'VIREMENT' : 'ESPÈCES'}</p>
            </div>
        </div>

        {/* CORPS DU BULLETIN */}
        <div className="border-2 border-black relative mb-4">
            <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100 border-b-2 border-black">
                    <tr>
                        <th className="border-r border-black p-2 w-12 text-center">CODE</th>
                        <th className="border-r border-black p-2 text-left">LIBELLÉ</th>
                        <th className="border-r border-black p-2 w-16 text-right">BASE</th>
                        <th className="border-r border-black p-2 w-12 text-center">TAUX</th>
                        <th className="border-r border-black p-2 w-24 text-right">GAINS</th>
                        <th className="p-2 w-24 text-right">RETENUES</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-300 last:border-0">
                            <td className="border-r border-black p-1.5 text-center font-mono">{row.code}</td>
                            <td className="border-r border-black p-1.5 font-bold">{row.libelle}</td>
                            <td className="border-r border-black p-1.5 text-right font-mono">{row.base ? row.base : ''}</td>
                            <td className="border-r border-black p-1.5 text-center font-mono">{row.taux}</td>
                            <td className="border-r border-black p-1.5 text-right font-mono">{row.gains > 0 ? formatCurrency(Number(row.gains)).replace('DZD', '') : ''}</td>
                            <td className="p-1.5 text-right font-mono">{row.retenues > 0 ? formatCurrency(Number(row.retenues)).replace('DZD', '') : ''}</td>
                        </tr>
                    ))}
                    {/* Empty fillers to push down */}
                    {[...Array(Math.max(0, 10 - rows.length))].map((_, i) => (
                        <tr key={`empty-${i}`}><td className="border-r border-black h-5"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td></tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* TABLEAU DE POINTAGE MENSUEL (NOUVEAU) */}
        <div className="mb-6 border-2 border-black p-2">
            <p className="text-[9px] font-black uppercase mb-1">Pointage du mois :</p>
            <table className="w-full border-collapse text-[8px] text-center table-fixed">
                <thead>
                    <tr>
                        {days.map(d => (
                            <th key={d} className={`border border-gray-400 p-0.5 ${(new Date(year, month-1, d).getDay() === 5 || new Date(year, month-1, d).getDay() === 6) ? 'bg-gray-300' : 'bg-gray-100'}`}>
                                {d}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {days.map(d => {
                            const dateObj = new Date(year, month - 1, d);
                            const dateStr = `${attendanceDate.substring(0, 7)}-${String(d).padStart(2, '0')}`;
                            const isWE = dateObj.getDay() === 5 || dateObj.getDay() === 6; // Vendredi(5) / Samedi(6)
                            
                            const record = attendanceRecords.find(a => a.employeeId === employee.id && a.date === dateStr);
                            
                            let content = '';
                            let cellClass = '';

                            if (isWE) {
                                content = 'W';
                                cellClass = 'bg-gray-200 text-gray-500 font-bold';
                            } else if (record) {
                                if (record.status === 'Present') { content = 'P'; cellClass = 'font-bold text-black'; }
                                else if (record.status === 'Absent') { content = 'A'; cellClass = 'bg-black text-white font-bold'; }
                                else if (record.status === 'Late') { content = 'R'; cellClass = 'text-black font-bold underline'; }
                                else if (record.status === 'Leave') { content = 'C'; cellClass = 'bg-gray-100 italic'; }
                            } else {
                                // Par défaut, jours ouvrables sans record = Considéré présent ou vide selon logique
                                // Ici on laisse vide pour clarté
                                content = '-';
                                cellClass = 'text-gray-300';
                            }

                            return <td key={d} className={`border border-gray-400 p-0.5 ${cellClass}`}>{content}</td>;
                        })}
                    </tr>
                </tbody>
            </table>
            <div className="flex gap-4 mt-1 text-[8px] font-bold text-gray-500">
                <span>P = Présent</span>
                <span>A = Absent</span>
                <span>R = Retard</span>
                <span>C = Congé</span>
                <span>W = Week-end</span>
            </div>
        </div>

        {/* BAS DE PAGE (TOTAUX) */}
        <div className="border-2 border-black p-2 mb-8 bg-gray-50 mt-auto">
            <div className="grid grid-cols-4 gap-4 text-xs text-center font-bold mb-4 uppercase">
                <div>
                    <p className="border-b border-black mb-1">Salaire Poste</p>
                    <p className="text-sm">{formatCurrency(payrollData.salairePoste)}</p>
                </div>
                <div>
                    <p className="border-b border-black mb-1">Imposable</p>
                    <p className="text-sm">{formatCurrency(payrollData.baseImposable)}</p>
                </div>
                <div>
                    <p className="border-b border-black mb-1">Total Gains</p>
                    <p className="text-sm">{formatCurrency(payrollData.gainsTotaux)}</p>
                </div>
                <div>
                    <p className="border-b border-black mb-1">Total Retenues</p>
                    <p className="text-sm">{formatCurrency(payrollData.cnas + payrollData.irg + payrollData.retenuesPrets + payrollData.montantRetenueAbsence)}</p>
                </div>
            </div>
            
            <div className="flex items-center justify-between border-t-2 border-black pt-4 px-4">
                <div className="text-xs font-bold uppercase text-gray-500">
                    Mode de paiement : {employee.bankRIB ? `VIREMENT (RIB: ${employee.bankRIB})` : 'ESPÈCES'}
                </div>
                <div className="flex items-center bg-black text-white px-6 py-3 rounded">
                    <span className="text-sm font-bold uppercase mr-4">NET À PAYER :</span>
                    <span className="text-xl font-black">{formatCurrency(payrollData.net)}</span>
                </div>
            </div>
        </div>

        {/* SIGNATURES */}
        <div className="flex justify-between px-8 text-xs font-bold uppercase">
            <div className="text-center">
                <p className="mb-8">Signature de l'Employé</p>
                <p className="text-[10px] font-normal text-gray-400 italic">Précédée de la mention "Lu et approuvé"</p>
            </div>
            <div className="text-center">
                <p className="mb-8">Cachet et Signature de l'Employeur</p>
                <p>Fait à {companySettings.wilaya}, le {today}</p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PayslipView;
