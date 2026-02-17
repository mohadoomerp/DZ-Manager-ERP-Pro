
import React, { useState, useRef, useMemo } from 'react';
import { 
  Users, Plus, Search, Phone, Mail, ChevronRight, Edit3, Trash2, X, Save, 
  AlertTriangle, Building2, Sparkles, Camera, FileUp, Upload, CheckCircle2, 
  Table as TableIcon, MapPin, Fingerprint, Database, Download, Ticket
} from 'lucide-react';
import { formatCurrency } from '../constants';
import { Partner, User, EventBooking, Invoice, ModuleType, AuditLog } from '../types';
import OCRScanner from '../components/OCRScanner';

interface ClientsModuleProps {
  clients: Partner[];
  setClients: (clients: Partner[]) => void;
  currentUser: User;
  events: EventBooking[];
  invoices: Invoice[];
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
  onDeleteClient: (id: string) => void; // Nouvelle prop
}

interface CSVMapping {
  name: string; nif: string; ai: string; rc: string; nis: string; address: string; phone: string; email: string;
}

const ClientsModule: React.FC<ClientsModuleProps> = ({ clients, setClients, currentUser, events, invoices, onAddLog, onDeleteClient }) => {
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partner | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanData, setScanData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState<string>('all');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    name: '', nif: '', ai: '', rc: '', nis: '', address: '', phone: '', email: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtrer les clients supprimés
  const activeClients = useMemo(() => clients.filter(c => !c.isDeleted), [clients]);

  const filteredClients = useMemo(() => {
    let baseClients = activeClients;
    if (currentUser.role === 'SALES') {
      const assignedEventIds = new Set(events.filter(e => e.assignedAgents?.includes(currentUser.id)).map(e => e.id));
      const clientsInAssignedEvents = new Set<string>();
      events.forEach(event => { if (assignedEventIds.has(event.id)) { event.participants.forEach(p => clientsInAssignedEvents.add(p.clientId)); } });
      const allClientsInAnyEvent = new Set<string>();
      events.forEach(event => { event.participants.forEach(p => allClientsInAnyEvent.add(p.clientId)); });
      baseClients = activeClients.filter(client => clientsInAssignedEvents.has(client.id) || !allClientsInAnyEvent.has(client.id));
    }
    let eventFilteredClients = baseClients;
    if (filterEvent !== 'all') {
      const eventClientIds = new Set(events.find(e => e.id === filterEvent)?.participants.map(p => p.clientId) || []);
      eventFilteredClients = baseClients.filter(c => eventClientIds.has(c.id));
    }
    return eventFilteredClients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.nif && c.nif.toLowerCase().includes(searchTerm.toLowerCase())) || (c.rc && c.rc.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [activeClients, searchTerm, currentUser, events, filterEvent]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientData: Partner = {
      id: editingClient?.id || `C-${Date.now()}`,
      name: (formData.get('name') as string).toUpperCase(),
      type: 'Client',
      nif: formData.get('nif') as string,
      ai: formData.get('ai') as string,
      rc: formData.get('rc') as string,
      nis: formData.get('nis') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      balance: editingClient?.balance || 0,
      createdBy: editingClient?.createdBy || currentUser.name,
      updatedAt: Date.now()
    };

    if (editingClient) {
      setClients(clients.map(c => c.id === editingClient.id ? clientData : c));
      onAddLog('UPDATE', ModuleType.CLIENTS, `Mise à jour client : ${clientData.name}`);
    } else {
      setClients([clientData, ...clients]);
      onAddLog('CREATE', ModuleType.CLIENTS, `Nouveau client : ${clientData.name}`);
    }
    setIsModalOpen(false);
    setScanData(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: any = {};
        headers.forEach((header, i) => { obj[header] = values[i] || ''; });
        return obj;
      });
      setCsvHeaders(headers);
      setCsvData(rows);
      setIsImportModalOpen(true);
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (!mapping.name) return alert("Le nom (Raison Sociale) est obligatoire.");
    const newClients: Partner[] = csvData.map((row, idx) => ({
      id: `C-IMP-${Date.now()}-${idx}`,
      name: (row[mapping.name] || 'CLIENT SANS NOM').toUpperCase(),
      type: 'Client',
      nif: mapping.nif ? row[mapping.nif] : '',
      ai: mapping.ai ? row[mapping.ai] : '',
      rc: mapping.rc ? row[mapping.rc] : '',
      nis: mapping.nis ? row[mapping.nis] : '',
      address: mapping.address ? row[mapping.address] : '',
      phone: mapping.phone ? row[mapping.phone] : '',
      email: mapping.email ? row[mapping.email] : '',
      balance: 0, 
      createdBy: currentUser.name, 
      updatedAt: Date.now()
    }));
    setClients([...newClients, ...clients]);
    onAddLog('CREATE', ModuleType.CLIENTS, `Importation massive de ${newClients.length} clients`);
    setIsImportModalOpen(false);
    alert(`${newClients.length} clients importés et centralisés sur le hub !`);
  };

  const handleScanComplete = (data: any) => {
    setScanData(data);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Portefeuille Clients</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Identification Fiscale & Coordonnées</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white dark:bg-slate-900 text-slate-600 rounded-2xl border border-slate-200 flex items-center hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
             <FileUp size={16} className="mr-2 text-indigo-500" /> Import CSV
          </button>
          <button onClick={() => setIsScannerOpen(true)} className="px-5 py-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex items-center hover:bg-indigo-100 transition-all shadow-sm">
             <Camera size={16} className="mr-2" /> <span className="text-[10px] font-black uppercase">Scanner Document</span>
          </button>
          <button onClick={() => { setEditingClient(null); setScanData(null); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all">
            <Plus size={18} className="mr-2" /> Nouveau Client
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Recherche par Raison Sociale, NIF, RC..." className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none" />
        </div>
        <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className="w-full md:w-auto px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none">
          <option value="all">Tous les clients</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
           <button onClick={() => setView('grid')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${view === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Grille</button>
           <button onClick={() => setView('table')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${view === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Tableau</button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-3xl flex items-center justify-center font-black text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {client.name[0]}
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-xl"><Edit3 size={16} /></button>
                  <button onClick={() => onDeleteClient(client.id)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 rounded-xl"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-lg mb-1 uppercase group-hover:text-indigo-600 transition-colors">{client.name}</h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Fingerprint size={12} className="mr-1.5" /> NIF: {client.nif || 'N/A'}</div>
              <div className="space-y-3 mb-8">
                 <div className="flex items-center text-xs font-bold text-slate-600"><Phone size={14} className="mr-3 text-indigo-500" /> {client.phone || 'N/A'}</div>
                 <div className="flex items-start text-xs font-bold text-slate-600"><MapPin size={14} className="mr-3 mt-0.5 text-indigo-500" /> <span className="line-clamp-2 uppercase italic">{client.address || 'N/A'}</span></div>
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Solde Compte</p><p className={`text-xl font-black ${client.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(client.balance)}</p></div>
                 <button className="bg-slate-900 text-white p-3 rounded-2xl transition-transform hover:scale-110"><ChevronRight size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 dark:bg-slate-800 border-b font-black text-slate-400 uppercase text-[10px] tracking-widest">
                    <th className="px-8 py-5">Raison Sociale</th><th className="px-8 py-5">Fiscalité</th><th className="px-8 py-5">Contact</th><th className="px-8 py-5">Solde</th><th className="px-8 py-5 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredClients.map(client => (
                   <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 font-black text-slate-900 dark:text-white uppercase text-sm">{client.name}</td>
                      <td className="px-8 py-5 text-[10px] font-mono text-indigo-600 font-black">NIF: {client.nif}<br/>RC: {client.rc}</td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-600">{client.phone}<br/><span className="text-[9px] lowercase opacity-50">{client.email}</span></td>
                      <td className="px-8 py-5 font-black text-sm">{formatCurrency(client.balance)}</td>
                      <td className="px-8 py-5 text-right">
                         <button onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl mr-2"><Edit3 size={16}/></button>
                         <button onClick={() => onDeleteClient(client.id)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Trash2 size={16} /></button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-600 rounded-2xl"><TableIcon size={24} /></div><div><h3 className="text-xl font-black uppercase tracking-widest">Configuration de l'Importation</h3><p className="text-[10px] text-indigo-300 font-bold uppercase">{csvData.length} clients détectés</p></div></div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
             </div>
             <div className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                   <div className="space-y-4">
                      {([ { id: 'name', label: 'Raison Sociale *' }, { id: 'nif', label: 'NIF' }, { id: 'rc', label: 'RC' } ] as const).map(field => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{field.label}</label>
                          <select value={(mapping as any)[field.id]} onChange={(e) => setMapping({...mapping, [field.id]: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold outline-none">
                            <option value="">-- Ignorer --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                   </div>
                   <div className="space-y-4">
                      {([ { id: 'phone', label: 'Téléphone' }, { id: 'address', label: 'Adresse' }, { id: 'email', label: 'Email' } ] as const).map(field => (
                        <div key={field.id} className="space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">{field.label}</label>
                          <select value={(mapping as any)[field.id]} onChange={(e) => setMapping({...mapping, [field.id]: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold outline-none">
                            <option value="">-- Ignorer --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                   </div>
                </div>
                <button onClick={executeImport} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all"><Save size={18} className="mr-3" /> Importer maintenant</button>
             </div>
           </div>
        </div>
      )}

      {isScannerOpen && <OCRScanner targetType="client" onClose={() => setIsScannerOpen(false)} onScanComplete={handleScanComplete} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="p-8 border-b flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-600 rounded-2xl"><Building2 size={24} /></div><div><h3 className="text-xl font-black uppercase tracking-tighter">{editingClient ? 'Modifier Client' : 'Nouveau Dossier Client'}</h3><p className="text-[10px] text-indigo-300 font-black uppercase">Standard Fiscal Algérien</p></div></div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 flex items-center"><Database size={14} className="mr-2" /> Identification Fiscale</div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Raison Sociale / Nom</label><input name="name" required defaultValue={scanData?.name || editingClient?.name} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-black uppercase text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">NIF</label><input name="nif" required defaultValue={scanData?.nif || editingClient?.nif} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white" /></div>
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Art. Imp (AI)</label><input name="ai" required defaultValue={scanData?.ai || editingClient?.ai} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">RC</label><input name="rc" required defaultValue={scanData?.rc || editingClient?.rc} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white" /></div>
                   <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">NIS</label><input name="nis" required defaultValue={scanData?.nis || editingClient?.nis} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-mono text-sm font-black text-slate-900 dark:text-white" /></div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 flex items-center"><Phone size={14} className="mr-2" /> Contact & Coordonnées</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Téléphone</label><input name="phone" required defaultValue={scanData?.phone || editingClient?.phone} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold text-slate-900 dark:text-white" /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Email</label><input name="email" type="email" defaultValue={scanData?.email || editingClient?.email} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold text-slate-900 dark:text-white" /></div>
                </div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Adresse Complète</label><textarea name="address" required defaultValue={scanData?.address || editingClient?.address} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold h-32 text-slate-900 dark:text-white outline-none focus:border-indigo-600 uppercase italic" /></div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t flex justify-end space-x-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-slate-500 font-black uppercase text-xs tracking-widest">Annuler</button>
              <button type="submit" className="px-12 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center hover:bg-indigo-700 transition-all"><Save size={18} className="mr-3" /> Valider Dossier</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ClientsModule;
