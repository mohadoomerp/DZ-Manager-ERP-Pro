
import React from 'react';
import { ChevronLeft, Printer } from 'lucide-react';
import { Employee, CompanySettings, AttendanceRecord } from '../../../types';
import { formatCurrency } from '../../../constants';
import { calculatePayrollData } from '../utils';

interface GlobalPayslipViewProps {
  employees: Employee[];
  companySettings: CompanySettings;
  attendanceDate: string; // YYYY-MM
  attendanceRecords: AttendanceRecord[];
  onBack: () => void;
}

const GlobalPayslipView: React.FC<GlobalPayslipViewProps> = ({ employees, companySettings, attendanceDate, attendanceRecords, onBack }) => {
  const [yearStr, monthStr] = attendanceDate.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const periodStr = new Date(year, month - 1, 1).toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' }).toUpperCase();
  const today = new Date().toLocaleDateString('fr-DZ');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20 no-print">
        <div className="flex items-center space-x-4">
            <button onClick={onBack} className="flex items-center space-x-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">
                <ChevronLeft size={16} /> <span>Retour</span>
            </button>
            <div>
                <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white">Impression Groupée</h3>
                <p className="text-[10px] text-slate-500 font-bold">{employees.length} bulletins • {periodStr}</p>
            </div>
        </div>
        <button onClick={() => window.print()} className="px-10 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-indigo-700 transition-all shadow-xl">
            <Printer size={18} className="mr-3" /> Lancer Impression
        </button>
      </div>

      <div className="print:p-0">
        {employees.map((employee, empIndex) => {
            const payrollData = calculatePayrollData(employee, attendanceRecords, `${attendanceDate}-01`, companySettings);
            const isCotisable = employee.isSociallyInsured !== undefined ? employee.isSociallyInsured : true;

            // Lignes du bulletin (Logique identique à PayslipView)
            let rows = [];
            rows.push({ code: 'R001', libelle: 'SALAIRE DE BASE', base: (companySettings.workingDaysCount || 30).toFixed(2), taux: '', gains: employee.baseSalary, retenues: 0 });

            if (payrollData.jourAbsents > 0 && payrollData.montantRetenueAbsence > 0) {
                rows.push({ code: 'R002', libelle: 'RETENUE ABSENCE', base: payrollData.jourAbsents.toFixed(2), taux: formatCurrency(payrollData.tauxJournalier).replace('DZD', ''), gains: 0, retenues: payrollData.montantRetenueAbsence });
            }

            employee.rubriques.forEach((r, idx) => {
                if (r.value > 0) {
                    rows.push({ code: `R${100 + idx}`, libelle: r.label.toUpperCase(), base: '', taux: '', gains: r.value, retenues: 0 });
                }
            });

            if (payrollData.realBonus > 0) {
                rows.push({ code: 'R200', libelle: 'PRIME DE PANIER/PRESENCE', base: '', taux: '', gains: payrollData.realBonus, retenues: 0 });
            }

            if (isCotisable) {
                rows.push({ code: 'R500', libelle: 'RETENUE S.S (CNAS)', base: payrollData.salairePoste, taux: '9.00%', gains: 0, retenues: payrollData.cnas });
            }

            rows.push({ code: 'R600', libelle: 'RETENUE I.R.G (BAREME)', base: payrollData.baseImposable, taux: '', gains: 0, retenues: payrollData.irg });

            if (payrollData.retenuesPrets > 0) {
                rows.push({ code: 'R700', libelle: 'REMBOURSEMENT PRÊT', base: '', taux: '', gains: 0, retenues: payrollData.retenuesPrets });
            }

            return (
                <div key={employee.id} className="bg-white p-8 max-w-[21cm] mx-auto border border-slate-300 min-h-[29.7cm] flex flex-col font-sans text-black mb-8 print:mb-0 print:border-none print:break-after-page relative">
                    
                    {/* EN-TÊTE */}
                    <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                        <div className="w-1/2 flex items-start gap-4">
                            {companySettings.logoUrl && <img src={companySettings.logoUrl} alt="Logo" className="w-16 h-16 object-contain object-left" />}
                            <div>
                                <h1 className="font-black text-lg uppercase mb-1">{companySettings.name}</h1>
                                <p className="text-[10px]">{companySettings.address}</p>
                                <div className="mt-1 text-[9px] font-bold">
                                    <span>NIF: {companySettings.nif}</span> • <span>NIS: {companySettings.nis}</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-1/2 text-right">
                            <h2 className="text-xl font-black uppercase">BULLETIN DE PAIE</h2>
                            <p className="text-xs font-bold mt-1 bg-black text-white inline-block px-2 py-1">{periodStr}</p>
                        </div>
                    </div>

                    {/* INFO SALARIÉ */}
                    <div className="border-2 border-black p-3 mb-4 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                            <p><span className="font-bold w-20 inline-block">MATRICULE :</span> {employee.id.split('-').pop()}</p>
                            <p><span className="font-bold w-20 inline-block">NOM :</span> {(employee.name || '').toUpperCase()}</p>
                            <p><span className="font-bold w-20 inline-block">FONCTION :</span> {(employee.position || '').toUpperCase()}</p>
                        </div>
                        <div>
                            <p><span className="font-bold w-20 inline-block">N° SS :</span> {employee.cnasNumber || '---'}</p>
                            <p><span className="font-bold w-20 inline-block">SITUATION :</span> {employee.familyStatus === 'Married' ? 'MARIÉ(E)' : 'CÉLIBATAIRE'}</p>
                            <p><span className="font-bold w-20 inline-block">MODE :</span> {employee.bankRIB ? 'VIREMENT' : 'ESPÈCES'}</p>
                        </div>
                    </div>

                    {/* CORPS DU BULLETIN */}
                    <div className="border-2 border-black relative mb-4 flex-1">
                        <table className="w-full text-[10px] border-collapse">
                            <thead className="bg-gray-100 border-b-2 border-black">
                                <tr>
                                    <th className="border-r border-black p-1 w-10 text-center">CODE</th>
                                    <th className="border-r border-black p-1 text-left">LIBELLÉ</th>
                                    <th className="border-r border-black p-1 w-14 text-right">BASE</th>
                                    <th className="border-r border-black p-1 w-10 text-center">TAUX</th>
                                    <th className="border-r border-black p-1 w-20 text-right">GAINS</th>
                                    <th className="p-1 w-20 text-right">RETENUES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, idx) => (
                                    <tr key={idx} className="border-b border-gray-300 last:border-0">
                                        <td className="border-r border-black p-1 text-center font-mono">{row.code}</td>
                                        <td className="border-r border-black p-1 font-bold">{row.libelle}</td>
                                        <td className="border-r border-black p-1 text-right font-mono">{row.base ? row.base : ''}</td>
                                        <td className="border-r border-black p-1 text-center font-mono">{row.taux}</td>
                                        <td className="border-r border-black p-1 text-right font-mono">{row.gains > 0 ? formatCurrency(Number(row.gains)).replace('DZD', '') : ''}</td>
                                        <td className="p-1 text-right font-mono">{row.retenues > 0 ? formatCurrency(Number(row.retenues)).replace('DZD', '') : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* BAS DE PAGE (TOTAUX) */}
                    <div className="border-2 border-black p-2 mb-4 bg-gray-50 mt-auto">
                        <div className="grid grid-cols-4 gap-2 text-[10px] text-center font-bold uppercase">
                            <div><p className="border-b border-black mb-1">Salaire Poste</p><p>{formatCurrency(payrollData.salairePoste)}</p></div>
                            <div><p className="border-b border-black mb-1">Imposable</p><p>{formatCurrency(payrollData.baseImposable)}</p></div>
                            <div><p className="border-b border-black mb-1">Total Gains</p><p>{formatCurrency(payrollData.gainsTotaux)}</p></div>
                            <div><p className="border-b border-black mb-1">Total Retenues</p><p>{formatCurrency(payrollData.cnas + payrollData.irg + payrollData.retenuesPrets + payrollData.montantRetenueAbsence)}</p></div>
                        </div>
                        <div className="flex items-center justify-end border-t-2 border-black pt-2 mt-2 px-2">
                            <div className="flex items-center bg-black text-white px-4 py-2 rounded">
                                <span className="text-xs font-bold uppercase mr-3">NET À PAYER :</span>
                                <span className="text-lg font-black">{formatCurrency(payrollData.net)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-[9px] text-center font-bold uppercase">
                        <p>Fait à {companySettings.wilaya}, le {today} • Cachet et Signature</p>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default GlobalPayslipView;
