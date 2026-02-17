
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, MapPin, FileBadge, LifeBuoy, Calculator, Coins, Plus, X, FolderOpen, Upload, FileText, Eye, Trash2, ScrollText, Briefcase, Calendar, AlertCircle, Printer, Save, FileCheck, Banknote, CreditCard } from 'lucide-react';
import { Employee, SalaryRubrique, CompanySettings, EmployeeDocument, EmployeeLoan } from '../../../types';
import { COMMON_RUBRIQUES } from '../constants';
import { formatCurrency } from '../../../constants';
import { calculatePayrollData, generateDocumentHtml } from '../utils';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEmp: Employee | null;
  onSave: (emp: Employee) => void;
  companySettings: CompanySettings;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, editingEmp, onSave, companySettings }) => {
  const [modalTab, setModalTab] = useState<'info' | 'contract' | 'docs'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [activeRubriques, setActiveRubriques] = useState<SalaryRubrique[]>([]);
  const [activeLoans, setActiveLoans] = useState<EmployeeLoan[]>([]);
  const [selectedRubricId, setSelectedRubricId] = useState<string>("");
  
  // New Loan State
  const [newLoan, setNewLoan] = useState<Partial<EmployeeLoan>>({ amount: 0, monthlyPayment: 0, reason: 'Avance sur salaire', status: 'Approved' });

  // Initialize state when editingEmp changes or modal opens
  useEffect(() => {
    if (isOpen) {
        if (editingEmp) {
            setFormData(editingEmp);
            setActiveRubriques(editingEmp.rubriques || []);
            setActiveLoans(editingEmp.loans || []);
        } else {
            // Defaults for new employee
            setFormData({
                gender: 'M',
                familyStatus: 'Single',
                childrenCount: 0,
                contractType: 'CDI',
                baseSalary: 30000,
                presenceBonus: 0,
                isSociallyInsured: true,
                isTaxable: true,
                documents: []
            });
            // Default rubrics
            const defaults = COMMON_RUBRIQUES.filter(r => ['PANIER', 'TRANSPORT', 'IEP'].includes(r.id)).map(r => ({...r, value: 0}));
            setActiveRubriques(defaults);
            setActiveLoans([]);
        }
        setModalTab('info');
    }
  }, [isOpen, editingEmp]);

  const simulation = useMemo(() => {
      const dummyEmp = { ...formData, rubriques: activeRubriques, loans: activeLoans } as Employee;
      return calculatePayrollData(dummyEmp, [], new Date().toISOString(), companySettings);
  }, [formData, activeRubriques, activeLoans, companySettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      let val: any = value;
      if (type === 'number') val = parseFloat(value) || 0;
      if (type === 'checkbox') val = (e.target as HTMLInputElement).checked;
      
      setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleAddRubrique = () => {
      if (!selectedRubricId) return;
      const template = COMMON_RUBRIQUES.find(r => r.id === selectedRubricId);
      if (template) {
          if (activeRubriques.find(r => r.id === template.id)) {
              alert("Cette rubrique existe déjà.");
              return;
          }
          setActiveRubriques(prev => [...prev, { ...template, value: 0 }]);
          setSelectedRubricId("");
      }
  };

  const handleUpdateRubrique = (id: string, value: number) => {
      setActiveRubriques(prev => prev.map(r => r.id === id ? { ...r, value } : r));
  };

  const handleRemoveRubrique = (id: string) => {
      setActiveRubriques(prev => prev.filter(r => r.id !== id));
  };

  const handleAddLoan = () => {
      if (!newLoan.amount || !newLoan.monthlyPayment) return alert("Montant et mensualité requis.");
      const loan: EmployeeLoan = {
          id: `LN-${Date.now()}`,
          amount: newLoan.amount || 0,
          monthlyPayment: newLoan.monthlyPayment || 0,
          reason: newLoan.reason || 'Avance',
          date: new Date().toISOString().split('T')[0],
          status: 'Approved'
      };
      setActiveLoans(prev => [...prev, loan]);
      setNewLoan({ amount: 0, monthlyPayment: 0, reason: 'Avance sur salaire', status: 'Approved' });
  };

  const handleRemoveLoan = (id: string) => {
      if(confirm("Supprimer ce prêt ?")) {
          setActiveLoans(prev => prev.filter(l => l.id !== id));
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
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
              setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), newDoc] }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateDoc = (type: 'Attestation' | 'Conge' | 'Avertissement' | 'ATS' | 'Certificat') => {
      let extraData = {};
      if (type === 'Conge') {
          const startStr = prompt("Date de début (JJ/MM/AAAA) :", new Date().toLocaleDateString('fr-DZ'));
          const endStr = prompt("Date de fin (JJ/MM/AAAA) :");
          if (!startStr || !endStr) return;
          extraData = { startStr, endStr };
      } else if (type === 'Avertissement') {
          const motif = prompt("Motif :", "Absences injustifiées");
          if (!motif) return;
          extraData = { motif };
      }

      const fullHtml = generateDocumentHtml(type, formData as Employee, companySettings, extraData);
      const base64Content = btoa(unescape(encodeURIComponent(fullHtml)));
      const dataUrl = `data:text/html;charset=utf-8;base64,${base64Content}`;

      const newDoc: EmployeeDocument = {
          id: `GEN-${Date.now()}`,
          name: `${type} - ${new Date().toLocaleDateString()}`,
          type: type === 'Avertissement' ? 'Disciplinary' : type === 'Conge' ? 'Other' : 'Certificate',
          date: new Date().toISOString().split('T')[0],
          content: dataUrl,
          isGenerated: true
      };
      setFormData(prev => ({ ...prev, documents: [...(prev.documents || []), newDoc] }));
  };

  const handleDeleteDoc = (id: string) => {
      if(confirm("Supprimer ce document ?")) {
          setFormData(prev => ({ ...prev, documents: (prev.documents || []).filter(d => d.id !== id) }));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const finalEmp: Employee = {
          ...(formData as Employee),
          id: formData.id || `E-${Date.now().toString().slice(-4)}`,
          rubriques: activeRubriques,
          loans: activeLoans,
          updatedAt: Date.now(),
          status: formData.status || 'Active'
      };
      onSave(finalEmp);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 no-print">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-7xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col h-[95vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between shrink-0">
           <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-2xl"><User size={24} /></div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm">{editingEmp ? 'Modifier Employé' : 'Nouveau Dossier Personnel'}</h3>
                <p className="text-[10px] text-indigo-300 font-bold uppercase">{formData.name || 'Création'}</p>
              </div>
           </div>
           <button type="button" onClick={onClose} className="p-3 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        {/* Tabs */}
        <div className="flex px-10 pt-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
           <button type="button" onClick={() => setModalTab('info')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Informations</button>
           <button type="button" onClick={() => setModalTab('contract')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'contract' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Contrat & Paie</button>
           <button type="button" onClick={() => setModalTab('docs')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${modalTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Documents & Carrière</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
          
          {/* TAB: INFO */}
          {modalTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Identification */}
              <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><User size={14} className="mr-2" /> Identification</h4>
                <div className="space-y-4">
                  <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Nom Complet</label><input name="name" required value={formData.name || ''} onChange={handleInputChange} placeholder="Nom et Prénom" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Genre</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Groupe Sanguin</label><select name="bloodGroup" value={formData.bloodGroup || 'O+'} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Date de Naissance</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Lieu de Naissance</label><input name="placeOfBirth" value={formData.placeOfBirth || ''} onChange={handleInputChange} placeholder="Ville / Wilaya" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                  </div>
                </div>
              </div>
              
              {/* Coordonnées */}
              <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><MapPin size={14} className="mr-2" /> Coordonnées & Famille</h4>
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Situation Familiale</label><select name="familyStatus" value={formData.familyStatus} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="Single">Célibataire</option><option value="Married">Marié(e)</option><option value="Divorced">Divorcé(e)</option></select></div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Nombre d'enfants</label><input type="number" name="childrenCount" value={formData.childrenCount} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                  </div>
                  <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Adresse Domicile</label><textarea name="address" value={formData.address || ''} onChange={handleInputChange} placeholder="Quartier, Commune, Wilaya" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none h-20" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Téléphone</label><input name="phone" value={formData.phone || ''} onChange={handleInputChange} placeholder="05/06/07..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} placeholder="email@domaine.dz" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTRACT */}
          {modalTab === 'contract' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center"><FileBadge size={14} className="mr-2" /> Contrat & Admin</h4>
                  <div className="space-y-4">
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Poste / Fonction</label><input name="position" required value={formData.position || ''} onChange={handleInputChange} placeholder="Ex: Chef de Projet" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Type Contrat</label><select name="contractType" value={formData.contractType} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none"><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="CTA">CTA</option><option value="Autre">Autre</option></select></div>
                      <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Date d'entrée</label><input type="date" name="joinDate" value={formData.joinDate || ''} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" /></div>
                    </div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">N° Sécurité Sociale (CNAS)</label><input name="cnasNumber" required value={formData.cnasNumber || ''} onChange={handleInputChange} placeholder="12 chiffres" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 border rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white outline-none" /></div>
                    <div><label className="block text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase mb-2 ml-1">Coordonnées Bancaires (RIB)</label><input name="bankRIB" value={formData.bankRIB || ''} onChange={handleInputChange} placeholder="RIB ou Compte CCP" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl font-mono text-xs font-bold text-slate-900 dark:text-white outline-none" /></div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                     <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-4 flex items-center"><LifeBuoy size={14} className="mr-2" /> Options de Paie</h4>
                     <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-indigo-50 transition-colors">
                          <input type="checkbox" name="isSociallyInsured" checked={formData.isSociallyInsured} onChange={handleInputChange} className="w-5 h-5 accent-indigo-600" />
                          <div><span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Cotisable (CNAS 9%)</span></div>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-indigo-50 transition-colors">
                          <input type="checkbox" name="isTaxable" checked={formData.isTaxable} onChange={handleInputChange} className="w-5 h-5 accent-indigo-600" />
                          <div><span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">Imposable (IRG)</span></div>
                        </label>
                     </div>
                  </div>
               </div>

               <div className="space-y-8 bg-slate-900 dark:bg-slate-950 p-8 rounded-[32px] shadow-xl text-white">
                  <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest border-b border-white/10 pb-3 flex items-center"><Calculator size={14} className="mr-2" /> Structure de Paie</h4>
                  <div className="space-y-6">
                     <div className="space-y-1"><label className="text-[9px] font-black text-indigo-300 uppercase ml-1">Salaire de Base Mensuel</label><input type="number" name="baseSalary" value={formData.baseSalary} onChange={handleInputChange} className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl font-black text-3xl text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/30" /></div>
                     <div className="space-y-1"><label className="text-[9px] font-black text-indigo-300 uppercase ml-1">Prime de Présence Max</label><input type="number" name="presenceBonus" value={formData.presenceBonus} onChange={handleInputChange} className="w-full px-6 py-4 bg-white/5 border border-white/20 rounded-2xl font-black text-xl text-white outline-none focus:ring-4 focus:ring-indigo-500/30" /></div>
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
                              <option value="" className="text-black">+ Ajouter une rubrique...</option>
                              {COMMON_RUBRIQUES.filter(r => !activeRubriques.find(ar => ar.id === r.id)).map(r => (
                                  <option key={r.id} value={r.id} className="text-black">{r.label}</option>
                              ))}
                          </select>
                          <button type="button" onClick={handleAddRubrique} disabled={!selectedRubricId} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all"><Plus size={16}/></button>
                      </div>

                      {/* List Rubrics Grid */}
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1 bg-white/5 rounded-2xl p-2 border border-white/10">
                          {activeRubriques.length > 0 ? (
                              <table className="w-full text-left border-collapse">
                                <thead className="text-[8px] font-black uppercase text-indigo-300 border-b border-white/10">
                                    <tr>
                                        <th className="p-2">Libellé</th>
                                        <th className="p-2 w-16 text-center">Type</th>
                                        <th className="p-2 w-24 text-right">Montant/Qté</th>
                                        <th className="p-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs">
                                    {activeRubriques.map(rubric => (
                                      <tr key={rubric.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                          <td className="p-2">
                                              <p className="font-bold text-white truncate max-w-[150px]">{rubric.label}</p>
                                              <p className="text-[8px] text-slate-400 font-mono">
                                                  {rubric.isCotisable ? 'Cot.' : ''} {rubric.isImposable ? 'Imp.' : ''}
                                              </p>
                                          </td>
                                          <td className="p-2 text-center">
                                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${rubric.type === 'fixed' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'}`}>
                                                  {rubric.type === 'fixed' ? 'Fixe' : 'Var.'}
                                              </span>
                                          </td>
                                          <td className="p-2 text-right">
                                              <input 
                                                type="number" 
                                                value={rubric.value} 
                                                onChange={(e) => handleUpdateRubrique(rubric.id, parseFloat(e.target.value) || 0)}
                                                className="w-20 bg-transparent text-right font-black text-white outline-none border-b border-white/20 focus:border-indigo-500"
                                                placeholder={rubric.id.startsWith('HS') ? "Heures" : "0.00"}
                                              />
                                          </td>
                                          <td className="p-2 text-center">
                                              <button type="button" onClick={() => handleRemoveRubrique(rubric.id)} className="text-rose-400 hover:text-rose-300 opacity-50 group-hover:opacity-100"><X size={12}/></button>
                                          </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                          ) : (
                              <p className="text-[10px] text-slate-500 text-center py-4">Aucune prime additionnelle</p>
                          )}
                      </div>
                  </div>

                  {/* SECTION PRÊTS ET AVANCES */}
                  <div className="pt-4 border-t border-white/10">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center"><Banknote size={12} className="mr-2"/> Prêts & Avances</h5>
                      
                      {/* Add Loan */}
                      <div className="flex gap-2 mb-4 items-center">
                          <input type="number" placeholder="Montant" value={newLoan.amount || ''} onChange={e => setNewLoan({...newLoan, amount: parseFloat(e.target.value)})} className="w-24 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none text-white" />
                          <input type="number" placeholder="Mensualité" value={newLoan.monthlyPayment || ''} onChange={e => setNewLoan({...newLoan, monthlyPayment: parseFloat(e.target.value)})} className="w-24 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold outline-none text-white" />
                          <button type="button" onClick={handleAddLoan} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all"><Plus size={16}/></button>
                      </div>

                      {/* List Loans */}
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1 bg-white/5 rounded-2xl p-2 border border-white/10">
                          {activeLoans.length > 0 ? (
                              activeLoans.map(loan => (
                                <div key={loan.id} className="flex justify-between items-center p-2 border-b border-white/5 last:border-0 hover:bg-white/5">
                                    <div>
                                        <p className="text-xs font-bold text-white">{loan.reason}</p>
                                        <p className="text-[9px] text-slate-400">Total: {formatCurrency(loan.amount)} • Reste: {formatCurrency(loan.amount)}</p>
                                    </div>
                                    <div className="text-right flex items-center gap-2">
                                        <p className="text-xs font-black text-rose-400">-{formatCurrency(loan.monthlyPayment)}/mois</p>
                                        <button onClick={() => handleRemoveLoan(loan.id)} className="text-slate-500 hover:text-rose-400"><X size={12}/></button>
                                    </div>
                                </div>
                              ))
                          ) : (
                              <p className="text-[10px] text-slate-500 text-center py-4">Aucun prêt en cours</p>
                          )}
                      </div>
                  </div>

                  <div className="mt-4 p-4 bg-indigo-600 rounded-3xl shadow-2xl relative overflow-hidden flex justify-between items-center">
                      <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-70 text-indigo-200">Salaire de Poste (Base Cotisable)</p>
                          <p className="text-lg font-black tracking-tight text-white">{formatCurrency(simulation?.salairePoste || 0)}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 text-white">Net à payer</p>
                          <p className="text-2xl font-black tracking-tighter text-white">{formatCurrency(simulation?.net || 0)}</p>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {modalTab === 'docs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* ... (Code documents inchangé) ... */}
               <div className="space-y-8 bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[600px]">
                  <div className="flex justify-between items-center mb-4">
                     <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center"><FolderOpen size={14} className="mr-2" /> Dossier Numérique</h4>
                     <div className="flex space-x-2">
                        <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.jpg,.png" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"><Upload size={16} /></button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                     {(formData.documents || []).length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                           <FileText size={48} className="mb-4" />
                           <p className="text-xs font-black uppercase">Dossier Vide</p>
                        </div>
                     ) : (
                        (formData.documents || []).map(doc => (
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
                                 <button type="button" onClick={() => handleDeleteDoc(doc.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg"><Trash2 size={14}/></button>
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
                     <button type="button" onClick={() => handleGenerateDoc('Attestation')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Briefcase size={16} /></div>
                           <span className="text-xs font-black uppercase">Attestation de Travail</span>
                        </div>
                        <Printer size={16} className="text-white/50 group-hover:text-white" />
                     </button>
                     
                     <button type="button" onClick={() => handleGenerateDoc('Certificat')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><FileCheck size={16} /></div>
                           <span className="text-xs font-black uppercase">Certificat de Travail</span>
                        </div>
                        <Printer size={16} className="text-white/50 group-hover:text-white" />
                     </button>

                     <button type="button" onClick={() => handleGenerateDoc('Conge')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Calendar size={16} /></div>
                           <span className="text-xs font-black uppercase">Titre de Congé</span>
                        </div>
                        <Printer size={16} className="text-white/50 group-hover:text-white" />
                     </button>

                     <button type="button" onClick={() => handleGenerateDoc('ATS')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
                        <div className="flex items-center space-x-3">
                           <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><FileCheck size={16} /></div>
                           <span className="text-xs font-black uppercase">ATS (CNAS)</span>
                        </div>
                        <Printer size={16} className="text-white/50 group-hover:text-white" />
                     </button>

                     <button type="button" onClick={() => handleGenerateDoc('Avertissement')} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between group transition-all">
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

        {/* Footer */}
        <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-4 shrink-0 shadow-lg">
            <button type="button" onClick={onClose} className="px-10 py-4 text-slate-700 dark:text-slate-400 font-black hover:text-slate-900 dark:hover:text-white text-xs uppercase tracking-widest transition-all">Annuler</button>
            <button type="submit" className="px-16 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"><Save size={20} className="mr-3" /> Enregistrer Dossier</button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeModal;
