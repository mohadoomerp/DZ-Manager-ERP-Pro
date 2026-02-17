import React, { useState, useMemo } from 'react';
import { 
  Plus, CalendarDays, Clock, X, Trash2, Edit3, ArrowRight,
  LayoutDashboard, Users, Grid3X3, Map, Briefcase, Wallet, Receipt,
  UserCheck, LayoutTemplate, Palette, ScanLine, Smartphone
} from 'lucide-react';
import { formatCurrency } from '../constants';
import { EventBooking, Partner, Product, Invoice, ModuleType, User, CompanySettings, Transaction, AuditLog, Pavilion } from '../types';

// Imports des nouveaux composants modulaires
import DashboardTab from './events/tabs/DashboardTab';
import ParticipantsTab from './events/tabs/ParticipantsTab';
import StandsTab from './events/tabs/StandsTab';
import StaffTab from './events/tabs/StaffTab';
import ExpensesTab from './events/tabs/ExpensesTab';
import BillingTab from './events/tabs/BillingTab';
import VisitorsTab from './events/tabs/VisitorsTab';
import BadgeDesignerTab from './events/tabs/BadgeDesignerTab';
import FormBuilderTab from './events/tabs/FormBuilderTab';
import CheckInScannerTab from './events/tabs/CheckInScannerTab';
import EventForm from './events/components/EventForm';
import VisualPlanEditor from '../components/VisualPlanEditor';

interface EventsModuleProps {
  clients: Partner[];
  products: Product[];
  events: EventBooking[];
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  onStockUpdate: (productId: string, quantityChange: number) => void;
  onGenerateInvoice: (invoice: Invoice) => void;
  onNavigate: (module: ModuleType) => void;
  currentUser: User;
  users: User[];
  invoices: Invoice[];
  companySettings: CompanySettings;
  onTransactionAdd: (tx: Transaction) => void;
  onAddLog?: (action: AuditLog['action'], module: ModuleType, details: string) => void;
}

const DEFAULT_HALL: Pavilion = { id: 'default', name: 'Hall Principal', type: 'Hall', width: 30, depth: 20, x: 20, y: 20 };

const TABS = [
  { id: 'dashboard', label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: 'scanner', label: 'Scanner Mobile', icon: <Smartphone size={16} /> },
  { id: 'participants', label: 'Exposants', icon: <Users size={16} /> },
  { id: 'affectation', label: 'Stands', icon: <Grid3X3 size={16} /> },
  { id: 'visual_plan', label: 'Plan 2D/3D', icon: <Map size={16} /> },
  { id: 'visitors', label: 'Visiteurs', icon: <UserCheck size={16} /> },
  { id: 'registration_forms', label: 'Formulaires', icon: <LayoutTemplate size={16} /> },
  { id: 'badge_designer', label: 'Design Badge', icon: <Palette size={16} /> },
  { id: 'staff', label: 'Orga Team', icon: <Briefcase size={16} /> },
  { id: 'billing', label: 'Facturation', icon: <Receipt size={16} /> }
];

const EventsModule: React.FC<EventsModuleProps> = ({ 
  clients, products, events = [], setEvents, onStockUpdate, onGenerateInvoice, onNavigate, currentUser, users, invoices, companySettings, onTransactionAdd, onAddLog 
}) => {
  const [view, setView] = useState<'list' | 'create' | 'manage'>('list');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // États pour VisualPlanEditor
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null);
  const [selectedUtilitySpaceId, setSelectedUtilitySpaceId] = useState<string | null>(null);
  const [activePavilionId, setActivePavilionId] = useState<string>('default');

  const visibleEvents = useMemo(() => {
    let filtered = events.filter(e => !e.isDeleted);
    if (currentUser.role === 'SALES') {
      filtered = filtered.filter(event => (event.assignedAgents || []).includes(currentUser.id));
    }
    return filtered;
  }, [events, currentUser]);

  const activeEvent = useMemo(() => 
    visibleEvents.find(e => e.id === selectedEventId) || null
  , [visibleEvents, selectedEventId]);

  const getAbbreviation = (title: string) => {
    if (!title) return "EVT";
    return title.split(/[\s'-]/).filter(word => word.length > 2).map(word => word[0].toUpperCase()).join('').slice(0, 6);
  };

  const handleCreateOrUpdateEvent = (formData: any) => {
    if (!formData.title) return alert("Veuillez donner un nom à l'événement.");
    if (selectedEventId && view === 'create') {
        setEvents(prev => prev.map(ev => ev.id === selectedEventId ? { ...ev, title: formData.title, startDate: formData.startDate, endDate: formData.endDate, logoUrl: formData.logoUrl || ev.logoUrl, registrationFee: parseFloat(formData.registrationFee) || 0, updatedAt: Date.now() } : ev));
        setView('manage');
        return;
    }
    const newEvent: EventBooking = { id: `EV-${Date.now().toString().slice(-6)}`, title: formData.title, startDate: formData.startDate, endDate: formData.endDate, logoUrl: formData.logoUrl, registrationFee: parseFloat(formData.registrationFee) || 0, participants: [], items: [], stands: [], pavilions: [DEFAULT_HALL], totalAmount: 0, status: 'Confirmed', createdBy: currentUser.name, assignedAgents: currentUser.role === 'SALES' ? [currentUser.id] : [], updatedAt: Date.now(), expenses: [], utilitySpaces: [], visitors: [], exhibitorTeams: [] };
    setEvents([newEvent, ...events]);
    setSelectedEventId(newEvent.id);
    setView('manage');
    setActiveTab('dashboard');
  };

  const handleDeleteEvent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("Supprimer cet événement ?")) {
        setEvents(prev => prev.filter(ev => ev.id !== id));
    }
  };

  if (view === 'create') {
    return (
      <EventForm 
        initialData={activeEvent || undefined} 
        onSubmit={handleCreateOrUpdateEvent} 
        onCancel={() => setView(selectedEventId ? 'manage' : 'list')} 
      />
    );
  }

  if (view === 'manage' && activeEvent) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-8 duration-500 flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center space-x-3 md:space-x-5">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-2xl overflow-hidden shadow-lg shrink-0">{activeEvent.logoUrl ? <img src={activeEvent.logoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-600 flex items-center justify-center"><CalendarDays size={20}/></div>}</div>
            <div className="min-w-0">
                <h2 className="text-sm md:text-xl font-black uppercase tracking-widest flex items-center gap-2 truncate">
                    {activeEvent.title}
                    <button onClick={() => setView('create')} className="p-1 bg-white/10 hover:bg-white/20 rounded-lg transition-all shrink-0"><Edit3 size={14} /></button>
                </h2>
                <p className="text-[8px] md:text-[10px] text-indigo-300 font-bold uppercase tracking-widest truncate">ID: {activeEvent.id}</p>
            </div>
          </div>
          <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"><X size={24} /></button>
        </div>

        {/* Navigation */}
        <div className="flex bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 shrink-0 overflow-x-auto no-scrollbar scroll-smooth no-print">
           {TABS.map(tab => (
             <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center space-x-2 md:space-x-3 px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {tab.icon} <span>{tab.label}</span>
             </button>
           ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar bg-slate-50 dark:bg-slate-800/20">
           {activeTab === 'dashboard' && <DashboardTab activeEvent={activeEvent} setActiveTab={setActiveTab} products={products} />}
           {activeTab === 'participants' && <ParticipantsTab activeEvent={activeEvent} clients={clients} setEvents={setEvents} />}
           {activeTab === 'affectation' && <StandsTab activeEvent={activeEvent} setEvents={setEvents} activePavilionId={activePavilionId} />}
           {activeTab === 'visual_plan' && (
             <VisualPlanEditor 
               event={activeEvent} 
               setEvents={setEvents} 
               activePavilionId={activePavilionId}
               setActivePavilionId={setActivePavilionId}
               selectedStandId={selectedStandId}
               setSelectedStandId={setSelectedStandId}
               selectedUtilitySpaceId={selectedUtilitySpaceId}
               setSelectedUtilitySpaceId={setSelectedUtilitySpaceId}
             />
           )}
           {activeTab === 'visitors' && <VisitorsTab event={activeEvent} setEvents={setEvents} companySettings={companySettings} />}
           {activeTab === 'registration_forms' && <FormBuilderTab event={activeEvent} setEvents={setEvents} />}
           {activeTab === 'badge_designer' && <BadgeDesignerTab event={activeEvent} setEvents={setEvents} />}
           {activeTab === 'scanner' && <CheckInScannerTab event={activeEvent} setEvents={setEvents} />}
           {activeTab === 'staff' && <StaffTab activeEvent={activeEvent} users={users} setEvents={setEvents} />}
           {activeTab === 'expenses' && <ExpensesTab activeEvent={activeEvent} setEvents={setEvents} onTransactionAdd={onTransactionAdd} currentUser={currentUser} />}
           {activeTab === 'billing' && <BillingTab activeEvent={activeEvent} invoices={invoices} products={products} onGenerateInvoice={onGenerateInvoice} onNavigate={onNavigate} currentUser={currentUser} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">Gestion Événementielle</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Organisation de Foires, Salons & Locations</p>
        </div>
        <button onClick={() => { setSelectedEventId(null); setView('create'); }} className="w-full md:w-auto px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
            <Plus size={20} className="mr-3" /> Ouvrir un Dossier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleEvents.map(event => (
          <div key={event.id} onClick={() => { setSelectedEventId(event.id); setView('manage'); }} className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col cursor-pointer hover:border-indigo-500 relative">
            <div className="p-8 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
               <div className="flex items-center space-x-5 min-w-0">
                  <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    {event.logoUrl ? <img src={event.logoUrl} className="w-full h-full object-cover" /> : <CalendarDays size={28} className="text-indigo-600" />}
                  </div>
                  <div className="min-w-0">
                     <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter mb-0.5 truncate">{getAbbreviation(event.title)} • {event.id}</p>
                     <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight uppercase truncate">{event.title}</h3>
                  </div>
               </div>
               <button onClick={(e) => handleDeleteEvent(e, event.id)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm shrink-0"><Trash2 size={18} /></button>
            </div>
            
            <div className="p-8 flex-1 space-y-6">
               <div className="flex items-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest"><Clock size={14} className="mr-3 text-indigo-400" /> Du {event.startDate} au {event.endDate}</div>
               <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center">
                     <span className="text-lg font-black text-indigo-600">{(event.participants || []).length}</span>
                     <span className="text-[7px] font-black uppercase text-slate-400">Exposants</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center">
                     <span className="text-lg font-black text-emerald-600">{(event.stands || []).length}</span>
                     <span className="text-[7px] font-black uppercase text-slate-400">Stands</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center">
                     <span className="text-lg font-black text-amber-500">{(event.assignedAgents || []).length}</span>
                     <span className="text-[7px] font-black uppercase text-slate-400">Staff</span>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-900 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-indigo-300 uppercase mb-0.5 tracking-widest opacity-60">Valorisation Totale</p>
                  <p className="text-lg font-black text-white">{formatCurrency(event.totalAmount || 0)}</p>
               </div>
               <div className="p-4 bg-white/10 text-white rounded-2xl group-hover:bg-white group-hover:text-slate-900 transition-all">
                  <ArrowRight size={20} />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventsModule;