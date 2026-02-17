
import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Copy, CheckCircle2, Zap, Mail, Database, ShieldCheck, Award, Trash2, Clock, Globe, Shield, Lock, Cloud, CloudUpload, CloudDownload, AlertCircle, Terminal, ExternalLink, Settings, Info, FileDown, Rocket, Briefcase, Building, Check, ShoppingBag, Users, CalendarDays } from 'lucide-react';
import { GeneratedLicense, LicenseType, ModuleType } from '../types';

// SECRET SHARED KEY (Connu par le code source de l'ERP et du Générateur)
const DZ_ENCRYPTION_SALT = "DZ-MANAGER-SECURE-V2-2025-ALGERIA-FINANCE-SQL";

interface LicenseGeneratorModuleProps {
  history: GeneratedLicense[];
  setHistory: React.Dispatch<React.SetStateAction<GeneratedLicense[]>>;
}

// DÉFINITION ÉTENDUE DES OFFRES COMMERCIALES
const OFFERS = [
  {
    id: 'STARTUP' as LicenseType,
    name: 'Starter TPE',
    color: 'indigo',
    icon: <Rocket size={24} />,
    users: 2,
    price: '25,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.SALES, 
        ModuleType.CLIENTS, 
        ModuleType.INVENTORY, 
        ModuleType.FINANCE, 
        ModuleType.SETTINGS
    ],
    desc: 'Caisse & Vente simple. Idéal pour débuter.'
  },
  {
    id: 'RETAIL' as LicenseType,
    name: 'Retail Négoce',
    color: 'blue',
    icon: <ShoppingBag size={24} />,
    users: 5,
    price: '45,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.SALES, 
        ModuleType.CLIENTS, 
        ModuleType.SUPPLIERS,
        ModuleType.INVENTORY, 
        ModuleType.PURCHASES,
        ModuleType.FINANCE, 
        ModuleType.SETTINGS
    ],
    desc: 'Gestion complète Achat/Vente/Stock pour grossistes.'
  },
  {
    id: 'SERVICE' as LicenseType,
    name: 'Services & CRM',
    color: 'cyan',
    icon: <Briefcase size={24} />,
    users: 5,
    price: '50,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.OPERATIONS,
        ModuleType.CRM,
        ModuleType.SALES, 
        ModuleType.CLIENTS, 
        ModuleType.FINANCE, 
        ModuleType.SETTINGS
    ],
    desc: 'Suivi prospects, devis et facturation de services.'
  },
  {
    id: 'HR_FOCUS' as LicenseType,
    name: 'RH & Paie',
    color: 'rose',
    icon: <Users size={24} />,
    users: 3,
    price: '40,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.HR, 
        ModuleType.TIME_CLOCK,
        ModuleType.USERS,
        ModuleType.SETTINGS
    ],
    desc: 'Gestion du personnel, pointage biométrique et paie.'
  },
  {
    id: 'EVENTS' as LicenseType,
    name: 'Event Planner',
    color: 'purple',
    icon: <CalendarDays size={24} />,
    users: 5,
    price: '60,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.EVENTS,
        ModuleType.CRM,
        ModuleType.SALES, 
        ModuleType.CLIENTS, 
        ModuleType.FINANCE, 
        ModuleType.SETTINGS
    ],
    desc: 'Organisation de salons, foires et locations.'
  },
  {
    id: 'BUSINESS' as LicenseType,
    name: 'PME Intégrale',
    color: 'emerald',
    icon: <Award size={24} />,
    users: 15,
    price: '85,000 DA/an',
    modules: [
        ModuleType.DASHBOARD,
        ModuleType.OPERATIONS,
        ModuleType.SALES, 
        ModuleType.CLIENTS, 
        ModuleType.SUPPLIERS,
        ModuleType.INVENTORY, 
        ModuleType.PURCHASES,
        ModuleType.FINANCE, 
        ModuleType.HR, 
        ModuleType.ACCOUNTING, 
        ModuleType.CRM,
        ModuleType.SETTINGS,
        ModuleType.USERS
    ],
    desc: 'ERP complet PME : Compta, RH, Commercial, Stock.'
  },
  {
    id: 'CORPORATE' as LicenseType,
    name: 'Holding Unlimited',
    color: 'amber',
    icon: <Building size={24} />,
    users: 999, // Illimité
    price: 'Sur Devis',
    modules: Object.values(ModuleType), // Tous les modules
    desc: 'Solution illimitée multi-sites avec toutes les options.'
  }
];

const LicenseGeneratorModule: React.FC<LicenseGeneratorModuleProps> = ({ history, setHistory }) => {
  const [owner, setOwner] = useState('');
  const [authorizedEmail, setAuthorizedEmail] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<typeof OFFERS[0]>(OFFERS[5]); // Default to Business
  const [duration, setDuration] = useState<'1' | '2' | 'permanent'>('permanent');
  const [generatedKey, setGeneratedKey] = useState('');
  const [lastGeneratedDbId, setLastGeneratedDbId] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Google Drive States
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [showConfig, setShowConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('dev_google_client_id') || '');

  // FONCTION : Calcul de la signature cryptographique du certificat
  const computeDigitalSignature = async (lic: GeneratedLicense) => {
    const dataToSign = `${lic.owner}|${lic.authorizedEmail}|${lic.databaseId}|${lic.type}|${lic.expiryDate}|${DZ_ENCRYPTION_SALT}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const deriveDatabaseId = (licenseKey: string) => {
    const parts = licenseKey.split('-');
    const uniqueSegments = parts.slice(3).join('');
    return `SQL_DZ_${uniqueSegments.substring(0, 10).toUpperCase()}`;
  };

  const generateNewKey = () => {
    if (!owner.trim() || !authorizedEmail.trim()) {
      alert("Erreur : Client et Email requis."); 
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const generateSegment = () => Array.from({length: 5}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      
      const typeCode = selectedOffer.id.substring(0, 3);
      const finalKey = `DZ-${typeCode}-2025-${generateSegment()}-${generateSegment()}-${generateSegment()}`;
      const dbUniqueId = deriveDatabaseId(finalKey);

      let expiry = 'Permanente';
      if (duration === '1') {
        const d = new Date(); d.setFullYear(d.getFullYear() + 1);
        expiry = d.toISOString().split('T')[0];
      } else if (duration === '2') {
        const d = new Date(); d.setFullYear(d.getFullYear() + 2);
        expiry = d.toISOString().split('T')[0];
      }

      const newEntry: GeneratedLicense = {
        id: `LIC-${Date.now()}`,
        key: finalKey,
        owner: owner.trim(),
        authorizedEmail: authorizedEmail.trim().toLowerCase(),
        date: new Date().toLocaleString('fr-DZ'),
        databaseId: dbUniqueId,
        type: selectedOffer.id,
        maxUsers: selectedOffer.users,
        modules: selectedOffer.modules,
        expiryDate: expiry
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('erp_license_history', JSON.stringify(updatedHistory));
      setGeneratedKey(finalKey);
      setLastGeneratedDbId(dbUniqueId);
      setIsGenerating(false);
      setIsCopied(false);
    }, 800);
  };

  const downloadLicenseCertificate = async (lic: GeneratedLicense) => {
    // Calcul de la signature pour rendre le fichier infalsifiable
    const signature = await computeDigitalSignature(lic);
    
    const certificate = {
      version: "2.0",
      security: "SHA-256-ENCRYPTED",
      product: "DZ-MANAGER-ERP",
      offer: lic.type,
      issuedAt: lic.date,
      license: lic,
      vHash: signature // Le sceau cryptographique
    };
    
    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CERTIFICAT_${lic.owner.replace(/\s+/g, '_')}_${lic.type}.dzlic`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // LOGIQUE GOOGLE DRIVE (Identique à la version précédente)
  const handleGoogleConnect = () => {
    if (!googleClientId) { setShowConfig(true); return; }
    try {
      // @ts-ignore
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) { setGoogleToken(response.access_token); setCloudStatus('idle'); }
        },
      });
      client.requestAccessToken();
    } catch (e) { alert("Vérifiez votre Google Client ID."); }
  };

  const syncToCloud = async () => {
    if (!googleToken) return handleGoogleConnect();
    setCloudStatus('syncing');
    try {
      const fileName = "dz_erp_master_registry.json";
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      const searchData = await searchRes.json();
      const existingFile = searchData.files?.[0];
      const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
      
      if (existingFile) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${googleToken}` },
          body: blob
        });
      } else {
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST', headers: { 'Authorization': `Bearer ${googleToken}` }, body: form
        });
      }
      setCloudStatus('success');
      setTimeout(() => setCloudStatus('idle'), 3000);
    } catch (e: any) { setCloudStatus('error'); }
  };

  const fetchFromCloud = async () => {
    if (!googleToken) return handleGoogleConnect();
    setCloudStatus('syncing');
    try {
      const fileName = "dz_erp_master_registry.json";
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      const searchData = await searchRes.json();
      const file = searchData.files?.[0];
      if (!file) { alert("Aucun registre trouvé."); setCloudStatus('idle'); return; }
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: { 'Authorization': `Bearer ${googleToken}` }
      });
      const cloudHistory = await contentRes.json();
      if (confirm(`Importer ${cloudHistory.length} licences ?`)) {
        setHistory(cloudHistory);
        localStorage.setItem('erp_license_history', JSON.stringify(cloudHistory));
        setCloudStatus('success');
      } else setCloudStatus('idle');
    } catch (e: any) { setCloudStatus('error'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-indigo-600 p-8 rounded-[48px] text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
           <h1 className="text-2xl font-black uppercase tracking-tighter">Developer Command Center</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Signature Cryptographique de Certificats Standalone</p>
        </div>
        <div className="relative z-10 flex space-x-2">
           <button onClick={() => setShowConfig(!showConfig)} className="p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all border border-white/10">
              <Settings size={24} />
           </button>
        </div>
        <Terminal size={200} className="absolute -bottom-20 -right-20 opacity-10 pointer-events-none" />
      </div>

      {showConfig && (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border-4 border-indigo-500 shadow-2xl animate-in slide-in-from-top-4">
           <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Globe size={24} /></div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuration Google Cloud</h3>
           </div>
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Google Client ID</label>
                 <input 
                    value={googleClientId} 
                    onChange={e => setGoogleClientId(e.target.value)}
                    placeholder="xxxxxx-xxxxxxxx.apps.googleusercontent.com" 
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-xs font-black text-indigo-600" 
                 />
              </div>
              <div className="flex justify-end space-x-4">
                 <button onClick={() => setShowConfig(false)} className="px-8 py-3 text-slate-500 font-black uppercase text-[10px]">Annuler</button>
                 <button onClick={() => { localStorage.setItem('dev_google_client_id', googleClientId); setShowConfig(false); }} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Sauvegarder</button>
              </div>
           </div>
        </div>
      )}

      {/* Barre Cloud Sync */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
           <div className={`p-4 rounded-[24px] ${googleToken ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
              <Cloud size={28} />
           </div>
           <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Master Cloud Sync</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {googleToken ? 'Connecté au Drive' : 'Mode Local (Génération active)'}
              </p>
           </div>
        </div>
        <div className="flex items-center space-x-3">
           {!googleToken ? (
             <button onClick={handleGoogleConnect} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center">
                <Lock className="mr-2" size={14}/> Connecter Drive
             </button>
           ) : (
             <>
               <button onClick={syncToCloud} disabled={cloudStatus === 'syncing'} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-indigo-700 transition-all shadow-lg">
                  {cloudStatus === 'syncing' ? <RefreshCw className="mr-2 animate-spin" size={14}/> : <CloudUpload className="mr-2" size={14}/>}
                  Sauver Registre
               </button>
               <button onClick={fetchFromCloud} disabled={cloudStatus === 'syncing'} className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center hover:bg-slate-50 transition-all">
                  <CloudDownload className="mr-2" size={14}/>
                  Restaurer Registre
               </button>
             </>
           )}
           {cloudStatus === 'success' && <CheckCircle2 className="text-emerald-500" size={24} />}
        </div>
      </div>

      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-500">
        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-16">
          <div className="space-y-8">
            <div className="flex items-center space-x-5">
              <div className="p-4 bg-indigo-500 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
                <Lock size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight">Générateur Signé</h2>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Les certificats exportés sont validés mathématiquement</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Établissement Client</label>
                <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="ex: SARL ALGERIE TECH" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email d'activation</label>
                <input value={authorizedEmail} onChange={e => setAuthorizedEmail(e.target.value)} placeholder="admin@entreprise.dz" className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black" />
              </div>
              
              {/* OFFERS SELECTION */}
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Solution Commerciale</label>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {OFFERS.map(offer => (
                        <div 
                            key={offer.id} 
                            onClick={() => setSelectedOffer(offer)}
                            className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between h-full ${selectedOffer.id === offer.id ? `bg-${offer.color}-500/20 border-${offer.color}-500` : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        >
                            <div>
                                <div className={`mb-3 ${selectedOffer.id === offer.id ? `text-${offer.color}-400` : 'text-slate-400'}`}>{offer.icon}</div>
                                <p className="text-xs font-black uppercase">{offer.name}</p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 mb-2">{offer.desc}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center text-[8px] font-bold text-slate-300 uppercase">
                                        <Check size={10} className="mr-1 text-emerald-400" /> {offer.users === 999 ? 'Utilisateurs Illimités' : `${offer.users} Utilisateurs`}
                                    </div>
                                    <div className="flex items-center text-[8px] font-bold text-slate-300 uppercase">
                                        <Check size={10} className="mr-1 text-emerald-400" /> {offer.modules.length} Modules Inclus
                                    </div>
                                </div>
                            </div>
                            <div className={`mt-4 text-[10px] font-black px-2 py-1 rounded bg-${offer.color}-500/20 text-${offer.color}-300 w-fit`}>
                                {offer.price}
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Validité</label>
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    <button onClick={() => setDuration('1')} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${duration === '1' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>1 AN</button>
                    <button onClick={() => setDuration('permanent')} className={`flex-1 py-3 rounded-xl text-[9px] font-black transition-all ${duration === 'permanent' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>À VIE</button>
                </div>
              </div>
            </div>

            <button onClick={generateNewKey} disabled={isGenerating} className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50">
               {isGenerating ? <RefreshCw size={24} className="animate-spin" /> : <><Zap size={20} className="mr-3" /> Générer Licence {selectedOffer.name}</>}
            </button>
          </div>

          <div className="flex flex-col justify-center items-center text-center space-y-6 bg-white/5 rounded-[48px] border border-white/10 p-10 relative overflow-hidden">
             <div className="p-6 bg-black/40 rounded-[32px] border border-white/5 w-full relative">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center"><Shield size={12} className="mr-2" /> Clé Algérie Sécurisée</p>
                <p className="text-xl font-mono font-black text-indigo-400 break-all tracking-tighter leading-relaxed">
                   {generatedKey || 'DZ-XXXX-2025-XXXX-XXXX-XXXX'}
                </p>
                {generatedKey && (
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors">
                     {isCopied ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                )}
             </div>
             
             {generatedKey && (
                <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl w-full flex flex-col items-center space-y-3">
                   <div className="flex items-center space-x-4">
                      <Database size={28} className="text-indigo-400" />
                      <div className="text-left">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Instance SQL Liée</p>
                          <p className="text-xs font-mono font-bold text-slate-300">{lastGeneratedDbId}</p>
                      </div>
                   </div>
                   <div className="w-full h-px bg-white/10 my-2"></div>
                   <div className="flex justify-between w-full text-[9px] font-bold text-slate-400 uppercase px-4">
                      <span>Offre : {selectedOffer.name}</span>
                      <span>Users : {selectedOffer.users}</span>
                   </div>
                   <div className="flex flex-wrap gap-1 justify-center mt-2">
                       {selectedOffer.modules.map(m => (
                           <span key={m} className="px-1.5 py-0.5 bg-white/5 rounded text-[7px] text-slate-400 uppercase">{m}</span>
                       ))}
                   </div>
                </div>
             )}
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest max-w-[250px]">L'activation Standalone vérifie mathématiquement les données du certificat.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[56px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
         <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Clock size={20} /></div>
               <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Registre Local de Génération</h3>
            </div>
            <div className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
               {history.length} Licences Émises
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30 text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-800">
                     <th className="px-10 py-6">Client / Société</th>
                     <th className="px-10 py-6">Type Offre</th>
                     <th className="px-10 py-6">Validité / SQL ID</th>
                     <th className="px-10 py-6">Clé Produit</th>
                     <th className="px-10 py-6 text-right">Exporter Certificat</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map(lic => (
                    <tr key={lic.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="px-10 py-6">
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{lic.owner}</p>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">{lic.authorizedEmail}</p>
                       </td>
                       <td className="px-10 py-6">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${lic.type === 'STARTUP' ? 'bg-indigo-100 text-indigo-700' : lic.type === 'BUSINESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{lic.type}</span>
                       </td>
                       <td className="px-10 py-6">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${lic.expiryDate === 'Permanente' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{lic.expiryDate}</span>
                          <p className="text-xs font-mono font-bold text-slate-300 mt-2">{lic.databaseId}</p>
                       </td>
                       <td className="px-10 py-6">
                          <code className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl font-mono font-black text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{lic.key}</code>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                             <button onClick={() => downloadLicenseCertificate(lic)} title="Télécharger Certificat .dzlic (Standalone)" className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95"><FileDown size={18} /></button>
                             <button onClick={() => confirm("Révoquer ?") && setHistory(history.filter(h => h.id !== lic.id))} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default LicenseGeneratorModule;
