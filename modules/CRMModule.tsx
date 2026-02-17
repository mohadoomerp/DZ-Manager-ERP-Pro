
import React, { useState, useMemo, useRef } from 'react';
import { 
  Target, Plus, Search, MoreVertical, Phone, Mail, Calendar, MessageSquare, 
  ArrowRight, CheckCircle2, XCircle, Clock, Trash2, Edit3, UserPlus, Filter, 
  GripVertical, X, Camera, FileUp, Sparkles, Upload, Table as TableIcon, 
  Save, AlertTriangle, ChevronRight, ChevronLeft, CheckSquare, Square, PhoneOff,
  Ticket, Building2, MapPin, ListChecks
} from 'lucide-react';
import { Lead, LeadStatus, LeadMilestone, EventBooking, User, AuditLog, ModuleType } from '../types';
import { formatCurrency } from '../constants';
import OCRScanner from '../components/OCRScanner';

interface CRMModuleProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  onConvertToClient: (lead: Lead) => void;
  events: EventBooking[];
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
}

interface CSVMapping {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  estimatedValue: string;
  notes: string;
  eventId: string;
}

const CRM_MILESTONES = [
  "Prospect identifié (Fichier)",
  "Plaquette Salon envoyée",
  "Demande d'emplacement reçue",
  "Contrat d'exposant signé"
];

const CRMModule: React.FC<CRMModuleProps> = ({ leads, setLeads, onConvertToClient, events, currentUser, onAddLog }) => {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanData, setScanData] = useState<any>(null);

  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Filtres
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // CSV Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<CSVMapping>({
    companyName: '', contactName: '', email: '', phone: '', estimatedValue: '', notes: '', eventId: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const assignableEvents = useMemo(() => {
    if (currentUser.role === 'SALES') {
      return events.filter(event => (event.assignedAgents || []).includes(currentUser.id));
    }
    return events;
  }, [events, currentUser]);

  const assignableEventIds = useMemo(() => new Set(assignableEvents.map(e => e.id)), [assignableEvents]);

  const statuses: { id: LeadStatus, label: string, color: string }[] = [
    { id: 'New', label: 'Nouveau', color: 'bg-blue-500' },
    { id: 'Qualified', label: 'Contacté', color: 'bg-indigo-500' },
    { id: 'Proposal', label: 'Offre envoyée', color: 'bg-amber-500' },
    { id: 'Negotiation', label: 'Attente de réponse', color: 'bg-purple-500' },
    { id: 'Won', label: 'Gagné (Exposant)', color: 'bg-emerald-500' },
    { id: 'Lost', label: 'Sans Suite', color: 'bg-rose-500' }
  ];

  const filteredLeads = useMemo(() => {
    let roleFilteredLeads = leads;
    if (currentUser.role === 'SALES') {
      roleFilteredLeads = leads.filter(lead => !lead.eventId || (lead.eventId && assignableEventIds.has(lead.eventId)));
    }

    return roleFilteredLeads.filter(lead => {
      const eventMatch = filterEvent === 'all' || lead.eventId === filterEvent;
      const statusMatch = filterStatus === 'all' || lead.status === filterStatus;
      return eventMatch && (view === 'kanban' || statusMatch);
    });
  }, [leads, filterEvent, filterStatus, view, currentUser.role, assignableEventIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkStatusChange = (newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => 
      selectedLeadIds.includes(l.id) 
      ? { ...l, status: newStatus, lastActivity: new Date().toISOString().split('T')[0], updatedAt: Date.now() } 
      : l
    ));
    onAddLog('UPDATE', ModuleType.CRM, `Mise à jour statut en masse (${selectedLeadIds.length} prospects)`);
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = () => {
    if (confirm(`Supprimer ${selectedLeadIds.length} prospects ?`)) {
      setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
      onAddLog('DELETE', ModuleType.CRM, `Suppression en masse (${selectedLeadIds.length} prospects)`);
      setSelectedLeadIds([]);
    }
  };

  const handleBulkEventChange = (newEventId: string) => {
    setLeads(prev => prev.map(l =>
      selectedLeadIds.includes(l.id)
      ? { ...l, eventId: newEventId, updatedAt: Date.now() }
      : l
    ));
    onAddLog('UPDATE', ModuleType.CRM, `Affectation événement en masse (${selectedLeadIds.length} prospects)`);
    setSelectedLeadIds([]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('leadId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (dragOverStatus !== statusId) {
      setDragOverStatus(statusId);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId') || draggedLeadId;
    setDragOverStatus(null);
    setDraggedLeadId(null);

    if (leadId) {
      updateLeadStatus(leadId, newStatus);
    }
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStatus(null);
  };


  const handleSaveLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const initialMilestones: LeadMilestone[] = CRM_MILESTONES.map(m => ({
      id: `m-${Math.random().toString(36).substr(2, 5)}`,
      label: m,
      completed: false
    }));

    const leadData: Lead = {
      id: editingLead?.id || `LEAD-${Date.now()}`,
      companyName: (formData.get('companyName') as string).toUpperCase(),
      contactName: formData.get('contactName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      status: (formData.get('status') as LeadStatus) || 'New',
      estimatedValue: parseFloat(formData.get('estimatedValue') as string) || 0,
      eventId: formData.get('eventId') as string,
      source: formData.get('source') as string || 'Prospection Directe',
      createdAt: editingLead?.createdAt || new Date().toISOString().split('T')[0],
      lastActivity: new Date().toISOString().split('T')[0],
      notes: formData.get('notes') as string,
      updatedAt: Date.now(),
      milestones: editingLead?.milestones || initialMilestones
    };

    if (editingLead) {
      setLeads(leads.map(l => l.id === editingLead.id ? leadData : l));
      onAddLog('UPDATE', ModuleType.CRM, `Mise à jour prospect ${leadData.companyName}`);
    } else {
      setLeads([leadData, ...leads]);
      onAddLog('CREATE', ModuleType.CRM, `Nouveau prospect ${leadData.companyName}`);
    }
    setIsModalOpen(false);
    setScanData(null);
    setEditingLead(null);
  };

  const updateLeadStatus = (id: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus, lastActivity: new Date().toISOString().split('T')[0], updatedAt: Date.now() } : l));
    const lead = leads.find(l => l.id === id);
    if(lead) onAddLog('UPDATE', ModuleType.CRM, `Statut ${lead.companyName} : ${newStatus}`);
  };

  const markAsUnreachable = (id: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        const time = new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' });
        const newNote = `[ALERTE] Injoignable le ${new Date().toLocaleDateString()} à ${time}\n${l.notes}`;
        return { 
          ...l, 
          status: 'Qualified',
          notes: newNote,
          updatedAt: Date.now() 
        };
      }
      return l;
    }));
    const lead = leads.find(l => l.id === id);
    if(lead) onAddLog('UPDATE', ModuleType.CRM, `Signalé injoignable : ${lead.companyName}`);
    alert("Marqué comme injoignable. Remarque ajoutée à l'historique.");
  };

  const moveLead = (id: string, direction: 'prev' | 'next') => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const currentIndex = statuses.findIndex(s => s.id === lead.status);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    if (nextIndex >= 0 && nextIndex < statuses.length) {
      updateLeadStatus(id, statuses[nextIndex].id);
    }
  };

  const toggleMilestone = (leadId: string, milestoneId: string) => {
    setLeads(prev => prev.map(l => {
      if (l.id === leadId && l.milestones) {
        return {
          ...l,
          updatedAt: Date.now(),
          milestones: l.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
        };
      }
      return l;
    }));
  };

  const handleScanComplete = (data: any) => {
    setScanData({
      companyName: data.name || '',
      contactName: data.contactName || '',
      email: data.email || '',
      phone: data.phone || '',
      notes: data.address || ''
    });
    setIsModalOpen(true);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeImport = () => {
    if (!mapping.companyName) return alert("La Raison Sociale est obligatoire pour le mapping.");

    const newLeads: Lead[] = csvData.map((row, idx) => {
       const milestones: LeadMilestone[] = CRM_MILESTONES.map(m => ({
          id: `m-imp-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          label: m,
          completed: false
       }));

       return {
          id: `L-IMP-${Date.now()}-${idx}`,
          companyName: (row[mapping.companyName] || 'PROSPECT SANS NOM').toUpperCase(),
          contactName: mapping.contactName ? row[mapping.contactName] : 'À DETERMINER',
          email: mapping.email ? row[mapping.email] : '',
          phone: mapping.phone ? row[mapping.phone] : '',
          status: 'New',
          estimatedValue: mapping.estimatedValue ? parseFloat(row[mapping.estimatedValue].replace(/[^0-9.]/g, '')) || 0 : 0,
          source: 'Importation de Fichier',
          createdAt: new Date().toISOString().split('T')[0],
          lastActivity: new Date().toISOString().split('T')[0],
          notes: mapping.notes ? row[mapping.notes] : '',
          eventId: mapping.eventId ? row[mapping.eventId] : '',
          updatedAt: Date.now(),
          milestones
       };
    });

    setLeads([...newLeads, ...leads]);
    onAddLog('CREATE', ModuleType.CRM, `Importation CSV : ${newLeads.length} prospects`);
    setIsImportModalOpen(false);
    alert(`${newLeads.length} prospects importés avec succès !`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">CRM Commercial</h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Gestion des prospects & Pipeline de vente</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm">
             <FileUp size={16} className="mr-2 text-indigo-500" /> Import Fichier Clients
          </button>
          <button onClick={() => setIsScannerOpen(true)} className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center hover:bg-indigo-100 transition-all shadow-sm">
             <Camera size={18} className="mr-2" /> <span className="text-[10px] font-black uppercase">Scanner Carte</span>
          </button>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <button onClick={() => setView('kanban')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'kanban' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Pipeline</button>
             <button onClick={() => setView('list')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Registre</button>
          </div>
          <button onClick={() => { setEditingLead(null); setScanData(null); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-700 transition-all">
            <Plus size={18} className="mr-3" /> Nouveau Prospect
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-4 w-full">
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="w-full md:w-auto px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none">
              <option value="all">Tous les événements</option>
              {assignableEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            {view === 'list' && (
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full md:w-auto px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none">
                  <option value="all">Tous les statuts</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            )}
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex space-x-6 overflow-x-auto pb-10 custom-scrollbar min-h-[75vh]">
          {statuses.map(status => (
            <div 
              key={status.id} 
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDrop={(e) => handleDrop(e, status.id)}
              className={`flex-shrink-0 w-80 space-y-4 transition-colors p-2 rounded-3xl ${dragOverStatus === status.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800' : ''}`}
            >
              <div className="flex items-center justify-between px-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center space-x-3">
                   <div className={`w-3 h-3 rounded-full ${status.color} shadow-lg shadow-${status.color.split('-')[1]}-500/20`}></div>
                   <h3 className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">{status.label}</h3>
                 </div>
                 <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-full text-[9px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                   {filteredLeads.filter(l => l.status === status.id).length}
                 </span>
              </div>

              <div className="space-y-4 min-h-[500px]">
                {filteredLeads.filter(l => l.status === status.id).map(lead => {
                  const eventName = events.find(e => e.id === lead.eventId)?.title;
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <div 
                      key={lead.id} 
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white dark:bg-slate-900 p-6 rounded-[32px] border shadow-sm group hover:shadow-xl hover:border-indigo-500 transition-all animate-in zoom-in-95 relative overflow-hidden cursor-grab active:cursor-grabbing 
                        ${draggedLeadId === lead.id ? 'opacity-40 scale-95 shadow-inner' : 'opacity-100'}
                        ${isSelected ? 'border-indigo-600 border-2' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(lead.id)} className="w-5 h-5 accent-indigo-600 rounded" />
                      </div>

                      {eventName && (
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 rounded-bl-xl text-[7px] font-black uppercase tracking-widest flex items-center">
                           <Ticket size={8} className="mr-1"/> {eventName}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                         <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1 uppercase group-hover:text-indigo-600 transition-colors pl-8" onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}>{lead.companyName}</h4>
                         <div className="flex space-x-1">
                            <button onClick={() => { setEditingLead(lead); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={14}/></button>
                            <button onClick={() => { if(confirm('Supprimer ce dossier ?')) { setLeads(leads.filter(x => x.id !== lead.id)); onAddLog('DELETE', ModuleType.CRM, `Suppression ${lead.companyName}`); } }} className="p-1.5 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={14}/></button>
                         </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-tighter"><Target size={12} className="mr-2 text-indigo-500" /> {lead.contactName}</div>
                        <a href={`tel:${lead.phone}`} className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors group/link">
                            <Phone size={12} className="ml-0.5 mr-2.5 shrink-0 text-slate-400 group-hover/link:text-indigo-400 transition-colors" />
                            <span className="truncate">{lead.phone || 'Non renseigné'}</span>
                        </a>
                        <a href={`mailto:${lead.email}`} className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors group/link truncate">
                            <Mail size={12} className="ml-0.5 mr-2.5 shrink-0 text-slate-400 group-hover/link:text-indigo-400 transition-colors" />
                            <span className="truncate">{lead.email || 'Non renseigné'}</span>
                        </a>
                      </div>
                      
                      <div className="space-y-1.5 mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                         {(lead.milestones || []).map(m => (
                           <button key={m.id} onClick={() => toggleMilestone(lead.id, m.id)} className="flex items-center w-full group/milestone transition-all hover:bg-white dark:hover:bg-slate-700 p-1 rounded-lg">
                              {m.completed ? <CheckSquare size={14} className="text-indigo-600 mr-2 shrink-0" /> : <Square size={14} className="text-slate-300 mr-2 shrink-0 group-hover/milestone:text-indigo-400" />}
                              <span className={`text-[9px] font-black uppercase text-left ${m.completed ? 'text-slate-500 line-through decoration-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</span>
                           </button>
                         ))}
                         <div className="mt-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-500" 
                              style={{ width: `${((lead.milestones?.filter(m => m.completed).length || 0) / (lead.milestones?.length || 1)) * 100}%` }}
                            ></div>
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                         <p className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-lg">
                            {lead.estimatedValue > 0 ? formatCurrency(lead.estimatedValue) : 'Potentiel à définir'}
                         </p>
                         <div className="flex space-x-1">
                            <button onClick={() => moveLead(lead.id, 'prev')} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all"><ChevronLeft size={14} /></button>
                            <button onClick={() => moveLead(lead.id, 'next')} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 flex items-center justify-center border border-slate-100 dark:border-slate-700 transition-all"><ChevronRight size={14} /></button>
                            {lead.status === 'Qualified' && (
                               <button onClick={() => markAsUnreachable(lead.id)} className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center border border-rose-100 dark:border-rose-800 transition-all" title="Injoignable (Ajouter remarque automatique)"><PhoneOff size={14} /></button>
                            )}
                            {lead.status === 'Won' ? (
                               <button onClick={() => onConvertToClient(lead)} className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20" title="Convertir en Exposant Client"><UserPlus size={14}/></button>
                            ) : (
                               <button onClick={() => updateLeadStatus(lead.id, 'Won')} className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all border border-slate-100 dark:border-slate-700" title="Contrat Signé !"><CheckCircle2 size={14} /></button>
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                    <th className="px-8 py-5 w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0} className="w-5 h-5 accent-indigo-600 rounded" /></th>
                    <th className="px-8 py-5">Prospect / Salon</th>
                    <th className="px-8 py-5">Contact</th>
                    <th className="px-8 py-5">Statut</th>
                    <th className="px-8 py-5">Potentiel</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredLeads.map(l => {
                  const eventName = events.find(e => e.id === l.eventId)?.title;
                  const isSelected = selectedLeadIds.includes(l.id);
                  return (
                    <tr key={l.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <td className="px-8 py-5"><input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(l.id)} className="w-5 h-5 accent-indigo-600 rounded" /></td>
                      <td className="px-8 py-5 font-black text-slate-700 dark:text-slate-300 cursor-pointer" onClick={() => { setEditingLead(l); setIsModalOpen(true); }}>
                         <p className="text-sm uppercase group-hover:text-indigo-600 transition-colors">{l.companyName}</p>
                         <p className="text-[9px] opacity-40 uppercase tracking-tighter font-bold flex items-center">
                           <Ticket size={10} className="mr-1 text-indigo-500" /> {eventName || 'Général'}
                         </p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase">{l.contactName}</p>
                        <div className="mt-1 space-y-1">
                            <div className="flex items-center text-[9px] font-bold text-slate-500"><Phone size={10} className="mr-2 shrink-0" /> {l.phone || 'N/A'}</div>
                            <div className="flex items-center text-[9px] font-bold text-slate-500 truncate"><Mail size={10} className="mr-2 shrink-0" /> {l.email || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase text-white shadow-lg shadow-${statuses.find(s => s.id === l.status)?.color.split('-')[1]}-500/20 ${statuses.find(s => s.id === l.status)?.color}`}>
                           {statuses.find(s => s.id === l.status)?.label}
                         </span>
                      </td>
                      <td className="px-8 py-5 font-black text-indigo-600">{l.estimatedValue > 0 ? formatCurrency(l.estimatedValue) : '-- DA'}</td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                            {l.status === 'Won' && (
                              <button onClick={(e) => { e.stopPropagation(); onConvertToClient(l); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center shadow-lg hover:bg-emerald-700"><UserPlus size={14} className="mr-2" /> Créer Client</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setEditingLead(l); setIsModalOpen(true); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-xl border border-slate-100 dark:border-slate-700"><Edit3 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Révoquer ce dossier ?')) { setLeads(leads.filter(x => x.id !== l.id)); onAddLog('DELETE', ModuleType.CRM, `Suppression ${l.companyName}`); } }} className="p-3 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-500 rounded-xl border border-slate-100 dark:border-slate-700"><Trash2 size={16} /></button>
                         </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
           </table>
        </div>
      )}

      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-100 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center space-x-6 animate-in slide-in-from-bottom-8">
          <span className="text-sm font-black px-4">{selectedLeadIds.length} prospect(s) sélectionné(s)</span>
          <div className="flex items-center space-x-2">
            <select
              onChange={e => { if (e.target.value) handleBulkEventChange(e.target.value); }}
              className="bg-slate-700 text-white rounded-xl px-4 py-3 text-xs font-black uppercase outline-none"
            >
              <option value="">Affecter à un événement...</option>
              {assignableEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
            <select
              onChange={e => { if (e.target.value) handleBulkStatusChange(e.target.value as LeadStatus); }}
              className="bg-slate-700 text-white rounded-xl px-4 py-3 text-xs font-black uppercase outline-none"
            >
              <option value="">Changer statut...</option>
              {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button onClick={handleBulkDelete} className="p-3 bg-rose-500 rounded-xl hover:bg-rose-600"><Trash2 size={16} /></button>
          </div>
          <button onClick={() => setSelectedLeadIds([])} className="p-3 bg-slate-700 rounded-full hover:bg-slate-600"><X size={16} /></button>
        </div>
      )}

      {/* MODAL IMPORT CRM CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[48px] shadow-2xl overflow-hidden">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl"><Upload size={24} /></div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-widest">Importation de masse (Prospects)</h3>
                      <p className="text-[10px] text-indigo-300 font-bold uppercase">{csvData.length} dossiers détectés</p>
                   </div>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
             </div>
             <div className="p-10">
                <div className="grid grid-cols-2 gap-8 mb-10">
                   <div className="space-y-4">
                      {(['companyName', 'contactName', 'email', 'phone', 'estimatedValue', 'notes', 'eventId'] as const).map(field => (
                        <div key={field} className="flex flex-col space-y-1">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Mappage : {field}</label>
                          <select 
                            value={(mapping as any)[field]} 
                            onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- Ignorer --</option>
                            {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Conseils d'import</h4>
                      <ul className="text-[10px] font-bold text-slate-500 uppercase space-y-3">
                        <li className="flex items-start"><CheckCircle2 size={14} className="mr-2 text-emerald-500 shrink-0" /> Raison Sociale requise.</li>
                        <li className="flex items-start"><CheckCircle2 size={14} className="mr-2 text-emerald-500 shrink-0" /> L'ID d'événement doit correspondre à celui dans le système.</li>
                        <li className="flex items-start"><CheckCircle2 size={14} className="mr-2 text-emerald-500 shrink-0" /> Nouveau lead = Statut "NOUVEAU".</li>
                      </ul>
                   </div>
                </div>
                <div className="flex justify-end space-x-4">
                   <button onClick={() => setIsImportModalOpen(false)} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest">Annuler</button>
                   <button onClick={executeImport} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center hover:bg-indigo-700 active:scale-95 transition-all">
                      <Save size={18} className="mr-3" /> Lancer l'importation
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isScannerOpen && <OCRScanner targetType="client" onClose={() => setIsScannerOpen(false)} onScanComplete={handleScanComplete} />}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleSaveLead} className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20"><Ticket size={24} /></div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-widest">{editingLead ? 'Modifier Dossier' : 'Nouveau Dossier Prospect'}</h3>
                      <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1">Saisie de dossier salon</p>
                   </div>
                </div>
                <button type="button" onClick={() => { setIsModalOpen(false); setScanData(null); setEditingLead(null); }} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
             </div>
             
             <div className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Raison Sociale / Prospect</label>
                      <input name="companyName" required defaultValue={scanData?.companyName || editingLead?.companyName} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 uppercase" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Événement Concerné (Salon)</label>
                      <select name="eventId" defaultValue={editingLead?.eventId} className="w-full px-5 py-4 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-indigo-100 dark:border-indigo-800 rounded-2xl font-black text-indigo-600 outline-none uppercase">
                        <option value="">Général / Non Spécifié</option>
                        {assignableEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Interlocuteur</label>
                      <input name="contactName" required defaultValue={scanData?.contactName || editingLead?.contactName} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Téléphone</label>
                      <input name="phone" required defaultValue={scanData?.phone || editingLead?.phone} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600" />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Statut Pipeline</label>
                      <select name="status" defaultValue={editingLead?.status || 'New'} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600">
                        {statuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Valeur Potentielle (DA) - Facultatif</label>
                      <input name="estimatedValue" type="number" defaultValue={editingLead?.estimatedValue} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-emerald-600 outline-none" />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Remarques / Historique des échanges</label>
                   <textarea name="notes" defaultValue={scanData?.notes || editingLead?.notes} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold h-32 outline-none focus:border-indigo-600" />
                </div>
             </div>

             <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-4 shadow-inner">
                <button type="button" onClick={() => { setIsModalOpen(false); setScanData(null); setEditingLead(null); }} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest">Annuler</button>
                <button type="submit" className="px-12 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all flex items-center"><Save size={18} className="mr-3" /> Enregistrer Dossier</button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default CRMModule;
