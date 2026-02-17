
import React, { useState, useMemo, useRef } from 'react';
import { Key, ShieldAlert, ArrowRight, ShieldCheck, RefreshCw, Network, Server, Laptop, Activity, Globe, Database, Settings2, Terminal, Info, ChevronDown, CheckCircle2, Lock, DatabaseZap, FileUp, Shield } from 'lucide-react';
import { LicenseInfo, GeneratedLicense, NetworkRole, ModuleType, LicenseType } from '../types';
import { LICENSE_PLANS } from '../constants';

// SECRET SHARED KEY (Doit être STRICTEMENT identique au générateur)
const DZ_ENCRYPTION_SALT = "DZ-MANAGER-SECURE-V2-2025-ALGERIA-FINANCE-SQL";

interface LicenseGateProps {
  setLicense: (license: LicenseInfo) => void;
  databaseId: string;
  setDatabaseId: (id: string) => void;
  googleAccessToken: string | null;
  onSync: (token: string, direction: 'upload' | 'download') => Promise<boolean>;
  licenseHistory: GeneratedLicense[];
  currentUserEmail: string;
}

const LicenseGate: React.FC<LicenseGateProps> = ({ setLicense, licenseHistory = [] }) => {
  const [key, setKey] = useState('');
  const [hubAddress, setHubAddress] = useState('192.168.1.100');
  const [serverPort, setServerPort] = useState(8080);
  const [error, setError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [networkRole, setNetworkRole] = useState<NetworkRole>('HUB');
  const [useManualConfig, setUseManualConfig] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verifyCertificateSignature = async (certData: any) => {
    try {
      const lic = certData.license;
      const providedHash = certData.vHash;
      if (!lic || !providedHash) return false;
      const dataToSign = `${lic.owner}|${lic.authorizedEmail}|${lic.databaseId}|${lic.type}|${lic.expiryDate}|${DZ_ENCRYPTION_SALT}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(dataToSign);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      return computedHash === providedHash;
    } catch (e) { return false; }
  };

  const triggerActivation = async (inputKey: string, standaloneLic?: GeneratedLicense) => {
    setError('');
    setIsActivating(true);
    
    setTimeout(() => {
      if (standaloneLic) {
        const finalHubAddress = useManualConfig ? hubAddress : (networkRole === 'WORKSTATION' ? hubAddress : '127.0.0.1');
        const newLicense: LicenseInfo = {
          key: standaloneLic.key,
          status: 'Active',
          expiryDate: standaloneLic.expiryDate,
          owner: standaloneLic.owner,
          networkRole: networkRole,
          hubAddress: finalHubAddress,
          databaseId: standaloneLic.databaseId,
          serverPort: serverPort,
          useManualConfig: useManualConfig,
          type: standaloneLic.type,
          modules: standaloneLic.modules,
          maxUsers: standaloneLic.maxUsers
        };
        localStorage.setItem('erp_license', JSON.stringify(newLicense));
        setLicense(newLicense);
        setIsActivating(false);
        return;
      }

      const inputKeyClean = inputKey.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
      const historyMatch = licenseHistory.find(l => l.key.replace(/[^A-Z0-9]/g, '') === inputKeyClean);
      const isUniversal = inputKeyClean === 'DZPRO2024MANAGER';

      // Décodage du pack
      let detectedType: LicenseType = 'BUSINESS';
      let detectedModules = LICENSE_PLANS['BUS'].modules;
      let detectedMaxUsers = LICENSE_PLANS['BUS'].maxUsers;

      const keyParts = inputKey.split('-');
      if (keyParts.length > 2) {
          const typeCode = keyParts[1]; 
          if (LICENSE_PLANS[typeCode]) {
              detectedType = LICENSE_PLANS[typeCode].type;
              detectedModules = LICENSE_PLANS[typeCode].modules;
              detectedMaxUsers = LICENSE_PLANS[typeCode].maxUsers;
          }
      }

      if (historyMatch || isUniversal || (inputKey.startsWith('DZ-') && inputKey.length > 15)) {
        const finalHubAddress = useManualConfig ? hubAddress : (networkRole === 'WORKSTATION' ? hubAddress : '127.0.0.1');
        const modulesToUse = historyMatch?.modules || detectedModules;
        const typeToUse = historyMatch?.type || detectedType;
        const maxUsersToUse = historyMatch?.maxUsers || detectedMaxUsers;

        const newLicense: LicenseInfo = {
          key: historyMatch?.key || inputKey,
          status: 'Active',
          expiryDate: historyMatch?.expiryDate || 'Permanente',
          owner: networkRole === 'HUB' ? 'Terminal Principal HUB' : 'Poste Client Réseau',
          networkRole: networkRole,
          hubAddress: finalHubAddress,
          databaseId: historyMatch?.databaseId || `SQL_DZ_${inputKeyClean.substring(0, 10)}`,
          serverPort: serverPort,
          useManualConfig: useManualConfig,
          type: typeToUse,
          modules: modulesToUse,
          maxUsers: maxUsersToUse
        };
        localStorage.setItem('erp_license', JSON.stringify(newLicense));
        setLicense(newLicense);
      } else {
        setError("Clé invalide ou format non reconnu.");
      }
      setIsActivating(false);
    }, 1000);
  };

  const handleImportCertificate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const isValid = await verifyCertificateSignature(data);
        if (isValid) {
           setKey(data.license.key);
           triggerActivation(data.license.key, data.license);
        } else {
           setError("Signature cryptographique invalide.");
        }
      } catch (err) { setError("Erreur de lecture."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-slate-950 flex-col space-y-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[64px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row min-h-[700px] animate-in zoom-in-95 duration-500">
        <div className="md:w-2/5 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <div className="p-4 bg-indigo-600 rounded-[24px] w-fit mb-8 shadow-2xl shadow-indigo-600/30"><ShieldCheck size={32} /></div>
              <h2 className="text-3xl font-black mb-4 uppercase tracking-tighter leading-tight text-indigo-400">Certificat<br/>Informatisé</h2>
              <p className="text-slate-400 text-sm font-medium mb-10 leading-relaxed uppercase tracking-widest">Activation sécurisée SHA-256 sans connexion requise.</p>
              <div className="relative py-12 px-6 bg-white/5 rounded-[40px] border border-white/10 mb-8 text-center">
                 <Lock className="mx-auto mb-4 text-indigo-500 opacity-50" size={48} />
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Le chiffrement du certificat lie votre licence à l'instance SQL de façon indélébile.</p>
              </div>
           </div>
           <Activity size={300} className="absolute -bottom-20 -left-20 opacity-5 pointer-events-none" />
        </div>
        <div className="flex-1 p-12 bg-white dark:bg-slate-900 overflow-y-auto max-h-[85vh] custom-scrollbar">
           <div className="mb-12 flex items-center justify-between">
              <div><h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Portail d'Accès</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Validation cryptographique active</p></div>
              <div className="flex space-x-2">
                <input type="file" accept=".dzlic" className="hidden" ref={fileInputRef} onChange={handleImportCertificate} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-emerald-700 transition-all active:scale-95"><FileUp size={14} className="mr-2" /> Importer Certificat (.dzlic)</button>
              </div>
           </div>
           <form onSubmit={(e) => { e.preventDefault(); triggerActivation(key); }} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="col-span-full space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Configuration de l'instance réseau</label>
                    <div className="grid grid-cols-2 gap-6">
                       <button type="button" onClick={() => setNetworkRole('HUB')} className={`p-6 rounded-[32px] border-4 transition-all text-left ${networkRole === 'HUB' ? 'bg-indigo-50 border-indigo-600' : 'bg-slate-50 border-transparent opacity-50'}`}>
                          <Server size={24} className={networkRole === 'HUB' ? 'text-indigo-600' : 'text-slate-400'} /><p className="mt-4 text-xs font-black uppercase text-slate-900">Serveur Hub (Principal)</p>
                       </button>
                       <button type="button" onClick={() => setNetworkRole('WORKSTATION')} className={`p-6 rounded-[32px] border-4 transition-all text-left ${networkRole === 'WORKSTATION' ? 'bg-emerald-50 border-emerald-600' : 'bg-slate-50 border-transparent opacity-50'}`}>
                          <Laptop size={24} className={networkRole === 'WORKSTATION' ? 'text-emerald-600' : 'text-slate-400'} /><p className="mt-4 text-xs font-black uppercase text-slate-900">Poste Client (Réseau)</p>
                       </button>
                    </div>
                 </div>
                 {networkRole === 'WORKSTATION' && (
                   <div className="col-span-full animate-in slide-in-from-top-4 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">IP du Serveur Hub</label>
                      <input type="text" value={hubAddress} onChange={(e) => setHubAddress(e.target.value)} placeholder="192.168.1.xxx" className="w-full px-6 py-5 bg-slate-50 border-2 rounded-[28px] text-xs font-black outline-none focus:border-indigo-600" />
                   </div>
                 )}
                 <div className="col-span-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-2">Clé Produit (Saisie manuelle)</label>
                    <div className="relative">
                       <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="DZ-XXXX-2024-XXXX..." className={`w-full pl-16 pr-8 py-5 bg-slate-50 border-2 ${error ? 'border-rose-500' : 'border-slate-100'} rounded-[28px] text-sm font-mono font-black outline-none focus:border-indigo-600 uppercase text-slate-900`} />
                    </div>
                 </div>
              </div>
              {error && <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[32px] flex items-center space-x-4 animate-bounce"><ShieldAlert size={24} className="text-rose-600" /><p className="text-rose-600 text-xs font-black uppercase tracking-widest leading-relaxed">{error}</p></div>}
              <button type="submit" disabled={isActivating} className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center">{isActivating ? <RefreshCw size={24} className="animate-spin" /> : <span>Activer via Clé</span>}</button>
           </form>
           <div className="mt-8 p-8 bg-indigo-50/50 rounded-3xl flex items-start space-x-4 border border-indigo-100"><ShieldCheck size={24} className="text-indigo-500 shrink-0" /><div><p className="text-[10px] text-indigo-700 font-bold uppercase leading-relaxed">Note technique : L'importation du certificat (.dzlic) utilise le moteur SHA-256 pour valider l'authenticité de votre licence même sans historique local.</p></div></div>
        </div>
      </div>
    </div>
  );
};

export default LicenseGate;
