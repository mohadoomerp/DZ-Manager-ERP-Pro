
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { ModuleType, Partner, Product, Employee, Invoice, Transaction, Purchase, EventBooking, AttendanceRecord, User, LicenseInfo, SessionInfo, CompanySettings, Lead, GeneratedLicense, AuditLog, DailyClosing, Candidate, TimeClockLog, AppNotification } from './types';
import { MENU_ITEMS, ROLE_PERMISSIONS, formatCurrency } from './constants';
import { Language, translations } from './translations';
import Sidebar from './components/Sidebar';
import Dashboard from './modules/Dashboard';
import EventsModule from './modules/EventsModule';
import InventoryModule from './modules/InventoryModule';
import HRModule from './modules/HRModule/index';
import FinanceModule from './modules/FinanceModule';
import PurchasesModule from './modules/PurchasesModule';
import AccountingModule from './modules/AccountingModule';
import SettingsModule from './modules/SettingsModule';
import SalesModule from './modules/sales';
import RetailModule from './modules/RetailModule';
import ClientsModule from './modules/ClientsModule';
import SuppliersModule from './modules/SuppliersModule';
import UsersModule from './modules/UsersModule';
import CRMModule from './modules/CRMModule';
import OperationsModule from './modules/OperationsModule';
import LicenseGeneratorModule from './modules/LicenseGeneratorModule';
import TimeClockModule from './modules/TimeClockModule';
import AIAssistant from './components/AIAssistant';
import LoginScreen from './components/LoginScreen';
import LicenseGate from './components/LicenseGate';
import NotificationToast from './components/NotificationToast';
import { ChevronLeft, Sparkles, RefreshCw, LogOut, Server, Laptop, Languages, Palette, CloudLightning, Menu as MenuIcon, Usb, Save, Wifi, WifiOff, DatabaseZap, AlertTriangle, ScanBarcode } from 'lucide-react';

const DEFAULT_ADMIN_USER: User = { 
  id: 'u1', 
  username: 'admin', 
  name: 'Administrateur', 
  role: 'ADMIN', 
  email: 'admin@dz-manager.dz', 
  password: 'admin', 
  active: true,
  updatedAt: 1700000000000 
};

export type ThemeType = 'indigo' | 'emerald' | 'rose' | 'midnight' | 'slate';

const safeJSONParse = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
};

const idb = {
  dbName: 'dz_manager_storage',
  storeName: 'handles',
  getDB: () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(idb.dbName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(idb.storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }),
  set: async (key: string, val: any) => {
    const db = await idb.getDB();
    const tx = db.transaction(idb.storeName, 'readwrite');
    tx.objectStore(idb.storeName).put(val, key);
    return new Promise<void>((resolve) => tx.oncomplete = () => resolve());
  },
  get: async (key: string) => {
    const db = await idb.getDB();
    const tx = db.transaction(idb.storeName, 'readonly');
    const request = tx.objectStore(idb.storeName).get(key);
    return new Promise((resolve) => request.onsuccess = () => resolve(request.result));
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem('is_authenticated') === 'true');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'fr');
  const [theme, setTheme] = useState<ThemeType>(() => (localStorage.getItem('app_theme') as ThemeType) || 'indigo');
  const [activeModule, setActiveModule] = useState<ModuleType>(ModuleType.DASHBOARD);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'writing' | 'error' | 'success'>('idle');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [devModeActive, setDevModeActive] = useState(() => sessionStorage.getItem('dev_mode_active') === 'true');

  const t = translations[language];
  const isRtl = language === 'ar';

  const [license, setLicense] = useState<LicenseInfo | null>(() => safeJSONParse('erp_license', null));
  const [currentUser, setCurrentUser] = useState<User>(() => safeJSONParse('current_user', DEFAULT_ADMIN_USER));
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    if (license?.networkRole === 'HUB') {
      idb.get('mirror_dir_handle').then(handle => { if (handle) setDirHandle(handle); }).catch(e => {});
    }
  }, [license]);

  const loadData = (key: string, def: any) => {
    const parsed = safeJSONParse(`dz_data_${key}`, def);
    if (key === 'users' && (!parsed || parsed.length === 0)) return [DEFAULT_ADMIN_USER];
    return parsed;
  };

  const [users, setUsers] = useState<User[]>(() => loadData('users', [DEFAULT_ADMIN_USER]));
  const [clients, setClients] = useState<Partner[]>(() => loadData('clients', []));
  const [suppliers, setSuppliers] = useState<Partner[]>(() => loadData('suppliers', []));
  const [products, setProducts] = useState<Product[]>(() => loadData('products', []));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadData('invoices', []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadData('transactions', []));
  const [closings, setClosings] = useState<DailyClosing[]>(() => loadData('closings', [])); 
  const [purchases, setPurchases] = useState<Purchase[]>(() => loadData('purchases', []));
  const [events, setEvents] = useState<EventBooking[]>(() => loadData('events', []));
  const [employees, setEmployees] = useState<Employee[]>(() => loadData('employees', []));
  const [candidates, setCandidates] = useState<Candidate[]>(() => loadData('candidates', []));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadData('attendance', []));
  const [timeClockLogs, setTimeClockLogs] = useState<TimeClockLog[]>(() => loadData('time_clock_logs', []));
  const [leads, setLeads] = useState<Lead[]>(() => loadData('leads', []));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadData('audit_logs', []));
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => safeJSONParse('company_settings', { id: 'default', name: "ENTREPRISE ALGERIENNE", legalForm: "SARL", address: "Alger", wilaya: "Alger", commune: "Alger", phone: "", email: "", rc: "", nif: "", ai: "", nis: "", capital: "", rib: "" }));
  const [licenseHistory, setLicenseHistory] = useState<GeneratedLicense[]>(() => safeJSONParse('erp_license_history', []));

  const [networkStatus, setNetworkStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'retrying'>('disconnected');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const workstationConnRef = useRef<DataConnection | null>(null);
  
  const isIncomingUpdate = useRef(false);
  const pendingSync = useRef(false);
  const myPeerId = useRef<string>('');
  const retryTimeoutRef = useRef<any>(null);
  const isInitializing = useRef<boolean>(false);
  const allDataForSync = useRef<any>(null);
  
  const heartbeatIntervalRef = useRef<any>(null);
  const heartbeatTimeoutRef = useRef<any>(null);
  const lastPingRef = useRef<number>(Date.now());

  useEffect(() => {
      allDataForSync.current = { clients, suppliers, products, invoices, transactions, closings, purchases, events, employees, candidates, attendance, timeClockLogs, companySettings, users, leads, auditLogs };
  }, [clients, suppliers, products, invoices, transactions, closings, purchases, events, employees, candidates, attendance, timeClockLogs, companySettings, users, leads, auditLogs]);

  const addNotification = (message: string, type: AppNotification['type'] = 'info', user?: string) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      setNotifications(prev => [...prev, { id, message, type, timestamp: Date.now(), user }]);
  };
  const removeNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const addAuditLog = useCallback((action: AuditLog['action'], module: ModuleType, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      module,
      details
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 1000));
  }, [currentUser]);

  const handleSoftDelete = useCallback((id: string, setter: React.Dispatch<React.SetStateAction<any[]>>, moduleName: ModuleType, itemName: string) => {
      if (confirm(`Confirmer la mise à la corbeille de : ${itemName} ?`)) {
          setter(prev => prev.map(item => item.id === id ? { ...item, isDeleted: true, updatedAt: Date.now() + 100 } : item));
          addAuditLog('DELETE', moduleName, `Mise à la corbeille : ${itemName}`);
      }
  }, [addAuditLog]);

  const mergeData = (local: any[], incoming: any[]) => {
    if (!incoming) return local;
    const map = new Map();
    (local || []).forEach(item => map.set(item.id, item));
    let hasChanges = false;
    incoming.forEach(item => {
      const existing = map.get(item.id);
      if (!existing || (item.updatedAt && item.updatedAt > (existing.updatedAt || 0))) {
        map.set(item.id, item);
        hasChanges = true;
      }
    });
    return hasChanges ? Array.from(map.values()) : local;
  };
  
  const forceNetworkReset = useCallback(() => {
      isInitializing.current = false;
      if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; }
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (heartbeatTimeoutRef.current) clearInterval(heartbeatTimeoutRef.current);
      setNetworkStatus('connecting');
      setTimeout(() => initNetwork(), 500);
  }, []);

  const handleIncomingData = useCallback((data: any, conn: DataConnection) => {
    if (license?.networkRole === 'WORKSTATION' && data.type === 'HEARTBEAT_PING') {
        lastPingRef.current = Date.now();
        return;
    }
    
    if (data.type === 'DATA_SYNC' || data.type === 'FULL_PUSH') {
      if (data.sourcePeerId === myPeerId.current) return;
      isIncomingUpdate.current = true;
      setIsSyncing(true);
      const p = data.payload;
      if (p.auditLogs && p.auditLogs.length > 0) {
          const incomingLatestLog: AuditLog = p.auditLogs[0];
          const localLatestLog: AuditLog | undefined = auditLogs[0];
          if (!localLatestLog || (incomingLatestLog.id !== localLatestLog.id && incomingLatestLog.timestamp > localLatestLog.timestamp)) {
             if (incomingLatestLog.userId !== currentUser.id) {
                 addNotification(incomingLatestLog.details, incomingLatestLog.action === 'DELETE' ? 'warning' : 'info', incomingLatestLog.userName);
             }
          }
      }
      if (p.users) setUsers(prev => mergeData(prev, p.users));
      if (p.clients) setClients(prev => mergeData(prev, p.clients));
      if (p.suppliers) setSuppliers(prev => mergeData(prev, p.suppliers));
      if (p.products) setProducts(prev => mergeData(prev, p.products));
      if (p.invoices) setInvoices(prev => mergeData(prev, p.invoices));
      if (p.transactions) setTransactions(prev => mergeData(prev, p.transactions));
      if (p.closings) setClosings(prev => mergeData(prev, p.closings));
      if (p.purchases) setPurchases(prev => mergeData(prev, p.purchases));
      if (p.events) setEvents(prev => mergeData(prev, p.events));
      if (p.leads) setLeads(prev => mergeData(prev, p.leads));
      if (p.employees) setEmployees(prev => mergeData(prev, p.employees));
      if (p.candidates) setCandidates(prev => mergeData(prev, p.candidates));
      if (p.attendance) setAttendance(prev => mergeData(prev, p.attendance));
      if (p.timeClockLogs) setTimeClockLogs(prev => mergeData(prev, p.timeClockLogs));
      if (p.auditLogs) setAuditLogs(prev => mergeData(prev, p.auditLogs));
      if (p.companySettings) setCompanySettings(p.companySettings);

      if (license?.networkRole === 'HUB' && data.type === 'DATA_SYNC') {
        const senderId = data.sourcePeerId;
        connectionsRef.current.forEach(c => {
          if (c.open && c.peer !== conn.peer && c.peer !== senderId) { c.send(data); }
        });
      }
      setTimeout(() => { isIncomingUpdate.current = false; setIsSyncing(false); }, 2000); 
    }
  }, [license?.networkRole, auditLogs, currentUser.id]);

  const connectToHub = useCallback(() => {
    if (!peerRef.current || peerRef.current.destroyed || license?.networkRole !== 'WORKSTATION' || !license.databaseId) return;
    setNetworkStatus('connecting');
    if (workstationConnRef.current) { try { workstationConnRef.current.close(); } catch (e) {} workstationConnRef.current = null; }
    const hubId = `dz-erp-hub-${license.databaseId}`;
    const conn = peerRef.current.connect(hubId, { reliable: true, metadata: { userId: currentUser.id, userName: currentUser.name } });
    workstationConnRef.current = conn;
    
    (conn as any).on('open', () => { 
        setNetworkStatus('connected'); 
        addNotification("Connecté au Hub Central", "success");
        lastPingRef.current = Date.now();
        if (heartbeatTimeoutRef.current) clearInterval(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setInterval(() => {
            if (Date.now() - lastPingRef.current > 35000) {
                addNotification("Liaison Hub perdue, reconnexion...", "warning");
                forceNetworkReset();
            }
        }, 10000);
    });
    
    (conn as any).on('data', (data: any) => handleIncomingData(data, conn));
    (conn as any).on('close', () => { setNetworkStatus('disconnected'); workstationConnRef.current = null; if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = setTimeout(connectToHub, 5000); });
    (conn as any).on('error', (err: any) => { 
        setNetworkStatus('disconnected');
        workstationConnRef.current = null; 
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); 
        retryTimeoutRef.current = setTimeout(connectToHub, 5000); 
    });
  }, [license, handleIncomingData, currentUser.id, currentUser.name, forceNetworkReset]);

  const initNetwork = useCallback(() => {
    if (!license) return;
    if (isInitializing.current) return;
    isInitializing.current = true;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (peerRef.current) { if (!peerRef.current.destroyed) { peerRef.current.destroy(); } peerRef.current = null; }

    setTimeout(() => {
        const peerId = license.networkRole === 'HUB' ? `dz-erp-hub-${license.databaseId}` : `dz-erp-station-${currentUser.id}-${Math.random().toString(36).substr(2, 5)}`;
        myPeerId.current = peerId;
        const peer = new Peer(peerId, { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } });
        peerRef.current = peer;
        (peer as any).on('open', (id: string) => { 
            isInitializing.current = false; 
            if (license.networkRole === 'HUB') { 
                setNetworkStatus('connected');
                if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = setInterval(() => {
                    connectionsRef.current.forEach(c => {
                        if (c.open) c.send({ type: 'HEARTBEAT_PING' });
                    });
                }, 15000);
            } else { 
                connectToHub(); 
            } 
        });
        (peer as any).on('connection', (conn: DataConnection) => {
          (conn as any).on('open', () => {
            if (license.networkRole === 'HUB') {
              connectionsRef.current.push(conn);
              const metadata = conn.metadata as any;
              setActiveSessions(prev => [...prev.filter(s => s.sessionId !== conn.peer), { sessionId: conn.peer, userName: metadata?.userName || 'Utilisateur', deviceName: 'Poste Client', lastActive: new Date().toISOString(), dbId: license.databaseId, status: 'online' }]);
              addNotification(`Nouveau poste connecté : ${metadata?.userName || 'Client'}`, 'success');
              setTimeout(() => { if (conn.open) { conn.send({ type: 'FULL_PUSH', payload: allDataForSync.current, sourcePeerId: myPeerId.current }); } }, 500);
            }
          });
          (conn as any).on('data', (data: any) => handleIncomingData(data, conn));
          (conn as any).on('close', () => { if (license.networkRole === 'HUB') { connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer); setActiveSessions(prev => prev.filter(s => s.sessionId !== conn.peer)); } });
        });
        (peer as any).on('error', (err: any) => {
          console.warn("PeerJS Error:", err.type);

          // Cas spécifique : ID Hub introuvable (Hub éteint ou pas encore prêt)
          if (err.type === 'peer-unavailable') {
             if (license.networkRole === 'WORKSTATION') {
                 // On reste connecté au serveur, mais on réessaie de joindre le Hub
                 setNetworkStatus('retrying'); 
                 if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                 retryTimeoutRef.current = setTimeout(connectToHub, 5000);
             }
             return;
          }

          if (['network', 'disconnected', 'socket-error', 'socket-closed', 'server-error'].includes(err.type)) {
             setNetworkStatus('disconnected');
             if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
             retryTimeoutRef.current = setTimeout(() => { 
                 if (peerRef.current && !peerRef.current.destroyed) { 
                     try { peerRef.current.reconnect(); } catch(e) { initNetwork(); } 
                 } else {
                     initNetwork();
                 }
             }, 5000);
             return;
          }

          isInitializing.current = false; 
          
          if (err.type === 'unavailable-id') {
              setNetworkStatus('retrying');
              if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
              retryTimeoutRef.current = setTimeout(() => { 
                  if (peerRef.current) { try { peerRef.current.destroy(); } catch(e){} peerRef.current = null; } 
                  initNetwork(); 
              }, 3000); 
          } 
        });
        (peer as any).on('disconnected', () => { if (peer && !peer.destroyed) { setNetworkStatus('retrying'); try { peer.reconnect(); } catch(e) {} } else { setNetworkStatus('disconnected'); } });
    }, 200);
  }, [license, currentUser.id, handleIncomingData, connectToHub, forceNetworkReset]);

  useEffect(() => {
    initNetwork();
    const handleUnload = () => { 
        if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null; } 
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        if (heartbeatTimeoutRef.current) clearInterval(heartbeatTimeoutRef.current);
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => { window.removeEventListener('beforeunload', handleUnload); if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current); handleUnload(); };
  }, [license?.databaseId, license?.networkRole, initNetwork]);

  const broadcastData = useCallback((payload: any) => {
    if (!license) return;
    const message = { type: 'DATA_SYNC', payload, senderId: currentUser.id, sourcePeerId: myPeerId.current, timestamp: Date.now() };
    if (license.networkRole === 'HUB') { connectionsRef.current.forEach(c => { if (c.open) c.send(message); }); } 
    else if (license.networkRole === 'WORKSTATION' && workstationConnRef.current?.open) { workstationConnRef.current.send(message); }
  }, [license, currentUser.id]);

  useEffect(() => {
    if (!license) return;
    const save = (k: string, d: any) => localStorage.setItem(`dz_data_${k}`, JSON.stringify(d));
    save('clients', clients);
    save('suppliers', suppliers);
    save('products', products);
    save('invoices', invoices);
    save('transactions', transactions);
    save('closings', closings); 
    save('purchases', purchases);
    save('events', events);
    save('employees', employees);
    save('candidates', candidates);
    save('attendance', attendance);
    save('time_clock_logs', timeClockLogs);
    save('users', users);
    save('leads', leads);
    save('audit_logs', auditLogs);
    localStorage.setItem('company_settings', JSON.stringify(companySettings));

    if (!isIncomingUpdate.current) { pendingSync.current = true; }
    if (license?.networkRole === 'HUB' && dirHandle) {
      if (backupStatus !== 'writing') {
          const runBackup = async () => {
            setBackupStatus('writing');
            try {
              const fileHandle = await dirHandle.getFileHandle(`dz_mirror_instant.json`, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(JSON.stringify(allDataForSync.current, null, 2));
              await writable.close();
              setBackupStatus('success');
              setTimeout(() => setBackupStatus('idle'), 2000);
            } catch (e) { setBackupStatus('error'); }
          };
          runBackup();
      }
    }
  }, [clients, suppliers, products, invoices, transactions, closings, purchases, events, employees, candidates, attendance, timeClockLogs, users, companySettings, leads, auditLogs, license, dirHandle]);

  useEffect(() => {
      const syncInterval = setInterval(() => {
          if (pendingSync.current && license) { broadcastData(allDataForSync.current); pendingSync.current = false; }
      }, 2000);
      return () => clearInterval(syncInterval);
  }, [license, broadcastData]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('current_user', JSON.stringify(user));
  };
  
  const handleTransactionAdd = useCallback((tx: Transaction) => {
      setTransactions(prev => [{...tx, updatedAt: Date.now()}, ...prev]);
      addAuditLog('CREATE', ModuleType.FINANCE, `Transaction: ${tx.title}`);

      if (tx.category === 'Règlement Client' && tx.referenceId) {
          const invoice = invoices.find(inv => inv.id === tx.referenceId);
          if (invoice) {
              setClients(prevClients => prevClients.map(client =>
                  client.id === invoice.partnerId
                      ? { ...client, balance: client.balance - tx.amount, updatedAt: Date.now() }
                      : client
              ));
              addAuditLog('UPDATE', ModuleType.CLIENTS, `Solde client ${invoice.partnerName} mis à jour : ${formatCurrency(-tx.amount)}`);
          }
      }
  }, [invoices, addAuditLog]);

  const renderContent = () => {
    const allowedModules = license?.modules || [];
    const isRetailEligible = license?.type === 'RETAIL' || license?.type === 'BUSINESS' || license?.type === 'CORPORATE' || license?.type === 'STARTUP';
    const hasRightRole = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

    if (activeModule !== ModuleType.DASHBOARD && !allowedModules.includes(activeModule)) {
       if (activeModule === ModuleType.RETAIL && (isRetailEligible || hasRightRole)) {
           // Autoriser l'affichage
       } else {
           setActiveModule(ModuleType.DASHBOARD);
           return null;
       }
    }

    switch (activeModule) {
      case ModuleType.DASHBOARD: return <Dashboard onNavigate={setActiveModule} invoices={invoices} products={products} transactions={transactions} theme={theme === 'midnight' ? 'dark' : 'light'} language={language} activeSessions={activeSessions} />;
      case ModuleType.OPERATIONS: return <OperationsModule invoices={invoices} leads={leads} products={products} clients={clients} transactions={transactions} attendance={attendance} onNavigate={setActiveModule} auditLogs={auditLogs} events={events} currentUser={currentUser} />;
      case ModuleType.CRM: return <CRMModule leads={leads} setLeads={setLeads} events={events} onConvertToClient={(l) => {
        const newClient: Partner = { 
          id: `C-CONV-${Date.now()}`, name: l.companyName.toUpperCase(), type: 'Client', 
          nif: '', ai: '', rc: '', nis: '', address: l.notes, phone: l.phone, email: l.email, 
          balance: 0, createdBy: currentUser.name, updatedAt: Date.now() 
        };
        setClients(prev => [newClient, ...prev]);
        setLeads(prev => prev.filter(x => x.id !== l.id));
        addAuditLog('CREATE', ModuleType.CLIENTS, `Prospect ${l.companyName} converti en client`);
        setActiveModule(ModuleType.CLIENTS);
      }} currentUser={currentUser} onAddLog={addAuditLog} />;
      case ModuleType.SALES: return <SalesModule clients={clients} setClients={setClients} products={products} invoices={invoices} companySettings={companySettings} onSaveInvoice={(inv) => { setInvoices(prev => [{...inv, createdBy: currentUser.name, updatedAt: Date.now()}, ...prev]); addAuditLog('CREATE', ModuleType.SALES, `Nouveau document ${inv.type} N°${inv.number}`); }} onUpdateInvoice={(upd) => { setInvoices(prev => prev.map(i => i.id === upd.id ? {...upd, updatedAt: Date.now()} : i)); addAuditLog('UPDATE', ModuleType.SALES, `Mise à jour document N°${upd.number} (${upd.status})`); }} onDeleteInvoice={(id) => { handleSoftDelete(id, setInvoices, ModuleType.SALES, 'Facture/Devis'); }} onStockUpdate={(pId, ch) => setProducts(prev => prev.map(p => p.id === pId ? {...p, stock: Math.max(0, p.stock + ch), updatedAt: Date.now()} : p))} onTransactionAdd={handleTransactionAdd} />;
      case ModuleType.RETAIL: return <RetailModule products={products} companySettings={companySettings} onSaveInvoice={(inv) => { setInvoices(prev => [{...inv, createdBy: currentUser.name, updatedAt: Date.now()}, ...prev]); addAuditLog('CREATE', ModuleType.RETAIL, `Ticket Caisse N°${inv.number}`); }} onStockUpdate={(pId, ch) => setProducts(prev => prev.map(p => p.id === pId ? {...p, stock: Math.max(0, p.stock + ch), updatedAt: Date.now()} : p))} onTransactionAdd={handleTransactionAdd} />;
      case ModuleType.CLIENTS: return <ClientsModule clients={clients} setClients={setClients} currentUser={currentUser} events={events} invoices={invoices} onAddLog={addAuditLog} onDeleteClient={(id) => handleSoftDelete(id, setClients, ModuleType.CLIENTS, 'Client')} />;
      case ModuleType.SUPPLIERS: return <SuppliersModule suppliers={suppliers} setSuppliers={setSuppliers} currentUser={currentUser} onAddLog={addAuditLog} onDeleteSupplier={(id) => handleSoftDelete(id, setSuppliers, ModuleType.SUPPLIERS, 'Fournisseur')} />;
      case ModuleType.EVENTS: return <EventsModule clients={clients} products={products} events={events} setEvents={setEvents} onStockUpdate={(pId, ch) => setProducts(prev => prev.map(p => p.id === pId ? {...p, stock: p.stock + ch, updatedAt: Date.now()} : p))} onGenerateInvoice={(inv) => { setInvoices(prev => [{...inv, updatedAt: Date.now()}, ...prev]); addAuditLog('CREATE', ModuleType.EVENTS, `Facture générée pour dossier événementiel`); }} onNavigate={setActiveModule} currentUser={currentUser} users={users} invoices={invoices} companySettings={companySettings} onTransactionAdd={handleTransactionAdd} onAddLog={addAuditLog} onDeleteEvent={(id) => handleSoftDelete(id, setEvents, ModuleType.EVENTS, 'Événement')} />;
      case ModuleType.INVENTORY: return <InventoryModule products={products} setProducts={setProducts} currentUser={currentUser} onAddLog={addAuditLog} onDeleteProduct={(id) => handleSoftDelete(id, setProducts, ModuleType.INVENTORY, 'Produit')} />;
      case ModuleType.PURCHASES: return <PurchasesModule suppliers={suppliers} products={products} purchases={purchases} setPurchases={setPurchases} setProducts={setProducts} setTransactions={setTransactions} currentUser={currentUser} onAddLog={addAuditLog} onDeletePurchase={(id) => handleSoftDelete(id, setPurchases, ModuleType.PURCHASES, 'Bon Achat')} />;
      case ModuleType.FINANCE: return <FinanceModule transactions={transactions} setTransactions={setTransactions} closings={closings} setClosings={setClosings} currentUser={currentUser} onAddLog={addAuditLog} onDeleteTransaction={(id) => handleSoftDelete(id, setTransactions, ModuleType.FINANCE, 'Transaction')} />;
      case ModuleType.HR: return <HRModule employees={employees} setEmployees={setEmployees} candidates={candidates} setCandidates={setCandidates} attendance={attendance} setAttendance={setAttendance} onAddLog={addAuditLog} companySettings={companySettings} onDeleteEmployee={(id) => handleSoftDelete(id, setEmployees, ModuleType.HR, 'Employé')} />;
      case ModuleType.TIME_CLOCK: return <TimeClockModule employees={employees} attendance={attendance} setAttendance={setAttendance} logs={timeClockLogs} setLogs={setTimeClockLogs} onAddLog={addAuditLog} />;
      case ModuleType.ACCOUNTING: return <AccountingModule invoices={invoices} purchases={purchases} clients={clients} suppliers={suppliers} transactions={transactions} employees={employees} />;
      case ModuleType.USERS: return <UsersModule users={users} setUsers={setUsers} currentUser={currentUser} onAddLog={addAuditLog} maxUsers={license?.maxUsers} />;
      case ModuleType.LICENSE_GEN: return <LicenseGeneratorModule history={licenseHistory} setHistory={setLicenseHistory} />;
      case ModuleType.SETTINGS: return <SettingsModule license={license} setLicense={setLicense} googleAccessToken={null} onManualSync={async (token) => true} databaseId={license?.databaseId || ''} cloudStatus="synced" fileName="Hub Central" onResetCloud={() => {}} activeSessions={activeSessions} settings={companySettings} setSettings={setCompanySettings} dirHandle={dirHandle} setDirHandle={async (h) => { setDirHandle(h); await idb.set('mirror_dir_handle', h); }} onRestoreBackup={(data: any) => {}} appLanguage={language} setAppLanguage={setLanguage} appTheme={theme} setAppTheme={setTheme} />;
      default: return <Dashboard onNavigate={setActiveModule} invoices={invoices} products={products} transactions={transactions} theme={theme === 'midnight' ? 'dark' : 'light'} language={language} activeSessions={activeSessions} />;
    }
  };

  if (!license || license.status !== 'Active') return <LicenseGate setLicense={setLicense} databaseId="" setDatabaseId={(id: string) => {}} googleAccessToken={null} onSync={async (token, direction) => true} licenseHistory={licenseHistory} currentUserEmail={currentUser.email} />;
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} users={users} onResetAdmin={() => setUsers(prev => [DEFAULT_ADMIN_USER, ...prev.filter(u => u.username !== 'admin')])} />;

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (item.id === ModuleType.LICENSE_GEN) return currentUser.username === 'admin' && devModeActive;
    if (license?.modules && !license.modules.includes(item.id)) return false;
    return ROLE_PERMISSIONS[currentUser.role]?.includes(item.id);
  });

  return (
    <div className={`flex h-screen ${theme === 'midnight' ? 'bg-slate-950 text-slate-200' : 'bg-slate-50'} overflow-hidden font-sans`}>
      <Sidebar 
        isExpanded={sidebarExpanded} 
        isMobileOpen={isMobileSidebarOpen} 
        onCloseMobile={() => setIsMobileSidebarOpen(false)} 
        activeModule={activeModule} 
        onModuleChange={setActiveModule} 
        filteredItems={filteredMenuItems} 
        language={language} 
        companyName={companySettings.name} 
        companyLogo={companySettings.logoUrl} 
        theme={theme}
        currentUsername={currentUser.username}
        onDevModeTrigger={() => {
           setDevModeActive(true);
           sessionStorage.setItem('dev_mode_active', 'true');
           setActiveModule(ModuleType.LICENSE_GEN);
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 no-print ${theme === 'midnight' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b flex items-center justify-between px-6 z-[60] shadow-sm`}>
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2"><MenuIcon size={20} /></button>
            <button onClick={() => setSidebarExpanded(!sidebarExpanded)} className="hidden md:block p-2 text-slate-600"><ChevronLeft size={20} className={!sidebarExpanded ? 'rotate-180' : ''}/></button>
            
            <div className="hidden md:flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${networkStatus === 'connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (networkStatus === 'connecting' || networkStatus === 'retrying' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700')}`}>
                    {license?.networkRole === 'HUB' ? <Server size={12} /> : <Laptop size={12} />}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {license?.networkRole} : {networkStatus === 'retrying' ? 'Recup ID...' : networkStatus}
                    </span>
                </div>

                {license?.networkRole === 'WORKSTATION' && networkStatus === 'connected' && (
                   <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
                      <DatabaseZap size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Centralisé</span>
                   </div>
                )}

                {(license?.networkRole === 'HUB' || networkStatus === 'disconnected') && (
                   <button onClick={forceNetworkReset} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${networkStatus === 'retrying' ? 'opacity-50 pointer-events-none' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}>
                      <AlertTriangle size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Relancer Moteur</span>
                   </button>
                )}

                {license?.networkRole === 'HUB' && (
                  <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${dirHandle ? (backupStatus === 'writing' ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' : 'bg-indigo-50 border-indigo-200 text-indigo-700') : 'bg-slate-50 border-slate-200 text-slate-400 opacity-40'}`}>
                     <Usb size={12} className={backupStatus === 'writing' ? 'animate-spin' : ''} />
                     <span className="text-[9px] font-black uppercase tracking-widest">
                        {dirHandle ? (backupStatus === 'writing' ? 'Saving USB...' : 'USB Registry OK') : 'No USB Key'}
                     </span>
                  </div>
                )}
            </div>
            
            {isSyncing && <div className="flex items-center space-x-2 text-indigo-600 animate-pulse"><CloudLightning size={14} /><span className="text-[9px] font-black uppercase tracking-widest">SYNC</span></div>}
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsAiOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-lg"><Sparkles size={14} className="text-amber-400" /> <span className="hidden sm:inline">Gemini</span></button>
            <button onClick={() => { localStorage.removeItem('is_authenticated'); window.location.reload(); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><LogOut size={18} /></button>
          </div>
        </header>
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${theme === 'midnight' ? 'bg-slate-950' : 'bg-[#f8fafc]'}`}>
          <div className="max-w-[1600px] mx-auto">{renderContent()}</div>
        </main>
      </div>
      <AIAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} data={{ clients, products, invoices, transactions, events, purchases }} />
      <NotificationToast notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
};

export default App;
