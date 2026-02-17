
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, FileText, Calculator, Plus, Trash2, Edit3, X, Save, Banknote, Printer, ChevronLeft, Phone, UserPlus, Clock, ShieldCheck, ListChecks, CalendarCheck, UserCheck, AlertCircle, Ban, Landmark, MapPin, Calendar, Heart, User as UserIcon, LifeBuoy, Fingerprint, FileBadge, Lock, Unlock, CheckCircle, Briefcase, GraduationCap, Archive, LogOut, ArrowRight, UserMinus, History, Camera, Upload, Eye, FileDown, FolderOpen, ScrollText, Coins } from 'lucide-react';
import { Employee, AttendanceRecord, SalaryRubrique, AuditLog, ModuleType, Candidate, EmployeeDocument, CompanySettings } from '../../types';
import { formatCurrency, numberToWords } from '../../constants';
import OCRScanner from '../../components/OCRScanner';
import EmployeeModal from './components/EmployeeModal';
import RecruitmentTab from './components/RecruitmentTab';
import PayslipView from './components/PayslipView';
import GlobalPayslipView from './components/GlobalPayslipView';
import { COMMON_RUBRIQUES, RECRUITMENT_STAGES } from './constants';
import { generateDocumentHtml } from './utils';

interface HRModuleProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
  companySettings: CompanySettings;
}

const HRModule: React.FC<HRModuleProps> = ({ 
  employees, setEmployees, candidates, setCandidates, 
  attendance, setAttendance, onAddLog, companySettings 
}) => {
  const [activeTab, setActiveTab] = useState<'personnel' | 'recrutement' | 'paie'>('personnel');
  const [view, setView] = useState<'list' | 'payslip' | 'global_payslips' | 'attendance'>('list');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  
  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [exitData, setExitData] = useState({ date: new Date().toISOString().split('T')[0], reason: 'EndOfContract' as any });

  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  // Payroll State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'Archived'), [employees]);
  const archivedEmployees = useMemo(() => employees.filter(e => e.status === 'Archived'), [employees]);

  const isDayValidated = useMemo(() => {
    if (!attendance || !Array.isArray(attendance)) return false;
    const dayRecords = attendance.filter(a => a && a.date === attendanceDate);
    if (dayRecords.length === 0) return false;
    return dayRecords.every(a => a.isValidated);
  }, [attendance, attendanceDate]);

  // Handlers for Recruitment
  const handleScanComplete = (data: any) => {
    const newCand: Candidate = {
      id: `CAND-SCAN-${Date.now()}`,
      name: data.name || 'Candidat Inconnu',
      position: data.position || 'Candidature Spontanée',
      email: data.email || '',
      phone: data.phone || '',
      status: 'New',
      applicationDate: new Date().toISOString().split('T')[0],
      notes: data.notes || 'Importé via Scan CV',
      updatedAt: Date.now()
    };
    setCandidates(prev => [...prev, newCand]);
    onAddLog('CREATE', ModuleType.HR, `Candidat scanné ${newCand.name}`);
    setIsScannerOpen(false);
  };

  const handleHireCandidate = (candidate: Candidate) => {
    if(confirm(`Embaucher ${candidate.name} ? Cela ouvrira la fiche employé.`)) {
        const newEmp: Partial<Employee> = {
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            position: candidate.position,
            joinDate: new Date().toISOString().split('T')[0],
            documents: []
        };
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'Hired' } : c));
        setEditingEmp(newEmp as Employee);
        setIsEmpModalOpen(true);
        setActiveTab('personnel');
        setIsCandidateModalOpen(false);
    }
  };

  const handleSaveEmployee = (emp: Employee) => {
    setEmployees(prev => {
      const exists = prev.find(e => e.id === emp.id);
      if (exists) return prev.map(e => e.id === emp.id ? emp : e);
      return [...prev, emp];
    });
    
    if (editingEmp?.id) onAddLog('UPDATE', ModuleType.HR, `Mise à jour employé ${emp.name}`);
    else onAddLog('CREATE', ModuleType.HR, `Nouvel employé ${emp.name}`);

    setIsEmpModalOpen(false);
  };

  const handleDeleteEmployee = (id: string) => {
    if(confirm("Supprimer cet employé ?")) {
        const e = employees.find(e => e.id === id);
        if(e) {
            setEmployees(employees.filter(emp => emp.id !== id));
            onAddLog('DELETE', ModuleType.HR, `Suppression employé ${e.name}`);
        }
    }
  };

  const handleArchiveEmployee = () => {
      if (!editingEmp) return;
      
      // Génération automatique du certificat de travail
      const fullHtml = generateDocumentHtml('Certificat', { ...editingEmp, exitDate: exitData.date }, companySettings);
      const base64Content = btoa(unescape(encodeURIComponent(fullHtml)));
      const dataUrl = `data:text/html;charset=utf-8;base64,${base64Content}`;
      
      const certDoc: EmployeeDocument = {
          id: `CERT-EXIT-${Date.now()}`,
          name: `Certificat de Travail - ${new Date().toLocaleDateString('fr-DZ')}`,
          type: 'Certificate',
          date: new Date().toISOString().split('T')[0],
          content: dataUrl,
          isGenerated: true
      };

      const updatedEmp: Employee = {
          ...editingEmp,
          status: 'Archived',
          exitDate: exitData.date,
          exitReason: exitData.reason,
          documents: [...(editingEmp.documents || []), certDoc],
          updatedAt: Date.now()
      };

      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
      onAddLog('UPDATE', ModuleType.HR, `Sortie employé ${updatedEmp.name} (Archivé)`);
      setIsArchiveModalOpen(false);
      setEditingEmp(null);
      alert("Employé archivé avec succès. Le certificat de travail a été généré dans son dossier.");
  };

  const deleteCandidate = (id: string) => {
      if(confirm('Supprimer ce candidat ?')) {
          setCandidates(prev => prev.filter(c => c.id !== id));
          onAddLog('DELETE', ModuleType.HR, 'Suppression candidat');
      }
  };

  const handleSaveCandidate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCand: Candidate = {
      id: editingCandidate?.id || `CAND-${Date.now()}`,
      name: formData.get('name') as string,
      position: formData.get('position') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: (formData.get('status') as any) || 'New',
      applicationDate: editingCandidate?.applicationDate || new Date().toISOString().split('T')[0],
      notes: formData.get('notes') as string,
      updatedAt: Date.now()
    };

    setCandidates(prev => editingCandidate ? prev.map(c => c.id === editingCandidate.id ? newCand : c) : [...prev, newCand]);
    onAddLog(editingCandidate ? 'UPDATE' : 'CREATE', ModuleType.HR, `Candidat ${newCand.name}`);
    setIsCandidateModalOpen(false);
  };

  // --- LOGIQUE DU TABLEAU DE POINTAGE MENSUEL ---
  const monthDays = useMemo(() => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth]);

  const toggleAttendanceStatus = (emp: Employee, day: number) => {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const existingRecord = attendance.find(a => a.employeeId === emp.id && a.date === dateStr);
      
      let newStatus: AttendanceRecord['status'] = 'Present';
      
      if (!existingRecord) {
          newStatus = 'Present';
      } else if (existingRecord.status === 'Present') {
          newStatus = 'Absent';
      } else if (existingRecord.status === 'Absent') {
          newStatus = 'Late';
      } else if (existingRecord.status === 'Late') {
          newStatus = 'Leave'; // Congé
      } else {
          setAttendance(prev => prev.filter(a => !(a.employeeId === emp.id && a.date === dateStr)));
          return;
      }

      const newRecord: AttendanceRecord = {
          id: existingRecord?.id || `ATT-${emp.id}-${dateStr}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: dateStr,
          status: newStatus,
          isValidated: false
      };

      setAttendance(prev => {
          const filtered = prev.filter(a => !(a.employeeId === emp.id && a.date === dateStr));
          return [...filtered, newRecord];
      });
  };

  const handleUpdateAttendance = (empId: string, empName: string, status: AttendanceRecord['status']) => {
    if (isDayValidated) return;
    const recordId = `${empId}-${attendanceDate}`;
    const newRecord: AttendanceRecord = {
      id: recordId, employeeId: empId, employeeName: empName, date: attendanceDate, status,
      entryTime: '08:00', exitTime: '16:30', isValidated: false
    };
    setAttendance(prev => {
      const filtered = prev.filter(a => a.id !== recordId);
      return [...filtered, newRecord];
    });
  };

  const handleValidateDay = () => {
    if (confirm(`Clôturer le registre pour le ${attendanceDate} ?`)) {
      setAttendance(prev => prev.map(a => a.date === attendanceDate ? { ...a, isValidated: true } : a));
      onAddLog('SYNC', ModuleType.HR, `Validation pointage ${attendanceDate}`);
    }
  };

  const getStatusColor = (status?: string) => {
      switch(status) {
          case 'Present': return 'bg-emerald-100 text-emerald-700 font-bold';
          case 'Absent': return 'bg-rose-100 text-rose-700 font-black';
          case 'Late': return 'bg-amber-100 text-amber-700 font-bold';
          case 'Leave': return 'bg-blue-100 text-blue-700 font-bold';
          default: return 'bg-white hover:bg-slate-50';
      }
  };

  const getStatusLabel = (status?: string) => {
      switch(status) {
          case 'Present': return 'P';
          case 'Absent': return 'A';
          case 'Late': return 'R';
          case 'Leave': return 'C';
          default: return '-';
      }
  };

  const handleImportZK = () => {
      if(!companySettings.timeClockIp) {
          alert("Veuillez d'abord configurer l'IP de la pointeuse dans Paramètres > Périphériques.");
          return;
      }
      const confirmImport = confirm(`Connecter à la pointeuse ${companySettings.timeClockIp} et importer les logs du mois ${selectedMonth} ?`);
      if(confirmImport) {
          onAddLog('SYNC', ModuleType.TIME_CLOCK, `Importation logs depuis ${companySettings.timeClockIp}`);
          alert("Importation réussie : 0 nouveaux enregistrements (Simulation).");
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* NAVIGATION TABS */}
      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-800 w-fit no-print">
        <button onClick={() => setActiveTab('personnel')} className={`flex items-center px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'personnel' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
            <Briefcase size={16} className="mr-2" /> Personnel
        </button>
        <button onClick={() => setActiveTab('recrutement')} className={`flex items-center px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'recrutement' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
            <UserPlus size={16} className="mr-2" /> Recrutement
        </button>
        <button onClick={() => setActiveTab('paie')} className={`flex items-center px-6 py-3 rounded-[18px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'paie' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
            <Banknote size={16} className="mr-2" /> Paie & Pointage
        </button>
      </div>

      {activeTab === 'personnel' && (
        <>
          <div className="flex justify-between items-center no-print">
            <div><h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Effectif Actif</h2><p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{activeEmployees.length} collaborateurs en poste</p></div>
            <button onClick={() => { setEditingEmp(null); setIsEmpModalOpen(true); }} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><UserPlus size={18} className="mr-3" /> Inscrire un Employé</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print">
            {activeEmployees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 group relative flex flex-col">
                 <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">{emp.name?.[0] || 'E'}</div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Edit3 size={20} /></button>
                       <button onClick={() => { setEditingEmp(emp); setIsArchiveModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-amber-600 hover:text-amber-700 rounded-xl transition-all shadow-sm" title="Archiver / Sortie"><LogOut size={20} /></button>
                    </div>
                 </div>
                 <h3 className="font-black text-slate-950 dark:text-white text-lg leading-tight mb-2">{emp.name}</h3>
                 <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-6 border-b border-indigo-200 dark:border-indigo-900/50 pb-2">{emp.position}</p>
                 <div className="space-y-2 mb-8 flex-1">
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{emp.contractType || 'CDI'} • {emp.isSociallyInsured ? 'Assuré CNAS' : 'Non Assuré'}</div>
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">{emp.phone || 'Non renseigné'}</div>
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Depuis le {emp.joinDate}</div>
                 </div>
              </div>
            ))}
          </div>

          {archivedEmployees.length > 0 && (
              <div className="mt-12">
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><History size={24} className="mr-3"/> Ancien Personnel (Archives)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
                      {archivedEmployees.map(emp => (
                          <div key={emp.id} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <div>
                                  <p className="font-black text-slate-700 dark:text-slate-300 uppercase">{emp.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.position}</p>
                                  <p className="text-[9px] font-mono text-rose-500 mt-1">Sortie : {emp.exitDate} ({emp.exitReason})</p>
                              </div>
                              <div className="flex space-x-1">
                                  <button onClick={() => { setEditingEmp(emp); setIsEmpModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="Consulter"><FileText size={16}/></button>
                                  <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </>
      )}

      {activeTab === 'recrutement' && (
        <RecruitmentTab 
          candidates={candidates} 
          setCandidates={setCandidates} 
          onEditCandidate={(c) => { setEditingCandidate(c); setIsCandidateModalOpen(true); }} 
          onHireCandidate={handleHireCandidate}
          onDeleteCandidate={(id) => setCandidates(prev => prev.filter(c => c.id !== id))}
          onOpenScanner={() => setIsScannerOpen(true)}
          onNewCandidate={() => { setEditingCandidate(null); setIsCandidateModalOpen(true); }}
          onAddLog={onAddLog}
        />
      )}

      {activeTab === 'paie' && (
        <div className="space-y-6">
           {view === 'attendance' ? (
             <>
               <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm gap-6">
                 <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><CalendarCheck size={24} /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tableau de Pointage</h3>
                       <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Matrice Mensuelle Interactive</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white text-xs outline-none" />
                    <button onClick={handleImportZK} className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center hover:bg-emerald-700 transition-all">
                       <Upload size={16} className="mr-2" /> Import Pointage (ZK/Anviz)
                    </button>
                    <button onClick={() => setView('list')} className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Retour Bulletins</button>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                 <div className="overflow-x-auto pb-4 custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 p-4 text-left border-b border-r border-slate-200 dark:border-slate-700 min-w-[200px]">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collaborateur</span>
                                </th>
                                {monthDays.map(day => {
                                    const dateObj = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, day);
                                    const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6; // Vendredi (5) & Samedi (6)
                                    return (
                                        <th key={day} className={`p-2 text-center border-b border-r border-slate-200 dark:border-slate-700 min-w-[35px] ${isWeekend ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{dateObj.toLocaleDateString('fr-FR', {weekday: 'narrow'})}</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300">{day}</span>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th className="p-4 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                    <span className="text-[9px] font-black text-slate-500 uppercase">ABS</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeEmployees.map(emp => {
                                // Calcul total absences pour le mois
                                const monthRecords = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(selectedMonth));
                                const totalAbs = monthRecords.filter(a => a.status === 'Absent').length;

                                return (
                                    <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-700 font-black text-xs text-slate-800 dark:text-white uppercase truncate">
                                            {emp.name}
                                        </td>
                                        {monthDays.map(day => {
                                            const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                                            const record = attendance.find(a => a.employeeId === emp.id && a.date === dateStr);
                                            const dateObj = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, day);
                                            const isWeekend = dateObj.getDay() === 5 || dateObj.getDay() === 6;

                                            return (
                                                <td 
                                                    key={day} 
                                                    onClick={() => !isWeekend && toggleAttendanceStatus(emp, day)}
                                                    className={`p-1 border-r border-slate-100 dark:border-slate-800 text-center cursor-pointer select-none transition-colors ${isWeekend ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : ''}`}
                                                >
                                                    {!isWeekend && (
                                                        <div className={`w-full h-8 flex items-center justify-center rounded-lg text-[10px] ${getStatusColor(record?.status)}`}>
                                                            {getStatusLabel(record?.status)}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="p-2 text-center font-black text-rose-600 bg-slate-50/50 dark:bg-slate-800/50">
                                            {totalAbs > 0 ? totalAbs : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
                 
                 <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase">
                    <div className="flex gap-4">
                        <span className="flex items-center"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded mr-1"></div> P : Présent</span>
                        <span className="flex items-center"><div className="w-3 h-3 bg-rose-100 border border-rose-200 rounded mr-1"></div> A : Absent</span>
                        <span className="flex items-center"><div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded mr-1"></div> R : Retard</span>
                        <span className="flex items-center"><div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-1"></div> C : Congé</span>
                    </div>
                    <div>Cliquez sur une case pour changer le statut</div>
                 </div>
              </div>
             </>
           ) : view === 'payslip' && selectedEmp ? (
             <PayslipView 
                employee={selectedEmp} 
                companySettings={companySettings} 
                attendanceDate={`${selectedMonth}-01`} // On passe le mois sélectionné par défaut
                attendanceRecords={attendance} 
                onBack={() => setView('list')} 
             />
           ) : view === 'global_payslips' ? (
             <GlobalPayslipView 
                employees={activeEmployees} 
                companySettings={companySettings} 
                attendanceDate={selectedMonth} 
                attendanceRecords={attendance} 
                onBack={() => setView('list')} 
             />
           ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-widest">Liste de Paie</h3>
                   <div className="flex gap-2">
                       <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black outline-none" />
                       <button onClick={() => setView('global_payslips')} className="px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all flex items-center">
                           <Printer size={16} className="mr-2"/> Impression Groupée
                       </button>
                       <button onClick={() => setView('attendance')} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Saisir Pointage</button>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {activeEmployees.map(emp => (
                      <div key={emp.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm group" onClick={() => { setSelectedEmp(emp); setView('payslip'); }}>
                         <div>
                            <p className="font-black text-slate-900 dark:text-white uppercase">{emp.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{emp.position}</p>
                         </div>
                         <div className="text-right">
                            <span className="text-[8px] uppercase font-black text-slate-400 group-hover:text-indigo-400">Voir Fiche</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      )}

      {/* Employee Modal */}
      <EmployeeModal 
        isOpen={isEmpModalOpen} 
        onClose={() => setIsEmpModalOpen(false)} 
        editingEmp={editingEmp} 
        onSave={handleSaveEmployee} 
        companySettings={companySettings}
      />

      {/* MODAL: Candidate Form */}
      {isCandidateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest">{editingCandidate ? 'Modifier Candidat' : 'Nouvelle Candidature'}</h3>
                    <button onClick={() => setIsCandidateModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={16}/></button>
                </div>
                <form onSubmit={handleSaveCandidate} className="p-8 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom du Candidat</label>
                        <input name="name" required defaultValue={editingCandidate?.name} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-black text-sm outline-none focus:border-indigo-600" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Poste Visé</label>
                        <input name="position" required defaultValue={editingCandidate?.position} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-black text-sm outline-none focus:border-indigo-600" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                            <input type="email" name="email" defaultValue={editingCandidate?.email} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-xs outline-none focus:border-indigo-600" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Téléphone</label>
                            <input name="phone" defaultValue={editingCandidate?.phone} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-xs outline-none focus:border-indigo-600" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Statut Recrutement</label>
                        <select name="status" defaultValue={editingCandidate?.status || 'New'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-xs outline-none focus:border-indigo-600">
                            {RECRUITMENT_STAGES.filter(s => s.id !== 'Hired').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Notes & Observations</label>
                        <textarea name="notes" defaultValue={editingCandidate?.notes} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-xs outline-none h-24 focus:border-indigo-600"></textarea>
                    </div>
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Enregistrer Candidature</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: Archive Employee */}
      {isArchiveModalOpen && editingEmp && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 bg-rose-600 text-white flex justify-between items-center">
                      <h3 className="text-sm font-black uppercase tracking-widest">Sortie des Effectifs</h3>
                      <button onClick={() => setIsArchiveModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={16}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start">
                          <AlertCircle className="text-rose-600 mr-2 shrink-0" size={20}/>
                          <p className="text-xs font-bold text-rose-800">Vous êtes sur le point d'archiver le dossier de <span className="font-black underline">{editingEmp.name}</span>. L'accès sera désactivé mais l'historique conservé.</p>
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Date de Sortie</label>
                          <input type="date" value={exitData.date} onChange={e => setExitData({...exitData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-sm outline-none" />
                      </div>
                      
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Motif de Départ</label>
                          <select value={exitData.reason} onChange={e => setExitData({...exitData, reason: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl font-bold text-sm outline-none">
                              <option value="EndOfContract">Fin de Contrat (CDD/Intérim)</option>
                              <option value="Resignation">Démission Volontaire</option>
                              <option value="Dismissal">Licenciement</option>
                              <option value="Retirement">Retraite</option>
                          </select>
                      </div>

                      <div className="flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                          <CheckCircle size={12} className="mr-1"/> Un certificat de travail sera généré automatiquement.
                      </div>

                      <button onClick={handleArchiveEmployee} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center">
                          <Archive size={16} className="mr-2"/> Confirmer Archivage
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isScannerOpen && <OCRScanner targetType="candidate" onClose={() => setIsScannerOpen(false)} onScanComplete={handleScanComplete} />}
    </div>
  );
};

export default HRModule;
