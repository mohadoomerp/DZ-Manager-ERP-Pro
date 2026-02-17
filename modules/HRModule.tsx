
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Users, FileText, Calculator, Plus, Trash2, Edit3, X, Save, Banknote, Printer, ChevronLeft, Phone, UserPlus, Clock, ShieldCheck, ListChecks, CalendarCheck, UserCheck, AlertCircle, Ban, Landmark, MapPin, Calendar, Heart, User as UserIcon, LifeBuoy, Fingerprint, FileBadge, Lock, Unlock, CheckCircle, Briefcase, GraduationCap, Archive, LogOut, ArrowRight, UserMinus, History, Camera, Upload, Eye, FileDown, FolderOpen, ScrollText, Coins } from 'lucide-react';
import { Employee, AttendanceRecord, SalaryRubrique, AuditLog, ModuleType, Candidate, EmployeeDocument, CompanySettings } from '../types';
import { formatCurrency, numberToWords } from '../constants';
import OCRScanner from '../components/OCRScanner';

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

// Bibliothèque inspirée de PC PAIE / WINALCO
const COMMON_RUBRIQUES: SalaryRubrique[] = [
  // Primes Cotisables & Imposables
  { id: 'IEP', label: "Indemnité Exp. Prof. (IEP)", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'NUIS', label: "Indemnité de Nuisance", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'DANGER', label: "Indemnité de Danger", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'ZONE', label: "Indemnité de Zone", value: 0, isCotisable: true, isImposable: true, type: 'fixed' },
  { id: 'PRI', label: "Prime Rendement Indiv. (PRI)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'PRC', label: "Prime Rendement Coll. (PRC)", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'HS50', label: "Heures Supp. 50%", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'HS75', label: "Heures Supp. 75%", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  { id: 'WE', label: "Indemnité Travail Week-end", value: 0, isCotisable: true, isImposable: true, type: 'variable' },
  
  // Primes Non Cotisables (Frais)
  { id: 'PANIER', label: "Indemnité Panier", value: 0, isCotisable: false, isImposable: false, type: 'fixed' },
  { id: 'TRANSPORT', label: "Indemnité Transport", value: 0, isCotisable: false, isImposable: false, type: 'fixed' },
  { id: 'VEHICULE', label: "Indemnité Véhicule", value: 0, isCotisable: false, isImposable: true, type: 'fixed' },
  { id: 'MISSION', label: "Frais de Mission", value: 0, isCotisable: false, isImposable: false, type: 'variable' },
  
  // Retenues
  { id: 'ACOMPTE', label: "Acompte sur Salaire", value: 0, isCotisable: false, isImposable: false, type: 'variable' },
  { id: 'RET_ABS', label: "Retenue Absences", value: 0, isCotisable: true, isImposable: true, type: 'variable' }, // Retenue spéciale (réduit le brut)
];

const RECRUITMENT_STAGES = [
  { id: 'New', label: 'Candidature', color: 'bg-blue-100 text-blue-700' },
  { id: 'Screening', label: 'En Examen', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'Interview', label: 'Entretien', color: 'bg-amber-100 text-amber-700' },
  { id: 'Offer', label: 'Offre', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'Rejected', label: 'Rejeté', color: 'bg-rose-100 text-rose-700' }
];

const HRModule: React.FC<HRModuleProps> = ({ employees = [], setEmployees, candidates = [], setCandidates, attendance = [], setAttendance, onAddLog, companySettings }) => {
  const [activeTab, setActiveTab] = useState<'personnel' | 'recrutement' | 'paie'>('personnel');
  const [view, setView] = useState<'list' | 'payslip' | 'attendance'>('list');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  
  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'contract' | 'docs'>('info'); // Internal modal tab
  
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
  
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  
  // Payroll State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeRubriques, setActiveRubriques] = useState<SalaryRubrique[]>([]);
  const [baseSalary, setBaseSalary] = useState(0);
  const [presenceBonus, setPresenceBonus] = useState(0);
  const [isBaseCotisable, setIsBaseCotisable] = useState(true);
  const [isBaseImposable, setIsBaseImposable] = useState(true);
  
  // Selection pour ajout rubrique
  const [selectedRubricId, setSelectedRubricId] = useState<string>("");

  // Archiving State
  const [exitData, setExitData] = useState({ date: new Date().toISOString().split('T')[0], reason: 'EndOfContract' as any });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeEmployees = useMemo(() => employees.filter(e => e.status !== 'Archived'), [employees]);
  const archivedEmployees = useMemo(() => employees.filter(e => e.status === 'Archived'), [employees]);

  const isDayValidated = useMemo(() => {
    if (!attendance || !Array.isArray(attendance)) return false;
    const dayRecords = attendance.filter(a => a && a.date === attendanceDate);
    if (dayRecords.length === 0) return false;
    return dayRecords.every(a => a.isValidated);
  }, [attendance, attendanceDate]);

  useEffect(() => {
    if (editingEmp) {
      setBaseSalary(editingEmp.baseSalary || 0);
      setPresenceBonus(editingEmp.presenceBonus || 0);
      setIsBaseCotisable(editingEmp.isSociallyInsured !== undefined ? editingEmp.isSociallyInsured : true);
      setIsBaseImposable(editingEmp.isTaxable !== undefined ? editingEmp.isTaxable : true);
      
      // Load rubriques or defaults if empty
      if (editingEmp.rubriques && editingEmp.rubriques.length > 0) {
          setActiveRubriques(editingEmp.rubriques);
      } else {
          // Default : Panier & Transport
          const defaults = COMMON_RUBRIQUES.filter(r => ['PANIER', 'TRANSPORT'].includes(r.id)).map(r => ({...r, value: 0}));
          setActiveRubriques(defaults);
      }
    } else {
      setBaseSalary(0);
      setPresenceBonus(0);
      setIsBaseCotisable(true);
      setIsBaseImposable(true);
      const defaults = COMMON_RUBRIQUES.filter(r => ['PANIER', 'TRANSPORT'].includes(r.id)).map(r => ({...r, value: 0}));
      setActiveRubriques(defaults);
    }
  }, [editingEmp, isEmpModalOpen]);

  // --- RUBRIC MANAGEMENT ---
  const handleAddRubrique = () => {
      if (!selectedRubricId) return;
      const template = COMMON_RUBRIQUES.find(r => r.id === selectedRubricId);
      if (template) {
          // Check duplicate
          if (activeRubriques.find(r => r.id === template.id)) {
              alert("Cette rubrique existe déjà pour cet employé.");
              return;
          }
          setActiveRubriques(prev => [...prev, { ...template, value: 0 }]);
          setSelectedRubricId("");
      }
  };

  const handleRemoveRubrique = (id: string) => {
      setActiveRubriques(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateRubriqueValue = (id: string, newVal: number) => {
      setActiveRubriques(prev => prev.map(r => r.id === id ? { ...r, value: newVal } : r));
  };

  // --- RECRUITMENT LOGIC ---
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
        // Move status to Hired
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'Hired' } : c));
        // Open Employee Modal
        setEditingEmp(newEmp as Employee);
        setModalTab('info');
        setIsEmpModalOpen(true);
        setIsCandidateModalOpen(false); // Close candidate modal if open
        setActiveTab('personnel');
    }
  };

  const deleteCandidate = (id: string) => {
      if(confirm('Supprimer ce candidat ?')) {
          setCandidates(prev => prev.filter(c => c.id !== id));
          onAddLog('DELETE', ModuleType.HR, 'Suppression candidat');
      }
  };

  // --- DOCUMENT LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingEmp) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const newDoc: EmployeeDocument = {
                id: `DOC-${Date.now()}`,
                name: file.name,
                type: 'Other',
                date: new Date().toISOString().split('T')[0],
                content: reader.result as string,
                isGenerated: false
            };
            
            setEditingEmp(prev => prev ? { ...prev, documents: [...(prev.documents || []), newDoc] } : null);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleDeleteDocument = (docId: string) => {
      if(confirm("Supprimer ce document ?")) {
          setEditingEmp(prev => prev ? { ...prev, documents: (prev.documents || []).filter(d => d.id !== docId) } : null);
      }
  };

  const generateDocument = (type: 'Attestation' | 'Conge' | 'Avertissement') => {
      if (!editingEmp) return;
      
      let docTitle = "";
      let docBody = "";
      let extraInfo = "";

      const today = new Date().toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

      if (type === 'Attestation') {
          docTitle = "ATTESTATION DE TRAVAIL";
          const fin = editingEmp.status === 'Archived' && editingEmp.exitDate 
              ? `et a quitté l'établissement le ${new Date(editingEmp.exitDate).toLocaleDateString('fr-DZ')}`
              : `et occupe cet emploi à ce jour`;
          
          docBody = `
            <p>Nous soussignés, <strong>${companySettings.name}</strong>, attestons par la présente que :</p>
            <div style="margin: 30px 0; padding-left: 20px;">
                <p>M./Mme : <strong>${editingEmp.name}</strong></p>
                <p>Né(e) le : ${new Date(editingEmp.dateOfBirth).toLocaleDateString('fr-DZ')} à ${editingEmp.placeOfBirth}</p>
            </div>
            <p>Est employé(e) au sein de notre organisme en qualité de <strong>${editingEmp.position}</strong> depuis le ${new Date(editingEmp.joinDate).toLocaleDateString('fr-DZ')} ${fin}.</p>
            <p style="margin-top: 30px;">Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
          `;
      } else if (type === 'Conge') {
          const startStr = prompt("Date de début du congé (JJ/MM/AAAA) :", new Date().toLocaleDateString('fr-DZ'));
          const endStr = prompt("Date de fin du congé (JJ/MM/AAAA) :");
          if (!startStr || !endStr) return;
          
          docTitle = "TITRE DE CONGÉ";
          docBody = `
            <p>La Direction de <strong>${companySettings.name}</strong> autorise :</p>
            <div style="margin: 30px 0; padding-left: 20px;">
                <p>M./Mme : <strong>${editingEmp.name}</strong></p>
                <p>Fonction : ${editingEmp.position}</p>
            </div>
            <p>À s'absenter pour un congé annuel du <strong>${startStr}</strong> au <strong>${endStr}</strong> inclus.</p>
            <p>L'intéressé(e) devra reprendre son poste le jour ouvrable suivant la date de fin.</p>
          `;
      } else if (type === 'Avertissement') {
          const motif = prompt("Veuillez saisir le motif de l'avertissement :", "Absences injustifiées répétées");
          if (!motif) return;

          docTitle = "AVERTISSEMENT";
          docBody = `
            <p>À l'attention de M./Mme <strong>${editingEmp.name}</strong>,</p>
            <p>Nous avons le regret de vous notifier par la présente un avertissement pour le motif suivant :</p>
            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #000;">
                <strong>${motif}</strong>
            </div>
            <p>Nous vous demandons de bien vouloir redresser cette situation et de veiller au respect des règles de l'entreprise à l'avenir. Tout nouvel incident de même nature pourrait entraîner des sanctions disciplinaires plus sévères.</p>
          `;
      }

      // Template HTML Complet avec En-tête
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
            body { font-family: 'Roboto', sans-serif; padding: 40px; color: #000; line-height: 1.6; max-width: 21cm; margin: 0 auto; }
            .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
            .company-details { font-size: 11px; text-align: left; }
            .company-details strong { font-size: 16px; text-transform: uppercase; }
            .logo-container { text-align: right; }
            .logo-container img { max-height: 80px; max-width: 150px; object-fit: contain; }
            .republic { text-align: center; font-size: 10px; text-transform: uppercase; font-weight: bold; margin-bottom: 20px; color: #555; }
            .doc-title { text-align: center; font-size: 24px; font-weight: 900; text-transform: uppercase; text-decoration: underline; margin: 40px 0; letter-spacing: 2px; }
            .content { font-size: 14px; text-align: justify; min-height: 300px; }
            .footer { margin-top: 80px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; text-align: center; }
            .legal-footer { border-top: 1px solid #ccc; margin-top: 50px; pt: 10px; font-size: 9px; text-align: center; color: #666; }
            @media print { 
                body { padding: 0; } 
                .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="republic">République Algérienne Démocratique et Populaire</div>
          
          <div class="header">
            <div class="company-details">
               <strong>${companySettings.name}</strong><br/>
               ${companySettings.address}<br/>
               ${companySettings.commune}, ${companySettings.wilaya}<br/>
               Tél: ${companySettings.phone || 'N/A'} | Email: ${companySettings.email || 'N/A'}<br/>
               <span style="font-family: monospace;">RC: ${companySettings.rc} | NIF: ${companySettings.nif}</span>
            </div>
            <div class="logo-container">
               ${companySettings.logoUrl ? `<img src="${companySettings.logoUrl}" />` : `<div style="font-size: 30px; font-weight: bold; border: 2px solid #000; padding: 10px;">${companySettings.name.charAt(0)}</div>`}
            </div>
          </div>

          <div class="doc-title">${docTitle}</div>

          <div class="content">
             ${docBody}
          </div>

          <div class="footer">
             <div class="signature-box">
                <p>L'Employé(e)</p>
                <br/><br/><br/>
             </div>
             <div class="signature-box">
                <p>Fait à ${companySettings.wilaya}, le ${today}</p>
                <p><strong>La Direction</strong></p>
                <br/><br/><br/>
                <p style="font-size: 10px;">(Cachet et Signature)</p>
             </div>
          </div>

          <div class="legal-footer">
             ${companySettings.name} - ${companySettings.legalForm} au capital de ${companySettings.capital || '-'} DA - NIS: ${companySettings.nis} - AI: ${companySettings.ai}
          </div>
          
          <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
             <button onclick="window.print()" style="padding: 10px 20px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">IMPRIMER</button>
          </div>
        </body>
        </html>
      `;
      
      const base64Content = btoa(unescape(encodeURIComponent(fullHtml)));
      const dataUrl = `data:text/html;charset=utf-8;base64,${base64Content}`;

      const newDoc: EmployeeDocument = {
          id: `GEN-${Date.now()}`,
          name: `${docTitle} - ${today}`,
          type: type === 'Avertissement' ? 'Disciplinary' : type === 'Conge' ? 'Other' : 'Certificate',
          date: new Date().toISOString().split('T')[0],
          content: dataUrl,
          isGenerated: true
      };
      
      setEditingEmp(prev => prev ? { ...prev, documents: [...(prev.documents || []), newDoc] } : null);
  };

  // --- EMPLOYEE LOGIC ---
  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const empData: Employee = {
      id: editingEmp?.id || `E-${Date.now().toString().slice(-4)}`,
      name: String(formData.get('name')),
      gender: formData.get('gender') as 'M' | 'F',
      dateOfBirth: String(formData.get('dateOfBirth')),
      placeOfBirth: String(formData.get('placeOfBirth')),
      bloodGroup: String(formData.get('bloodGroup')),
      address: String(formData.get('address')),
      position: String(formData.get('position')),
      contractType: formData.get('contractType') as any,
      email: String(formData.get('email')),
      phone: String(formData.get('phone')),
      bankRIB: String(formData.get('bankRIB')),
      baseSalary: baseSalary,
      presenceBonus: presenceBonus,
      rubriques: activeRubriques,
      cnasNumber: String(formData.get('cnasNumber')),
      joinDate: String(formData.get('joinDate')),
      familyStatus: formData.get('familyStatus') as any,
      childrenCount: Number(formData.get('childrenCount')) || 0,
      isSociallyInsured: isBaseCotisable,
      isTaxable: isBaseImposable,
      loans: editingEmp?.loans || [],
      status: editingEmp?.status || 'Active',
      documents: editingEmp?.documents || [] // Preserve documents
    };

    setEmployees(prev => {
      const exists = prev.find(e => e.id === empData.id);
      if (exists) return prev.map(emp => emp.id === empData.id ? empData : emp);
      return [...prev, empData];
    });
    
    if (editingEmp?.id) onAddLog('UPDATE', ModuleType.HR, `Mise à jour employé ${empData.name}`);
    else onAddLog('CREATE', ModuleType.HR, `Nouvel employé ${empData.name}`);

    setIsEmpModalOpen(false);
  };

  const handleArchiveEmployee = () => {
      if (!editingEmp) return;
      // Calculate STC logic could go here (Solde de Tout Compte)
      const updatedEmp: Employee = {
          ...editingEmp,
          status: 'Archived',
          exitDate: exitData.date,
          exitReason: exitData.reason,
          updatedAt: Date.now()
      };
      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
      onAddLog('UPDATE', ModuleType.HR, `Départ employé ${updatedEmp.name} (${exitData.reason})`);
      setIsArchiveModalOpen(false);
      setEditingEmp(null);
  };

  // --- PAYROLL LOGIC (Unchanged mostly) ---
  const calculatePayrollData = (emp: Employee) => {
    if (!emp) return { salairePoste: 0, gainsTotaux: 0, cnas: 0, irg: 0, net: 0, realBonus: 0, hasPenalty: false };
    
    const base = Number(emp.baseSalary) || 0;
    const rubriques = Array.isArray(emp.rubriques) ? emp.rubriques : [];
    const bonusMax = Number(emp.presenceBonus) || 0;
    const baseCot = emp.isSociallyInsured !== undefined ? emp.isSociallyInsured : true;
    const baseImp = emp.isTaxable !== undefined ? emp.isTaxable : true;

    const currentMonth = (attendanceDate || "").substring(0, 7);
    const empAttendance = (Array.isArray(attendance) ? attendance : []).filter(a => a && a.employeeId === emp.id && a.date && a.date.startsWith(currentMonth));
    
    const hasPenalty = empAttendance.some(a => a.status === 'Absent' || a.status === 'Late');
    const realBonus = hasPenalty ? 0 : bonusMax;

    // Salaire de poste = (Base si cotisable) + (primes cotisables)
    const sPosteBase = baseCot ? base : 0;
    const sPosteRubriques = rubriques.reduce((acc, r) => r && r.isCotisable ? acc + (Number(r.value) || 0) : acc, 0);
    const salairePoste = sPosteBase + sPosteRubriques + realBonus;
    
    const cnas = baseCot ? (Math.round(salairePoste * 0.09 * 100) / 100) : 0;
    const totalGains = base + rubriques.reduce((acc, r) => acc + (Number(r?.value) || 0), 0) + realBonus;

    let irg = 0;
    if (baseImp) {
      const baseImpSB = base;
      const baseImpRub = rubriques.reduce((acc, r) => r && r.isImposable ? acc + (Number(r.value) || 0) : acc, 0);
      const netImposable = Math.max(0, (baseImpSB + baseImpRub + realBonus) - cnas);

      if (netImposable > 30000) {
        if (netImposable <= 35000) {
          const irgTheorique = (netImposable - 30000) * 0.27;
          irg = Math.max(0, irgTheorique * ((netImposable - 30000) / 5000));
        } else if (netImposable <= 40000) {
          irg = (netImposable - 30000) * 0.27;
        } else if (netImposable <= 80000) {
          irg = (netImposable - 40000) * 0.30 + 2700;
        } else if (netImposable <= 120000) {
          irg = (netImposable - 80000) * 0.33 + 14700;
        } else {
          irg = (netImposable - 120000) * 0.35 + 27900;
        }
      }
    }
    
    irg = Math.round(irg);
    const netAPayer = totalGains - cnas - irg;

    return { salairePoste, gainsTotaux: totalGains, cnas, irg, net: netAPayer, realBonus, hasPenalty };
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

  const deleteEmployee = (id: string) => {
    const e = employees.find(e => e.id === id);
    if(e) {
        setEmployees(employees.filter(emp => emp.id !== id));
        onAddLog('DELETE', ModuleType.HR, `Suppression employé ${e.name}`);
    }
  }

  const simulation = useMemo(() => {
    if (!editingEmp && !baseSalary) return null;
    const dummyEmp: Employee = {
      id: editingEmp?.id || 'dummy', name: 'Simulation', gender: 'M', dateOfBirth: '', placeOfBirth: '',
      bloodGroup: '', address: '', position: '', contractType: 'CDI', email: '', phone: '', bankRIB: '',
      baseSalary: baseSalary, presenceBonus: presenceBonus, rubriques: activeRubriques, cnasNumber: '',
      joinDate: '', familyStatus: 'Single', childrenCount: 0, isSociallyInsured: isBaseCotisable,
      isTaxable: isBaseImposable, loans: [], status: 'Active', documents: []
    };
    return calculatePayrollData(dummyEmp);
  }, [baseSalary, activeRubriques, presenceBonus, isBaseCotisable, isBaseImposable, editingEmp, attendance, attendanceDate]);

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
            <button onClick={() => { setEditingEmp(null); setModalTab('info'); setIsEmpModalOpen(true); }} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all"><UserPlus size={18} className="mr-3" /> Inscrire un Employé</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print">
            {activeEmployees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-900 p-8 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500 group relative flex flex-col">
                 <div className="flex justify-between items-start mb-8">
                    <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg">{emp.name?.[0] || 'E'}</div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => { setEditingEmp(emp); setModalTab('info'); setIsEmpModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm"><Edit3 size={20} /></button>
                       <button onClick={() => { setEditingEmp(emp); setIsArchiveModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-amber-600 hover:text-amber-700 rounded-xl transition-all shadow-sm" title="Archiver / Sortie"><LogOut size={20} /></button>
                    </div>
                 </div>
                 <h3 className="font-black text-slate-950 dark:text-white text-lg leading-tight mb-2">{emp.name}</h3>
                 <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-6 border-b border-indigo-200 dark:border-indigo-900/50 pb-2">{emp.position}</p>
                 <div className="space-y-2 mb-8 flex-1">
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest"><UserIcon size={12} className="mr-2 text-indigo-600" /> {emp.contractType || 'CDI'} • {emp.isSociallyInsured ? 'Assuré CNAS' : 'Non Assuré'}</div>
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest"><Phone size={12} className="mr-2 text-indigo-600" /> {emp.phone || 'Non renseigné'}</div>
                    <div className="flex items-center text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest"><Calendar size={12} className="mr-2 text-indigo-600" /> Depuis le {emp.joinDate}</div>
                 </div>
                 <div className="bg-slate-900 dark:bg-slate-950 -mx-8 -mb-8 p-10 rounded-b-[48px] flex justify-between items-center"><div><p className="text-[10px] font-black text-indigo-300 uppercase mb-1">Salaire Net</p><p className="text-2xl font-black text-white">{formatCurrency(calculatePayrollData(emp).net)}</p></div></div>
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
                                  <button onClick={() => { setEditingEmp(emp); setModalTab('docs'); setIsEmpModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="Documents & Certificats"><FileText size={16}/></button>
                                  <button onClick={() => deleteEmployee(emp.id)} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </>
      )}

      {/* [ ... RECRUTEMENT SECTION SAME AS BEFORE ... ] */}
      {activeTab === 'recrutement' && (
        <div className="animate-in fade-in duration-300 overflow-x-auto pb-8">
            <div className="flex justify-between items-center mb-8 min-w-[1000px]">
                <div><h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Pipeline Recrutement</h2><p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Suivi des candidatures</p></div>
                <div className="flex space-x-2">
                    <button onClick={() => setIsScannerOpen(true)} className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center hover:bg-indigo-100 transition-all shadow-sm">
                        <Camera size={16} className="mr-2" /> <span className="text-[10px] font-black uppercase">Scanner CV</span>
                    </button>
                    <button onClick={() => { setEditingCandidate(null); setIsCandidateModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700 transition-all"><Plus size={16} className="mr-2" /> Nouveau Candidat</button>
                </div>
            </div>
            
            <div className="flex space-x-6 min-w-[1000px]">
                {RECRUITMENT_STAGES.filter(s => s.id !== 'Hired').map(stage => (
                    <div key={stage.id} className="w-80 flex-shrink-0">
                        <div className={`p-4 rounded-2xl mb-4 flex justify-between items-center ${stage.color} bg-opacity-20`}>
                            <h4 className="font-black uppercase text-xs tracking-widest">{stage.label}</h4>
                            <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-black">{candidates.filter(c => c.status === stage.id).length}</span>
                        </div>
                        <div className="space-y-4">
                            {candidates.filter(c => c.status === stage.id).map(c => (
                                <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-black text-slate-800 dark:text-white uppercase text-sm">{c.name}</h5>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingCandidate(c); setIsCandidateModalOpen(true); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded"><Edit3 size={14}/></button>
                                            <button onClick={() => deleteCandidate(c.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">{c.position}</p>
                                    <div className="space-y-1 mb-4">
                                        <div className="flex items-center text-[10px] text-slate-500"><Phone size={10} className="mr-2"/> {c.phone}</div>
                                        <div className="flex items-center text-[10px] text-slate-500"><Calendar size={10} className="mr-2"/> {c.applicationDate}</div>
                                    </div>
                                    
                                    {c.status === 'Offer' ? (
                                        <button onClick={() => handleHireCandidate(c)} className="w-full py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center">
                                            <Briefcase size={12} className="mr-2" /> Embaucher
                                        </button>
                                    ) : (
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700">
                                            {/* Boutons de déplacement rapide */}
                                            {c.status !== 'Rejected' && <button onClick={() => { 
                                                const nextIdx = RECRUITMENT_STAGES.findIndex(s => s.id === c.status) + 1;
                                                if (nextIdx < RECRUITMENT_STAGES.length) setCandidates(prev => prev.map(x => x.id === c.id ? {...x, status: RECRUITMENT_STAGES[nextIdx].id as any} : x));
                                            }} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 flex items-center">Étape Suivante <ArrowRight size={10} className="ml-1"/></button>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* [ ... PAIE SECTION SAME AS BEFORE ... ] */}
      {activeTab === 'paie' && (
        <div className="space-y-6">
           {view === 'attendance' ? (
             <>
               <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm gap-6">
                 <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><CalendarCheck size={24} /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registre Quotidien</h3>
                       <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">État : {isDayValidated ? 'Verrouillé' : 'Ouvert'}</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white text-xs outline-none" />
                    {!isDayValidated && activeEmployees.length > 0 && (
                      <button onClick={handleValidateDay} className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center hover:bg-emerald-700 transition-all"><CheckCircle size={16} className="mr-2" /> Valider la Journée</button>
                    )}
                    <button onClick={() => setView('list')} className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Bulletins</button>
                 </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px]">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 dark:border-slate-700">
                       <tr><th className="px-8 py-5">Collaborateur</th><th className="px-8 py-5">Statut de Présence</th><th className="px-8 py-5">Impact Paie</th><th className="px-8 py-5 text-right">Validation</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       {activeEmployees.map(emp => {
                         const rec = Array.isArray(attendance) ? attendance.find(a => a && a.employeeId === emp.id && a.date === attendanceDate) : null;
                         return (
                           <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                             <td className="px-8 py-5 font-black text-slate-900 dark:text-white text-sm">{emp.name}</td>
                             <td className="px-8 py-5"><div className="flex space-x-2">{['Present', 'Absent', 'Late'].map(st => (
                               <button key={st} disabled={isDayValidated} onClick={() => handleUpdateAttendance(emp.id, emp.name, st as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${rec?.status === st ? `bg-indigo-600 text-white shadow-md` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'} ${isDayValidated ? 'opacity-70 cursor-not-allowed' : ''}`}>{st === 'Present' ? 'Présent' : st === 'Absent' ? 'Absent' : 'Retard'}</button>
                             ))}</div></td>
                             <td className="px-8 py-5">{rec?.status === 'Absent' || rec?.status === 'Late' ? <span className="text-rose-700 dark:text-rose-400 text-[10px] font-black uppercase">Pénalité Bonus</span> : <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase">Maintenu</span>}</td>
                             <td className="px-8 py-5 text-right">{rec?.isValidated ? <div className="flex items-center justify-end text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase"><ShieldCheck size={14} className="mr-1" /> Vérifié</div> : <div className="flex items-center justify-end text-slate-500 text-[9px] font-black uppercase"><Clock size={14} className="mr-1" /> En attente</div>}</td>
                           </tr>
                         );
                       })}
                       {activeEmployees.length === 0 && (<tr><td colSpan={4} className="py-20 text-center font-black text-slate-300 dark:text-slate-700 uppercase text-xs">Aucun employé actif</td></tr>)}
                    </tbody>
                 </table>
              </div>
             </>
           ) : view === 'payslip' && selectedEmp ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20 no-print">
                <button onClick={() => setView('list')} className="flex items-center space-x-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"><ChevronLeft size={16} /> <span>Retour</span></button>
                <button onClick={() => window.print()} className="px-10 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-indigo-700 transition-all shadow-xl"><Printer size={18} className="mr-3" /> Imprimer Bulletin</button>
              </div>
              <div className="bg-white p-10 max-w-[21cm] mx-auto border-2 border-black min-h-[29.7cm] flex flex-col font-mono text-black print:p-4 print:border-none">
                 {(() => {
                    const p = calculatePayrollData(selectedEmp);
                    const today = new Date().toLocaleDateString('fr-DZ');
                    const period = attendanceDate.substring(0, 7);
                    
                    return (
                        <div className="space-y-4">
                            {/* Header PC PAIE STYLE */}
                            <div className="border-2 border-black p-4 flex justify-between items-start">
                                <div className="w-1/2 border-r-2 border-black pr-4">
                                    <h2 className="font-bold text-lg uppercase">{companySettings.name}</h2>
                                    <p className="text-xs">{companySettings.address}</p>
                                    <p className="text-xs mt-2">NIF: {companySettings.nif} - NIS: {companySettings.nis}</p>
                                </div>
                                <div className="w-1/2 pl-4">
                                    <div className="flex justify-between mb-1"><span className="font-bold">BULLETIN DE PAIE</span><span>Mois: {period}</span></div>
                                    <div className="border-t border-black pt-2 mt-2 text-xs grid grid-cols-2 gap-y-1">
                                        <span>Matricule: <strong>{selectedEmp.id.split('-').pop()}</strong></span>
                                        <span>Section: <strong>ADMIN</strong></span>
                                        <span className="col-span-2">Nom & Prénom: <strong>{selectedEmp.name}</strong></span>
                                        <span className="col-span-2">Fonction: <strong>{selectedEmp.position}</strong></span>
                                        <span>Sit. Fam: <strong>{selectedEmp.familyStatus}</strong></span>
                                        <span>Enfants: <strong>{selectedEmp.childrenCount}</strong></span>
                                        <span className="col-span-2">N° SS: <strong>{selectedEmp.cnasNumber}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Body Table PC PAIE STYLE */}
                            <div className="border-2 border-black min-h-[500px] relative">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="border-b-2 border-black">
                                        <tr>
                                            <th className="border-r border-black p-1 w-12">N°</th>
                                            <th className="border-r border-black p-1 text-left">Libellé</th>
                                            <th className="border-r border-black p-1 w-16 text-right">Base</th>
                                            <th className="border-r border-black p-1 w-12 text-center">Taux</th>
                                            <th className="border-r border-black p-1 w-24 text-right">Gains</th>
                                            <th className="p-1 w-24 text-right">Retenues</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300">
                                        <tr>
                                            <td className="border-r border-black p-1 text-center">R001</td>
                                            <td className="border-r border-black p-1 font-bold">SALAIRE DE BASE</td>
                                            <td className="border-r border-black p-1 text-right">30.00</td>
                                            <td className="border-r border-black p-1 text-center"></td>
                                            <td className="border-r border-black p-1 text-right">{formatCurrency(selectedEmp.baseSalary).replace('DZD', '')}</td>
                                            <td className="p-1 text-right"></td>
                                        </tr>
                                        {selectedEmp.rubriques.filter(r => r.value > 0).map((r, idx) => (
                                            <tr key={idx}>
                                                <td className="border-r border-black p-1 text-center">R{100+idx}</td>
                                                <td className="border-r border-black p-1 uppercase">{r.label}</td>
                                                <td className="border-r border-black p-1 text-right"></td>
                                                <td className="border-r border-black p-1 text-center"></td>
                                                <td className="border-r border-black p-1 text-right">{formatCurrency(r.value).replace('DZD', '')}</td>
                                                <td className="p-1 text-right"></td>
                                            </tr>
                                        ))}
                                        {p.realBonus > 0 && (
                                            <tr>
                                                <td className="border-r border-black p-1 text-center">R200</td>
                                                <td className="border-r border-black p-1 uppercase">PRIME DE PANIER/PRESENCE</td>
                                                <td className="border-r border-black p-1 text-right"></td>
                                                <td className="border-r border-black p-1 text-center"></td>
                                                <td className="border-r border-black p-1 text-right">{formatCurrency(p.realBonus).replace('DZD', '')}</td>
                                                <td className="p-1 text-right"></td>
                                            </tr>
                                        )}
                                        {/* Break line */}
                                        <tr><td colSpan={6} className="border-b border-black h-4"></td></tr>
                                        
                                        {/* Retenues */}
                                        <tr>
                                            <td className="border-r border-black p-1 text-center">R500</td>
                                            <td className="border-r border-black p-1 font-bold">RETENUE S.S</td>
                                            <td className="border-r border-black p-1 text-right">{formatCurrency(p.salairePoste).replace('DZD', '')}</td>
                                            <td className="border-r border-black p-1 text-center">9.00</td>
                                            <td className="border-r border-black p-1 text-right"></td>
                                            <td className="p-1 text-right">{formatCurrency(p.cnas).replace('DZD', '')}</td>
                                        </tr>
                                        <tr>
                                            <td className="border-r border-black p-1 text-center">R600</td>
                                            <td className="border-r border-black p-1 font-bold">I.R.G (Barème)</td>
                                            <td className="border-r border-black p-1 text-right">{formatCurrency(p.salairePoste - p.cnas).replace('DZD', '')}</td>
                                            <td className="border-r border-black p-1 text-center"></td>
                                            <td className="border-r border-black p-1 text-right"></td>
                                            <td className="p-1 text-right">{formatCurrency(p.irg).replace('DZD', '')}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer Totals */}
                            <div className="border-2 border-black p-2 flex justify-between items-center text-xs">
                                <div>
                                    <div className="flex gap-4">
                                        <span>Total Gains: <strong>{formatCurrency(p.gainsTotaux)}</strong></span>
                                        <span>Total Retenues: <strong>{formatCurrency(p.cnas + p.irg)}</strong></span>
                                    </div>
                                    <div className="mt-1">
                                        Mode de paiement: <strong>{selectedEmp.bankRIB ? 'VIREMENT' : 'ESPECES'}</strong>
                                    </div>
                                </div>
                                <div className="border-2 border-black px-4 py-2 bg-gray-100">
                                    <p className="font-bold text-center text-sm">NET A PAYER</p>
                                    <p className="font-black text-xl text-center">{formatCurrency(p.net)}</p>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="flex justify-between mt-8 px-8 text-xs">
                                <div className="text-center">
                                    <p className="font-bold underline mb-8">L'Employé</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold underline mb-8">L'Employeur</p>
                                    <p>Fait à {companySettings.wilaya}, le {today}</p>
                                </div>
                            </div>
                        </div>
                    );
                 })()}
              </div>
            </div>
           ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-widest">Liste de Paie</h3>
                   <button onClick={() => setView('attendance')} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Saisir Pointage</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {activeEmployees.map(emp => (
                      <div key={emp.id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm group" onClick={() => { setSelectedEmp(emp); setView('payslip'); }}>
                         <div>
                            <p className="font-black text-slate-900 dark:text-white uppercase">{emp.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">{emp.position}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-black text-indigo-600">{formatCurrency(calculatePayrollData(emp).net)}</p>
                            <span className="text-[8px] uppercase font-black text-slate-400 group-hover:text-indigo-400">Voir Fiche</span>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      )}

      {/* MODAL: Employee Form */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 no-print">
          <form onSubmit={handleSaveEmployee} className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-7xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[95vh]">
            <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl"><UserIcon size={24} /></div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-sm">{editingEmp ? 'Modifier Employé' : 'Nouveau Dossier Personnel'}</h3>
                    <p className="text-[10px] text-indigo-300 font-bold uppercase">{editingEmp?.name || 'Création'}</p>
                  </div>
               </div>
               <button type="button" onClick={() => setIsEmpModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            {/* Modal Tabs */}
            <div className="flex px-10 pt-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
               <button type="button" onClick={() => setModalTab('info')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Informations</button>
               <button type="button" onClick={() => setModalTab('contract')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'contract' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Contrat & Paie</button>
               <button type="button" onClick={() => setModalTab('docs')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Documents & Carrière</button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
              
              {/* TAB: INFO */}
              {modalTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><UserIcon size={14} className="mr-2" /> Identification</h4>
                    <div className="space-y-4">
                      <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Nom Complet</label><input name="name" required defaultValue={editingEmp?.name} placeholder="Nom et Prénom" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Genre</label><select name="gender" defaultValue={editingEmp?.gender || 'M'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Groupe Sanguin</label><select name="bloodGroup" defaultValue={editingEmp?.bloodGroup || 'O+'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Date de Naissance</label><input type="date" name="dateOfBirth" defaultValue={editingEmp?.dateOfBirth} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Lieu de Naissance</label><input name="placeOfBirth" defaultValue={editingEmp?.placeOfBirth} placeholder="Ville / Wilaya" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><MapPin size={14} className="mr-2" /> Coordonnées & Famille</h4>
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Situation Familiale</label><select name="familyStatus" defaultValue={editingEmp?.familyStatus || 'Single'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="Single">Célibataire</option><option value="Married">Marié(e)</option><option value="Divorced">Divorcé(e)</option></select></div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Nombre d'enfants</label><input type="number" name="childrenCount" defaultValue={editingEmp?.childrenCount || 0} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                      </div>
                      <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Adresse Domicile</label><textarea name="address" defaultValue={editingEmp?.address} placeholder="Quartier, Commune, Wilaya" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none h-20" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Téléphone</label><input name="phone" defaultValue={editingEmp?.phone} placeholder="05/06/07..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Email</label><input type="email" name="email" defaultValue={editingEmp?.email} placeholder="email@domaine.dz" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CONTRACT & PAYROLL */}
              {modalTab === 'contract' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                      <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><FileBadge size={14} className="mr-2" /> Contrat & Admin</h4>
                      <div className="space-y-4">
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Poste / Fonction</label><input name="position" required defaultValue={editingEmp?.position} placeholder="Ex: Chef de Projet" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Type Contrat</label><select name="contractType" defaultValue={editingEmp?.contractType || 'CDI'} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="CTA">CTA</option><option value="Autre">Autre</option></select></div>
                          <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Date d'entrée</label><input type="date" name="joinDate" defaultValue={editingEmp?.joinDate} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                        </div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">N° Sécurité Sociale (CNAS)</label><input name="cnasNumber" required defaultValue={editingEmp?.cnasNumber} placeholder="12 chiffres" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 border rounded-2xl font-mono text-sm font-black text-slate-950 dark:text-white outline-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Coordonnées Bancaires (RIB)</label><input name="bankRIB" defaultValue={editingEmp?.bankRIB} placeholder="RIB ou Compte CCP" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-900 dark:text-white outline-none" /></div>
                      </div>
                      
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                         <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center"><LifeBuoy size={14} className="mr-2" /> Options de Paie</h4>
                         <div className="space-y-3">
                            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-indigo-50 transition-colors">
                              <input type="checkbox" checked={isBaseCotisable} onChange={e => setIsBaseCotisable(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
                              <div><span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Cotisable (CNAS 9%)</span></div>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-indigo-50 transition-colors">
                              <input type="checkbox" checked={isBaseImposable} onChange={e => setIsBaseImposable(e.target.checked)} className="w-5 h-5 accent-indigo-600" />
                              <div><span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Imposable (IRG)</span></div>
                            </label>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8 bg-slate-900 dark:bg-slate-950 p-8 rounded-[32px] shadow-xl text-white">
                      <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center"><Calculator size={14} className="mr-2" /> Structure de Paie</h4>
                      <div className="space-y-6">
                         <div className="space-y-1"><label className="text-[9px] font-black text-indigo-300 uppercase ml-1">Salaire de Base Mensuel (DZD)</label><input type="number" value={baseSalary || ''} onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)} className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl font-black text-3xl text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/30" /></div>
                         <div className="space-y-1"><label className="text-[9px] font-black text-indigo-300 uppercase ml-1">Prime de Présence Max (DZD)</label><input type="number" value={presenceBonus || ''} onChange={(e) => setPresenceBonus(parseFloat(e.target.value) || 0)} className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl font-black text-xl text-white outline-none focus:ring-4 focus:ring-indigo-500/30" /></div>
                      </div>

                      {/* RUBRICS MANAGER */}
                      <div className="pt-4 border-t border-white/10">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Coins size={12} className="mr-2"/> Éléments Variables & Primes</h5>
                          
                          {/* Add Rubric */}
                          <div className="flex gap-2 mb-4">
                              <select 
                                value={selectedRubricId} 
                                onChange={(e) => setSelectedRubricId(e.target.value)} 
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none text-white"
                              >
                                  <option value="">+ Ajouter une rubrique...</option>
                                  {COMMON_RUBRIQUES.filter(r => !activeRubriques.find(ar => ar.id === r.id)).map(r => (
                                      <option key={r.id} value={r.id}>{r.label}</option>
                                  ))}
                              </select>
                              <button type="button" onClick={handleAddRubrique} disabled={!selectedRubricId} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all"><Plus size={16}/></button>
                          </div>

                          {/* List Rubrics */}
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                              {activeRubriques.map(rubric => (
                                  <div key={rubric.id} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10">
                                      <div className="flex-1 min-w-0">
                                          <p className="text-[10px] font-bold text-slate-300 truncate">{rubric.label}</p>
                                          <div className="flex space-x-2 text-[8px] text-slate-500 uppercase">
                                              {rubric.isCotisable && <span>Cotisable</span>}
                                              {rubric.isImposable && <span>Imposable</span>}
                                          </div>
                                      </div>
                                      <input 
                                        type="number" 
                                        value={rubric.value} 
                                        onChange={(e) => handleUpdateRubriqueValue(rubric.id, parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-transparent text-right font-black text-sm text-white outline-none border-b border-white/20 focus:border-indigo-500 mx-2"
                                        placeholder="0.00"
                                      />
                                      <button type="button" onClick={() => handleRemoveRubrique(rubric.id)} className="text-rose-400 hover:text-rose-300 p-1"><X size={12}/></button>
                                  </div>
                              ))}
                              {activeRubriques.length === 0 && <p className="text-[10px] text-slate-500 text-center py-2">Aucune prime additionnelle</p>}
                          </div>
                      </div>

                      <div className="mt-4 p-6 bg-indigo-600 rounded-3xl shadow-2xl relative overflow-hidden"><div className="relative z-10"><p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2 opacity-80 text-white">Net à payer simulé</p><p className="text-4xl font-black tracking-tighter text-white">{formatCurrency(simulation?.net || 0)}</p></div></div>
                   </div>
                </div>
              )}

              {/* TAB: DOCUMENTS & CAREER */}
              {modalTab === 'docs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[600px]">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center"><FolderOpen size={14} className="mr-2" /> Dossier Numérique</h4>
                         <div className="flex space-x-2">
                            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.jpg,.png" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"><Upload size={16} /></button>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                         {(editingEmp?.documents || []).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                               <FileText size={48} className="mb-4" />
                               <p className="text-xs font-black uppercase">Dossier Vide</p>
                            </div>
                         ) : (
                            (editingEmp?.documents || []).map(doc => (
                               <div key={doc.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-500 transition-colors">
                                  <div className="flex items-center space-x-3 overflow-hidden">
                                     <div className={`p-2 rounded-lg ${doc.isGenerated ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}><FileText size={16} /></div>
                                     <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-800 dark:text-white truncate">{doc.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{doc.date} • {doc.type}</p>
                                     </div>
                                  </div>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     {doc.content && <button type="button" onClick={() => { 
                                         const win = window.open(); 
                                         if(win) win.document.write(`<iframe src="${doc.content}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                     }} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Eye size={14}/></button>}
                                     <button type="button" onClick={() => handleDeleteDocument(doc.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg"><Trash2 size={14}/></button>
                                  </div>
                               </div>
                            ))
                         )}
                      </div>
                   </div>

                   <div className="space-y-8 bg-slate-900 dark:bg-slate-950 p-8 rounded-[32px] shadow-xl text-white flex flex-col">
                      <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center"><ScrollText size={14} className="mr-2" /> Guichet Administratif</h4>
                      <p className="text-[10px] text-slate-400 font-medium mb-6 leading-relaxed">Générez instantanément les documents officiels pour cet employé. Les documents signés numériquement sont ajoutés au dossier.</p>
                      
                      <div className="grid grid-cols-1 gap-4">
                         <button type="button" onClick={() => generateDocument('Attestation')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                            <div className="flex items-center space-x-3">
                               <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Briefcase size={16} /></div>
                               <span className="text-xs font-black uppercase">Attestation de Travail</span>
                            </div>
                            <Printer size={16} className="text-white/50 group-hover:text-white" />
                         </button>
                         
                         <button type="button" onClick={() => generateDocument('Conge')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                            <div className="flex items-center space-x-3">
                               <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Calendar size={16} /></div>
                               <span className="text-xs font-black uppercase">Titre de Congé</span>
                            </div>
                            <Printer size={16} className="text-white/50 group-hover:text-white" />
                         </button>

                         <button type="button" onClick={() => generateDocument('Avertissement')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                            <div className="flex items-center space-x-3">
                               <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><AlertCircle size={16} /></div>
                               <span className="text-xs font-black uppercase">Avertissement / Blâme</span>
                            </div>
                            <Printer size={16} className="text-white/50 group-hover:text-white" />
                         </button>
                      </div>
                   </div>
                </div>
              )}

            </div>

            <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-4 shrink-0 shadow-lg"><button type="button" onClick={() => setIsEmpModalOpen(false)} className="px-10 py-4 text-slate-700 dark:text-slate-400 font-black hover:text-slate-900 dark:hover:text-white text-xs uppercase tracking-widest transition-all">Annuler</button><button type="submit" className="px-16 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"><Save size={20} className="mr-3" /> Enregistrer Dossier</button></div>
          </form>
        </div>
      )}

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
