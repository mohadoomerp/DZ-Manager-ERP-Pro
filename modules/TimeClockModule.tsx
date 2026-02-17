
import React, { useState, useEffect, useRef } from 'react';
import { Clock, UserCheck, Lock, LogIn, LogOut, Coffee, ScanFace, Activity, X, History, Monitor, Wifi, Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Employee, TimeClockLog, AttendanceRecord, AuditLog, ModuleType } from '../types';

interface TimeClockModuleProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  logs: TimeClockLog[];
  setLogs: React.Dispatch<React.SetStateAction<TimeClockLog[]>>;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
}

const TimeClockModule: React.FC<TimeClockModuleProps> = ({ employees, attendance, setAttendance, logs, setLogs, onAddLog }) => {
  const [view, setView] = useState<'terminal' | 'dashboard' | 'logs'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Terminal State
  const [inputPin, setInputPin] = useState('');
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeypad = (num: string) => {
    if (inputPin.length < 6) setInputPin(prev => prev + num);
  };

  const handleAction = async (action: TimeClockLog['type']) => {
    if (!inputPin) {
        setFeedback({ type: 'error', msg: 'Veuillez entrer un ID ou PIN' });
        return;
    }

    const employee = employees.find(e => e.cnasNumber === inputPin || e.id.endsWith(inputPin) || e.pinCode === inputPin);
    
    if (!employee) {
        setFeedback({ type: 'error', msg: 'Employé non reconnu' });
        setTimeout(() => setFeedback(null), 3000);
        setInputPin('');
        return;
    }

    // Simuler un délai biométrique
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsScanning(false);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' });

    // Créer Log
    const newLog: TimeClockLog = {
        id: `LOG-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        timestamp: Date.now(),
        type: action,
        method: 'Pin',
        deviceId: 'ZK-T8-MAIN'
    };
    setLogs(prev => [newLog, ...prev]);

    // Mettre à jour Présence
    setAttendance(prev => {
        // Trouver s'il y a déjà une entrée pour aujourd'hui
        const existingRecord = prev.find(a => a.employeeId === employee.id && a.date === dateStr);
        
        if (existingRecord) {
            // Mise à jour (ex: Sortie)
            if (action === 'CheckOut') {
                return prev.map(a => a.id === existingRecord.id ? { ...a, exitTime: timeStr, status: 'Present' } : a);
            }
            return prev;
        } else {
            // Nouvelle Entrée
            if (action === 'CheckIn') {
                const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
                return [...prev, {
                    id: `ATT-${Date.now()}`,
                    employeeId: employee.id,
                    employeeName: employee.name,
                    date: dateStr,
                    status: isLate ? 'Late' : 'Present',
                    entryTime: timeStr,
                    isValidated: false
                }];
            }
            return prev;
        }
    });

    setFeedback({ type: 'success', msg: `${action === 'CheckIn' ? 'Bienvenue' : 'Au revoir'} ${employee.name.split(' ')[0]}` });
    onAddLog('CREATE', ModuleType.TIME_CLOCK, `Pointage ${action} : ${employee.name}`);
    setInputPin('');
    setTimeout(() => setFeedback(null), 3000);
  };

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if(videoRef.current) videoRef.current.srcObject = stream;
      } catch(e) { console.error(e); }
  };

  // --- SUB-COMPONENTS ---

  const TerminalView = () => (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-900 text-white p-8 rounded-[48px] shadow-2xl relative overflow-hidden border-8 border-slate-800">
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 bg-black/40 p-4 flex justify-between items-center backdrop-blur-md z-10">
              <div className="flex items-center space-x-4">
                  <Wifi size={16} className="text-emerald-500" />
                  <span className="text-xs font-mono text-slate-400">ZK-TECO TERMINAL 8</span>
              </div>
              <div className="flex items-center space-x-4">
                  <span className="text-xl font-mono font-black">{currentTime.toLocaleTimeString()}</span>
              </div>
          </div>

          {/* Feedback Overlay */}
          {feedback && (
              <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-xl ${feedback.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'} animate-in fade-in zoom-in duration-200`}>
                  <div className={`p-8 rounded-full mb-6 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {feedback.type === 'success' ? <CheckCircle2 size={64} /> : <X size={64} />}
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-widest text-center">{feedback.msg}</h2>
              </div>
          )}

          {/* Main Interface */}
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 z-0 mt-16">
              {/* Left: Input & Display */}
              <div className="space-y-8">
                  <div className="bg-slate-800 p-8 rounded-[32px] border border-slate-700 shadow-inner">
                      <p className="text-slate-400 text-xs font-black uppercase mb-2 text-center">ID / PIN Employé</p>
                      <div className="text-4xl font-mono font-black text-center tracking-[0.5em] text-cyan-400 h-16 flex items-center justify-center bg-black/30 rounded-2xl border border-white/5">
                          {inputPin ? inputPin.padEnd(6, '•') : '------'}
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button key={num} onClick={() => handleKeypad(num.toString())} className="h-20 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-black shadow-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all">
                              {num}
                          </button>
                      ))}
                      <button onClick={() => setInputPin('')} className="h-20 bg-rose-900/50 hover:bg-rose-800/50 text-rose-400 rounded-2xl text-xl font-black shadow-lg border-b-4 border-rose-950/50 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center">CLR</button>
                      <button onClick={() => handleKeypad('0')} className="h-20 bg-slate-800 hover:bg-slate-700 rounded-2xl text-2xl font-black shadow-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 transition-all">0</button>
                      <button className="h-20 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 rounded-2xl text-xl font-black shadow-lg border-b-4 border-emerald-950/50 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center">OK</button>
                  </div>
              </div>

              {/* Right: Actions */}
              <div className="space-y-6 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => handleAction('CheckIn')} className="h-32 bg-emerald-600 hover:bg-emerald-500 rounded-[32px] flex flex-col items-center justify-center shadow-lg shadow-emerald-900/50 transition-all active:scale-95 group">
                          <LogIn size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="font-black uppercase tracking-widest text-xs">Entrée</span>
                      </button>
                      <button onClick={() => handleAction('CheckOut')} className="h-32 bg-rose-600 hover:bg-rose-500 rounded-[32px] flex flex-col items-center justify-center shadow-lg shadow-rose-900/50 transition-all active:scale-95 group">
                          <LogOut size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="font-black uppercase tracking-widest text-xs">Sortie</span>
                      </button>
                      <button onClick={() => handleAction('BreakOut')} className="h-24 bg-amber-600 hover:bg-amber-500 rounded-[32px] flex flex-col items-center justify-center shadow-lg shadow-amber-900/50 transition-all active:scale-95 group">
                          <Coffee size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="font-black uppercase tracking-widest text-[10px]">Pause</span>
                      </button>
                      <button onClick={() => handleAction('BreakIn')} className="h-24 bg-blue-600 hover:bg-blue-500 rounded-[32px] flex flex-col items-center justify-center shadow-lg shadow-blue-900/50 transition-all active:scale-95 group">
                          <RefreshCw size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                          <span className="font-black uppercase tracking-widest text-[10px]">Reprise</span>
                      </button>
                  </div>

                  <div className="relative h-40 bg-black rounded-[32px] overflow-hidden border border-slate-700 flex items-center justify-center group cursor-pointer" onClick={() => startCamera()}>
                      {isScanning ? (
                          <div className="absolute inset-0 bg-emerald-500/20 animate-pulse z-20 flex items-center justify-center">
                              <ScanFace size={48} className="text-emerald-400" />
                          </div>
                      ) : (
                          <div className="text-slate-500 flex flex-col items-center">
                              <ScanFace size={32} className="mb-2" />
                              <span className="text-[10px] font-black uppercase">Reconnaissance Faciale</span>
                          </div>
                      )}
                      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-center no-print">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-cyan-500 rounded-2xl text-white shadow-lg"><Clock size={24} /></div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Pointeuse Numérique</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Émulateur ZKTeco • Contrôle de Présence</p>
             </div>
          </div>
          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <button onClick={() => setView('dashboard')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-cyan-600'}`}>Dashboard</button>
             <button onClick={() => setView('terminal')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'terminal' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-cyan-600'}`}>Terminal Kiosque</button>
             <button onClick={() => setView('logs')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'logs' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-cyan-600'}`}>Journaux Bruts</button>
          </div>
       </div>

       {view === 'terminal' && <TerminalView />}

       {view === 'dashboard' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-8">
                   <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                       <div className="relative z-10 flex justify-between items-start">
                           <div>
                               <p className="text-cyan-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center"><Activity size={12} className="mr-2 animate-pulse"/> En Direct</p>
                               <h3 className="text-5xl font-mono font-black tracking-tighter">{currentTime.toLocaleTimeString()}</h3>
                               <p className="text-sm font-bold text-slate-400 mt-1">{currentTime.toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                           </div>
                           <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-2xl">
                               <p className="text-xs font-black text-emerald-400 uppercase">Système En Ligne</p>
                           </div>
                       </div>
                       <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                           <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                               <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Présents</p>
                               <p className="text-2xl font-black">{attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Present').length}</p>
                           </div>
                           <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                               <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Absents</p>
                               <p className="text-2xl font-black text-rose-400">{attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Absent').length}</p>
                           </div>
                           <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                               <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Retards</p>
                               <p className="text-2xl font-black text-amber-400">{attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Late').length}</p>
                           </div>
                       </div>
                       <Server size={200} className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none" />
                   </div>

                   <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                       <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white mb-6">Derniers Pointages</h3>
                       <div className="space-y-4">
                           {logs.slice(0, 5).map(log => (
                               <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                   <div className="flex items-center space-x-4">
                                       <div className={`p-3 rounded-xl ${log.type === 'CheckIn' ? 'bg-emerald-100 text-emerald-600' : log.type === 'CheckOut' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                           {log.type === 'CheckIn' ? <LogIn size={16}/> : log.type === 'CheckOut' ? <LogOut size={16}/> : <Coffee size={16}/>}
                                       </div>
                                       <div>
                                           <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{log.employeeName}</p>
                                           <p className="text-[9px] font-bold text-slate-400 uppercase">{log.method} • {log.deviceId}</p>
                                       </div>
                                   </div>
                                   <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(log.timestamp).toLocaleTimeString()}</span>
                               </div>
                           ))}
                           {logs.length === 0 && <p className="text-center text-xs text-slate-400 italic py-4">Aucun log récent</p>}
                       </div>
                   </div>
               </div>

               <div className="space-y-8">
                   <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                       <div className="w-24 h-24 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500 rounded-full flex items-center justify-center mb-4 animate-pulse"><ScanFace size={40} /></div>
                       <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">Terminal Virtuel</h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 mb-6">Utilisez ce PC comme borne de pointage pour les employés.</p>
                       <button onClick={() => setView('terminal')} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform w-full">Lancer Kiosque</button>
                   </div>

                   <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-[40px] border border-slate-200 dark:border-slate-700">
                       <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-4 tracking-widest">État Périphériques</h3>
                       <div className="space-y-3">
                           <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                               <span className="text-[10px] font-bold uppercase flex items-center"><Monitor size={12} className="mr-2"/> Écran Tactile</span>
                               <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                           </div>
                           <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                               <span className="text-[10px] font-bold uppercase flex items-center"><ScanFace size={12} className="mr-2"/> Caméra FaceID</span>
                               <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                           </div>
                           <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                               <span className="text-[10px] font-bold uppercase flex items-center"><Lock size={12} className="mr-2"/> Verrou Porte</span>
                               <span className="text-[9px] font-black text-slate-400 uppercase">Simulé</span>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {view === 'logs' && (
           <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                   <h3 className="font-black uppercase text-slate-800 dark:text-white">Journal Brut des Événements</h3>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left">
                       <thead className="bg-slate-50 dark:bg-slate-800 font-black text-slate-400 uppercase text-[9px] tracking-widest border-b border-slate-100 dark:border-slate-700">
                           <tr>
                               <th className="px-8 py-4">Horodatage</th>
                               <th className="px-8 py-4">Employé</th>
                               <th className="px-8 py-4">Action</th>
                               <th className="px-8 py-4">Méthode</th>
                               <th className="px-8 py-4">Terminal</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {logs.map(log => (
                               <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                   <td className="px-8 py-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(log.timestamp).toLocaleString()}</td>
                                   <td className="px-8 py-4 font-black text-xs text-slate-900 dark:text-white uppercase">{log.employeeName}</td>
                                   <td className="px-8 py-4">
                                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                           log.type === 'CheckIn' ? 'bg-emerald-100 text-emerald-700' : 
                                           log.type === 'CheckOut' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                       }`}>
                                           {log.type}
                                       </span>
                                   </td>
                                   <td className="px-8 py-4 text-xs font-bold text-slate-500 uppercase">{log.method}</td>
                                   <td className="px-8 py-4 text-xs font-mono text-slate-400">{log.deviceId}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
       )}
    </div>
  );
};

export default TimeClockModule;
