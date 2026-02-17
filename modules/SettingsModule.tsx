
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, Building, RefreshCw, Trash2, ShieldCheck, Database, Server, Laptop, Activity, 
  Download, Upload, AlertTriangle, Globe, FolderOpen, Network, ShieldAlert, CheckCircle2, 
  Image as ImageIcon, MapPin, Languages, Palette, Smartphone, Clock, HardDrive, Key, 
  FileDown, FileUp, LogOut, LockKeyhole, Usb, ExternalLink, Moon, Sun, Monitor, Shield, 
  CreditCard, Phone, Mail, Coins, Camera, FileText, Settings2, Hash, History, UserMinus,
  Package, Watch, Calculator, CalendarCheck
} from 'lucide-react';
import { CompanySettings, LicenseInfo, SessionInfo, ModuleType } from '../types';
import { Language, translations } from '../translations';
import { ThemeType } from '../App';
import { formatCurrency } from '../constants';
import OCRScanner from '../components/OCRScanner';

interface SettingsModuleProps {
  license: LicenseInfo | null;
  setLicense: (license: LicenseInfo | null) => void;
  googleAccessToken: string | null;
  onManualSync: (token: string) => Promise<boolean>;
  databaseId: string;
  cloudStatus: string;
  fileName: string;
  onResetCloud: () => void;
  activeSessions?: SessionInfo[];
  settings: CompanySettings;
  setSettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  dirHandle: any;
  setDirHandle: (handle: any) => Promise<void>;
  onRestoreBackup: (data: any) => void;
  appLanguage: Language;
  setAppLanguage: (lang: Language) => void;
  appTheme: ThemeType;
  setAppTheme: (theme: ThemeType) => void;
}

const ALGERIA_WILAYAS = [
  "01 Adrar", "02 Chlef", "03 Laghouat", "04 Oum El Bouaghi", "05 Batna", "06 Béjaïa", "07 Biskra", "08 Béchar", "09 Blida", "10 Bouira", 
  "11 Tamanrasset", "12 Tébessa", "13 Tlemcen", "14 Tiaret", "15 Tizi Ouzou", "16 Alger", "17 Djelfa", "18 Jijel", "19 Sétif", "20 Saïda", 
  "21 Skikda", "22 Sidi Bel Abbès", "23 Annaba", "24 Guelma", "25 Constantine", "26 Médéa", "27 Mostaganem", "28 M'Sila", "29 Mascara", "30 Ouargla", 
  "31 Oran", "32 El Bayadh", "33 Illizi", "34 Bordj Bou Arreridj", "35 Boumerdès", "36 El Tarf", "37 Tindouf", "38 Tissemsilt", "39 El Oued", "40 Khenchela", 
  "41 Souk Ahras", "42 Tipaza", "43 Mila", "44 Aïn Defla", "45 Naâma", "46 Aïn Témouchent", "47 Ghardaïa", "48 Relizane", "49 El M'Ghair", "50 El Meniaa",
  "51 Ouled Djellal", "52 Bordj Baji Mokhtar", "53 Béni Abbès", "54 Timimoun", "55 Touggourt", "56 Djanet", "57 In Salah", "58 In Guezzam"
];

const SettingsModule: React.FC<SettingsModuleProps> = ({ 
  license, setLicense, settings, setSettings, activeSessions = [], dirHandle, setDirHandle, onRestoreBackup,
  appLanguage, setAppLanguage, appTheme, setAppTheme
}) => {
  const [activeTab, setActiveTab] = useState<'network' | 'database' | 'company' | 'schedule' | 'appearance' | 'maintenance' | 'devices'>('company');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<CompanySettings>(settings);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const t = translations[appLanguage];
  const isRtl = appLanguage === 'ar';

  const dbStats = useMemo(() => {
    const getCount = (key: string) => {
        try {
            const data = localStorage.getItem(`dz_data_${key}`);
            return data ? JSON.parse(data).length : 0;
        } catch { return 0; }
    };
    return {
        clients: getCount('clients'),
        products: getCount('products'),
        invoices: getCount('invoices'),
        transactions: getCount('transactions'),
        logs: getCount('audit_logs')
    };
  }, []);

  const handleSaveCompany = () => {
    setIsSaving(true);
    setTimeout(() => {
      setSettings(currentEdit);
      localStorage.setItem('company_settings', JSON.stringify(currentEdit));
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 800);
  };

  const handleDeactivateLicense = () => {
    const msg = isRtl 
      ? "هل تريد حقاً إلغاء تنشيط الترخيص على هذا الجهاز؟" 
      : "Voulez-vous vraiment désactiver la licence sur ce terminal ? Cette action est irréversible localement.";
    if (confirm(msg)) {
      localStorage.removeItem('erp_license');
      setLicense(null);
      window.location.reload();
    }
  };

  const handleSelectBackupDir = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await setDirHandle(handle);
    } catch (err) { console.error(err); }
  };

  const handleExportData = () => {
    const allData: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('dz_data_') || key === 'company_settings') {
        const val = localStorage.getItem(key);
        try { allData[key] = JSON.parse(val || '{}'); } catch { allData[key] = val; }
      }
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DZ_ERP_MASTER_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleScanComplete = (data: any) => {
    setCurrentEdit(prev => ({
        ...prev,
        name: data.name || prev.name,
        address: data.address || prev.address,
        rc: data.rc || prev.rc,
        nif: data.nif || prev.nif,
        ai: data.ai || prev.ai,
        nis: data.nis || prev.nis,
        phone: data.phone || prev.phone,
        email: data.email || prev.email
    }));
    setIsScannerOpen(false);
  };

  const themes: { id: ThemeType; label: string; color: string }[] = [
    { id: 'indigo', label: t.theme_indigo, color: 'bg-indigo-600' },
    { id: 'emerald', label: t.theme_emerald, color: 'bg-emerald-600' },
    { id: 'rose', label: t.theme_rose, color: 'bg-rose-600' },
    { id: 'midnight', label: t.theme_midnight, color: 'bg-slate-900' },
    { id: 'slate', label: t.theme_slate, color: 'bg-slate-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Navigation Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 w-full md:w-fit no-print overflow-x-auto no-scrollbar">
         {[
           { id: 'company', label: isRtl ? 'المؤسسة' : 'Établissement', icon: <Building size={16} /> },
           { id: 'schedule', label: 'Horaires & Pointage', icon: <CalendarCheck size={16} /> },
           { id: 'appearance', label: t.appearance, icon: <Palette size={16} /> },
           { id: 'network', label: isRtl ? 'الشبكة' : 'Réseau Hub', icon: <Network size={16} /> },
           { id: 'devices', label: 'Périphériques', icon: <Watch size={16} /> },
           { id: 'database', label: isRtl ? 'البيانات' : 'Données', icon: <Database size={16} /> },
           { id: 'maintenance', label: isRtl ? 'الأمان' : 'Sécurité', icon: <ShieldAlert size={16} /> },
         ].map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center space-x-3 rtl:space-x-reverse px-6 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
             {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
           </button>
         ))}
      </div>

      {activeTab === 'company' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-8 md:p-12 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-center space-x-5 rtl:space-x-reverse">
                    <div className="p-4 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-600/20"><Building size={32} /></div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter">{isRtl ? 'هوية المؤسسة' : 'Profil de l\'Entreprise'}</h3>
                       <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Identification Légale & Documents</p>
                    </div>
                 </div>
                 <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setIsScannerOpen(true)} className="px-6 py-4 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center">
                        <Camera size={16} className="mr-2" /> Scanner RC/NIF
                    </button>
                    <button onClick={handleSaveCompany} disabled={isSaving} className={`flex items-center px-12 py-5 ${saveSuccess ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-600 shadow-indigo-600/30'} text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50`}>
                        {isSaving ? <RefreshCw size={18} className="mr-3 animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} className="mr-3" /> : <Save size={18} className="mr-3" />} {isRtl ? 'حفظ البيانات' : 'Sauvegarder'}
                    </button>
                 </div>
              </div>
              
              <div className="p-8 md:p-12 space-y-12">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="flex flex-col items-center space-y-8">
                       <div className="w-full aspect-square max-w-[280px] bg-slate-50 dark:bg-slate-800 rounded-[64px] border-4 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden group shadow-inner">
                          {currentEdit.logoUrl ? <img src={currentEdit.logoUrl} alt="Logo" className="w-full h-full object-contain p-8" /> : <ImageIcon size={80} className="text-slate-200" />}
                          <label className="absolute inset-0 bg-indigo-600/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                             <ImageIcon size={40} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={e => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setCurrentEdit({...currentEdit, logoUrl: reader.result as string});
                                 reader.readAsDataURL(file);
                               }
                             }} />
                          </label>
                       </div>
                       <div className="text-center">
                          <h4 className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Identité Visuelle</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Format recommandé : PNG 512px</p>
                       </div>
                    </div>

                    <div className="lg:col-span-2 space-y-10">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Raison Sociale (Nom)</label>
                             <input value={currentEdit.name} onChange={e => setCurrentEdit({...currentEdit, name: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all uppercase" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Forme Juridique</label>
                             <select value={currentEdit.legalForm} onChange={e => setCurrentEdit({...currentEdit, legalForm: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none"><option value="SARL">SARL</option><option value="EURL">EURL</option><option value="SPA">SPA</option><option value="SNC">SNC</option><option value="SCS">SCS</option><option value="ETS">ETS (Personne Physique)</option></select>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center"><MapPin size={12} className="mr-2" /> Adresse du Siège</label>
                          <input value={currentEdit.address} onChange={e => setCurrentEdit({...currentEdit, address: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all" />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Wilaya</label>
                             <select value={currentEdit.wilaya} onChange={e => setCurrentEdit({...currentEdit, wilaya: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600">
                                {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Commune</label>
                             <input value={currentEdit.commune} onChange={e => setCurrentEdit({...currentEdit, commune: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                 <div className="space-y-10">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center"><ShieldCheck size={18} className="mr-3" /> Données Fiscales & Bancaires</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Registre de Commerce (RC)</label>
                          <input value={currentEdit.rc} onChange={e => setCurrentEdit({...currentEdit, rc: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-slate-900 dark:text-white" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Matricule Fiscal (NIF)</label>
                          <input value={currentEdit.nif} onChange={e => setCurrentEdit({...currentEdit, nif: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-slate-900 dark:text-white" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Article d'Imposition (AI)</label>
                          <input value={currentEdit.ai} onChange={e => setCurrentEdit({...currentEdit, ai: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-slate-900 dark:text-white" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Identifiant Statistique (NIS)</label>
                          <input value={currentEdit.nis} onChange={e => setCurrentEdit({...currentEdit, nis: e.target.value})} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-slate-900 dark:text-white" />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><Coins size={12} className="mr-2" /> Capital Social (DZD)</label>
                          <input value={currentEdit.capital} onChange={e => setCurrentEdit({...currentEdit, capital: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-indigo-600 outline-none" placeholder="0,00" />
                       </div>
                       <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center"><CreditCard size={12} className="mr-2" /> RIB Bancaire (20 chiffres)</label>
                          <input value={currentEdit.rib} onChange={e => setCurrentEdit({...currentEdit, rib: e.target.value})} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white" />
                       </div>
                    </div>
                 </div>

                 <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

                 {/* PARAMÈTRES SOCIAUX & PAIE */}
                 <div className="space-y-10">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center"><Calculator size={18} className="mr-3" /> Paramètres Sociaux & Paie</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                       <div className="space-y-2 lg:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Numéro Employeur (CNAS)</label>
                          <input 
                             value={currentEdit.employerCnasNumber || ''} 
                             onChange={e => setCurrentEdit({...currentEdit, employerCnasNumber: e.target.value})} 
                             className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-xs font-black tracking-widest text-slate-900 dark:text-white" 
                             placeholder="00000000"
                          />
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Base Jours Ouvrables</label>
                          <select 
                             value={currentEdit.workingDaysCount || 30} 
                             onChange={e => setCurrentEdit({...currentEdit, workingDaysCount: parseInt(e.target.value)})} 
                             className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-xs text-slate-900 dark:text-white outline-none"
                          >
                             <option value={22}>22 Jours / Mois (Réel)</option>
                             <option value={30}>30 Jours / Mois (Calendaire)</option>
                          </select>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Début Période Paie</label>
                          <select 
                             value={currentEdit.payrollStartDay || 1} 
                             onChange={e => setCurrentEdit({...currentEdit, payrollStartDay: parseInt(e.target.value)})} 
                             className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-xs text-slate-900 dark:text-white outline-none"
                          >
                             <option value={1}>1er du mois</option>
                             <option value={16}>16 du mois</option>
                             <option value={21}>21 du mois</option>
                          </select>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* WORK SCHEDULE SETTINGS */}
      {activeTab === 'schedule' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                 <div className="flex items-center space-x-5">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl"><CalendarCheck size={32} /></div>
                    <div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Règlement Intérieur</h3>
                       <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Horaires, Retards & Heures Supplémentaires</p>
                    </div>
                 </div>
                 <button onClick={handleSaveCompany} disabled={isSaving} className={`px-10 py-4 bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50`}>
                    {isSaving ? <RefreshCw size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Enregistrer
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-8">
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] border-b border-slate-200 dark:border-slate-700 pb-3">Horaires de Travail</h4>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Heure Début</label>
                          <input 
                             type="time"
                             value={currentEdit.workSchedule?.startTime || "08:30"} 
                             onChange={e => setCurrentEdit({...currentEdit, workSchedule: { ...currentEdit.workSchedule, startTime: e.target.value } as any})} 
                             className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-900 dark:text-white outline-none focus:border-indigo-600" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Heure Fin</label>
                          <input 
                             type="time"
                             value={currentEdit.workSchedule?.endTime || "16:30"} 
                             onChange={e => setCurrentEdit({...currentEdit, workSchedule: { ...currentEdit.workSchedule, endTime: e.target.value } as any})} 
                             className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-900 dark:text-white outline-none focus:border-indigo-600" 
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Jours de Week-end</label>
                       <select 
                          value={JSON.stringify(currentEdit.workSchedule?.weekendDays || [5, 6])}
                          onChange={e => setCurrentEdit({...currentEdit, workSchedule: { ...currentEdit.workSchedule, weekendDays: JSON.parse(e.target.value) } as any})} 
                          className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                       >
                          <option value="[5, 6]">Vendredi / Samedi (Standard Algérie)</option>
                          <option value="[6, 0]">Samedi / Dimanche</option>
                          <option value="[5]">Vendredi uniquement</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] border-b border-slate-200 dark:border-slate-700 pb-3">Règles & Majorations</h4>
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Tolérance Retard (Minutes)</label>
                          <input 
                             type="number"
                             value={currentEdit.attendanceRules?.latenessToleranceMinutes || 15} 
                             onChange={e => setCurrentEdit({...currentEdit, attendanceRules: { ...currentEdit.attendanceRules, latenessToleranceMinutes: parseInt(e.target.value) } as any})} 
                             className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-lg text-slate-900 dark:text-white outline-none focus:border-indigo-600" 
                          />
                          <p className="text-[9px] font-bold text-slate-400 ml-2">Au delà, le système marquera un "Retard".</p>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase ml-1">HS Semaine</label>
                             <input 
                                type="number" step="0.1"
                                value={currentEdit.attendanceRules?.overtimeRateWeek || 1.5} 
                                onChange={e => setCurrentEdit({...currentEdit, attendanceRules: { ...currentEdit.attendanceRules, overtimeRateWeek: parseFloat(e.target.value) } as any})} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none" 
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase ml-1">HS Week-End</label>
                             <input 
                                type="number" step="0.1"
                                value={currentEdit.attendanceRules?.overtimeRateWeekend || 1.75} 
                                onChange={e => setCurrentEdit({...currentEdit, attendanceRules: { ...currentEdit.attendanceRules, overtimeRateWeekend: parseFloat(e.target.value) } as any})} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none" 
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase ml-1">HS Férié</label>
                             <input 
                                type="number" step="0.1"
                                value={currentEdit.attendanceRules?.overtimeRateHoliday || 2.0} 
                                onChange={e => setCurrentEdit({...currentEdit, attendanceRules: { ...currentEdit.attendanceRules, overtimeRateHoliday: parseFloat(e.target.value) } as any})} 
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none" 
                             />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isScannerOpen && <OCRScanner targetType="company" onClose={() => setIsScannerOpen(false)} onScanComplete={handleScanComplete} />}

      {/* DEVICES / TIME CLOCK TAB */}
      {activeTab === 'devices' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center space-x-5 mb-10">
                 <div className="p-4 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 rounded-3xl"><Watch size={32} /></div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Pointeuse Biométrique</h3>
                    <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest">Configuration ZKTeco / Anviz</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       Configurez ici l'adresse IP de votre pointeuse physique pour permettre la synchronisation des logs via le module RH.
                       Assurez-vous que l'appareil est accessible sur le réseau local.
                    </p>
                    
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Adresse IP Appareil</label>
                          <input 
                             value={currentEdit.timeClockIp || ''} 
                             onChange={e => setCurrentEdit({...currentEdit, timeClockIp: e.target.value})} 
                             className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-sm font-black outline-none focus:border-cyan-500 text-slate-900 dark:text-white" 
                             placeholder="192.168.1.201"
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Port (UDP/TCP)</label>
                             <input 
                                type="number"
                                value={currentEdit.timeClockPort || 4370} 
                                onChange={e => setCurrentEdit({...currentEdit, timeClockPort: parseInt(e.target.value)})} 
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-sm font-black outline-none focus:border-cyan-500 text-slate-900 dark:text-white" 
                             />
                          </div>
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Code Comm (0=Défaut)</label>
                             <input 
                                type="password"
                                value={currentEdit.timeClockPassword || ''} 
                                onChange={e => setCurrentEdit({...currentEdit, timeClockPassword: e.target.value})} 
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-mono text-sm font-black outline-none focus:border-cyan-500 text-slate-900 dark:text-white" 
                                placeholder="0"
                             />
                          </div>
                       </div>
                    </div>

                    <button onClick={handleSaveCompany} disabled={isSaving} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center">
                        {isSaving ? <RefreshCw size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Enregistrer Configuration
                    </button>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-800 rounded-[32px] p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Server size={48} className="text-slate-300 mb-4" />
                    <h4 className="text-sm font-black uppercase text-slate-700 dark:text-slate-300 mb-2">Statut de la liaison</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-6">Testez la connexion avec la pointeuse avant de lancer la synchronisation.</p>
                    <button className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-cyan-500 hover:text-cyan-600 transition-all shadow-sm">
                       Ping Appareil
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* [ ... OTHER TABS (Appearance, Network, Database, Maintenance) SAME AS BEFORE ... ] */}
      {activeTab === 'appearance' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 rtl:space-x-reverse mb-10">
                   <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl"><Languages size={24} /></div>
                   <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{t.language}</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   {[
                     { id: 'fr', label: 'Français', sub: 'Standard Administratif' },
                     { id: 'ar', label: 'العربية', sub: 'اللغة الوطنية' },
                     { id: 'en', label: 'English', sub: 'International Business' }
                   ].map(lang => (
                     <button key={lang.id} onClick={() => { setAppLanguage(lang.id as Language); localStorage.setItem('app_lang', lang.id); }} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between group ${appLanguage === lang.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}>
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                           <div className={`w-5 h-5 rounded-full border-4 ${appLanguage === lang.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}></div>
                           <div className="text-left rtl:text-right">
                              <p className={`text-sm font-black uppercase ${appLanguage === lang.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>{lang.label}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{lang.sub}</p>
                           </div>
                        </div>
                        {appLanguage === lang.id && <CheckCircle2 size={20} className="text-indigo-600" />}
                     </button>
                   ))}
                </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-4 rtl:space-x-reverse mb-10">
                   <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-2xl"><Palette size={24} /></div>
                   <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{t.theme}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {themes.map(th => (
                     <button key={th.id} onClick={() => { setAppTheme(th.id); localStorage.setItem('app_theme', th.id); }} className={`w-full p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${appTheme === th.id ? 'border-indigo-600 bg-slate-50 dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}>
                        <div className={`w-12 h-12 rounded-2xl ${th.color} shadow-xl shadow-black/10`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${appTheme === th.id ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{th.label}</span>
                        {appTheme === th.id && <div className="absolute top-4 right-4"><CheckCircle2 size={16} className="text-indigo-600" /></div>}
                     </button>
                   ))}
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="bg-slate-900 text-white rounded-[48px] p-12 relative overflow-hidden border-b-8 border-emerald-500">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                 <div className="space-y-6 flex-1">
                    <div className="flex items-center space-x-4">
                       <div className="p-4 bg-white/10 rounded-3xl"><Network size={32} className="text-emerald-400" /></div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter">Instance Réseau {license?.networkRole}</h3>
                    </div>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest max-w-xl leading-relaxed">
                       {license?.networkRole === 'HUB' 
                         ? "Ce terminal agit comme Serveur Central (Hub). Les postes clients doivent pointer vers votre adresse IP locale pour la synchronisation en temps réel."
                         : "Ce terminal est connecté au Hub Central. Les données sont synchronisées automatiquement dès qu'une liaison est établie."}
                    </p>
                    <div className="flex gap-4">
                       <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center flex-1">
                          <p className="text-[9px] font-black uppercase text-indigo-300 mb-1">ID de l'Instance</p>
                          <code className="text-xs font-mono font-black">{license?.databaseId}</code>
                       </div>
                       <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-center flex-1">
                          <p className="text-[9px] font-black uppercase text-indigo-300 mb-1">Adresse Liaison</p>
                          <code className="text-xs font-mono font-black">{license?.hubAddress || 'LOCALHOST'}</code>
                       </div>
                    </div>
                 </div>
                 <div className="w-full md:w-64 space-y-3">
                    <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center">
                       <RefreshCw size={14} className="mr-2" /> Tester Liaison
                    </button>
                    <p className="text-[8px] text-center text-slate-500 uppercase font-black">Statut signal : Excellent (Ping 2ms)</p>
                 </div>
              </div>
              <Network size={300} className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none" />
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl"><Monitor size={24} /></div>
                    <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">Terminaux en Ligne</h3>
                 </div>
                 <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">{activeSessions.length + 1} Poste(s)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Hub itself */}
                 <div className="p-6 bg-slate-900 text-white rounded-[32px] flex items-center justify-between border-b-4 border-indigo-500">
                    <div className="flex items-center space-x-4">
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400"><Server size={20} /></div>
                       <div><p className="text-sm font-black uppercase tracking-tight">Serveur Hub (Maitre)</p><p className="text-[9px] font-bold text-slate-400 uppercase">Ce Poste</p></div>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                 </div>

                 {activeSessions.map((session, idx) => (
                   <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-emerald-500 transition-all">
                      <div className="flex items-center space-x-4">
                         <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-slate-100 dark:border-slate-700"><Laptop size={20} /></div>
                         <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{session.userName}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{session.deviceName || 'Poste Client'}</p>
                         </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
                         <button title="Déconnecter Forcé" className="p-2 bg-rose-50 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><UserMinus size={12} /></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[48px] p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div className="flex items-center space-x-5 mb-12">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-3xl"><Database size={32} /></div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{isRtl ? 'إحصائيات البيانات' : 'Statistiques de l\'Instance'}</h3>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {[
                       { label: 'Clients', val: dbStats.clients, icon: <MapPin /> },
                       { label: 'Articles', val: dbStats.products, icon: <Package /> },
                       { label: 'Factures', val: dbStats.invoices, icon: <FileText /> },
                       { label: 'Audit Logs', val: dbStats.logs, icon: <History /> }
                    ].map(s => (
                       <div key={s.label} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <div className="text-blue-500 mb-3">{s.icon}</div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white">{s.val}</p>
                       </div>
                    ))}
                 </div>

                 <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                       <HardDrive size={24} className="text-blue-600" />
                       <div>
                          <p className="text-xs font-black uppercase text-blue-900 dark:text-blue-300">Intégrité de la Base de Données</p>
                          <p className="text-[10px] font-bold text-blue-700/60 uppercase">Dernière vérification : {new Date().toLocaleTimeString()}</p>
                       </div>
                    </div>
                    <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Optimiser</button>
                 </div>
              </div>

              <div className="bg-slate-900 text-white rounded-[48px] p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="p-4 bg-indigo-500 rounded-2xl w-fit mb-6"><Usb size={24} /></div>
                    <h3 className="text-lg font-black uppercase leading-tight mb-4 tracking-tighter">Support de<br/>Secours Physique</h3>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed mb-8">Configurez une clé USB ou un disque externe pour le miroir automatique de votre ERP.</p>
                 </div>
                 <button onClick={handleSelectBackupDir} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl ${dirHandle ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-white text-slate-900 hover:bg-indigo-400 hover:text-white'}`}>
                    {dirHandle ? 'Clé USB Active' : 'Configurer USB'}
                 </button>
                 <Usb size={180} className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none" />
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[48px] p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white mb-6">Extraction & Migration</h3>
              <div className="flex flex-wrap justify-center gap-4">
                 <button onClick={handleExportData} className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all flex items-center">
                    <Download size={18} className="mr-3" /> Exporter le Registre (.json)
                 </button>
                 <label className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center cursor-pointer">
                    <Upload size={18} className="mr-3" /> Importer une Sauvegarde
                    <input type="file" accept=".json" className="hidden" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                             try {
                                const data = JSON.parse(ev.target?.result as string);
                                if (confirm("Attention : Cette action écrasera toutes vos données actuelles. Procéder ?")) {
                                   Object.keys(data).forEach(key => localStorage.setItem(key, typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key])));
                                   window.location.reload();
                                }
                             } catch { alert("Format invalide."); }
                          };
                          reader.readAsText(file);
                       }
                    }}/>
                 </label>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-8">
           <div className="bg-rose-50 dark:bg-rose-900/10 rounded-[48px] p-10 md:p-12 border-2 border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center space-x-5 mb-10">
                 <div className="p-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-3xl"><ShieldAlert size={32} /></div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-rose-700 dark:text-rose-400">Périmètre de Sécurité</h3>
                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Zone de Danger - Administrateur uniquement</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="p-8 bg-white dark:bg-slate-900/50 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                       <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-3">Désactivation Licence</h4>
                       <p className="text-xs text-slate-500 font-bold mb-8 leading-relaxed italic">
                          Libérez la clé produit liée à ce terminal. Vous devrez ressaisir votre clé ou certificat pour réaccéder au système.
                       </p>
                       <button onClick={handleDeactivateLicense} className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all flex items-center">
                          <LogOut size={16} className="mr-3" /> Désactiver ce Terminal
                       </button>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="p-8 bg-white dark:bg-slate-900/50 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                       <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-3">Réinitialisation des Logs d'Audit</h4>
                       <p className="text-xs text-slate-500 font-bold mb-8 leading-relaxed italic">
                          Supprimez l'historique complet des actions HUB. Attention : Cette action est irréversible et supprime toute preuve de traçabilité.
                       </p>
                       <button onClick={() => { if(confirm("Supprimer l'audit ?")) { localStorage.removeItem('dz_data_audit_logs'); window.location.reload(); } }} className="px-8 py-4 border-2 border-rose-200 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                          <Trash2 size={16} className="mr-3" /> Vider Registre Audit
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModule;
