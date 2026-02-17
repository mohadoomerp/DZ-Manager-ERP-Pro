import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Zap, RefreshCw, CheckCircle2, AlertCircle, UserCheck, ShieldAlert, Scan, History, Users } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { EventBooking, Visitor, ExhibitorTeamMember } from '../../../types';

interface CheckInScannerTabProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
}

type ScanStatus = 'idle' | 'processing' | 'success' | 'error' | 'already-in';

const CheckInScannerTab: React.FC<CheckInScannerTabProps> = ({ event, setEvents }) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [scannedPerson, setScannedPerson] = useState<{ name: string; company: string; category: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastScans, setLastScans] = useState<{ name: string; time: string; type: string }[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setErrorMsg("Accès caméra refusé.");
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndCheckIn = async () => {
    if (!videoRef.current || !canvasRef.current || status === 'processing') return;

    setStatus('processing');
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      // Fix: Create a new instance right before calling as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analyse ce badge d'événement. 
        1. Cherche un QR code ou un texte formaté comme : DZ-CHECKIN|ID_EVENT|ID_PARTICIPANT.
        2. Si tu ne trouves pas ce format, cherche un ID unique commençant par VIS- ou TEAM-.
        3. Retourne UNIQUEMENT un JSON : {"id": "ID_TROUVE", "raw": "TEXTE_COMPLET"}.
        Si rien n'est trouvé, retourne {"id": null}.
      `;

      // Fix: Corrected contents structure as per guidelines { parts: [...] }
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }, { text: prompt }] }
      });

      // Fix: Safely handle potentially undefined response text
      const text = response.text || "{}";
      const result = JSON.parse(text.replace(/```json|```/g, '').trim());
      
      if (!result.id) {
        throw new Error("Badge non reconnu");
      }

      // Extraire l'ID du participant (le format est DZ-CHECKIN|EVENT_ID|PARTICIPANT_ID)
      const parts = result.id.split('|');
      const participantId = parts.length === 3 ? parts[2] : result.id;

      handleProcessCheckIn(participantId);

    } catch (err) {
      setErrorMsg("Badge illisible. Réessayez.");
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleProcessCheckIn = (id: string) => {
    let person: Visitor | ExhibitorTeamMember | undefined;
    let type = '';

    // Chercher dans les visiteurs
    person = (event.visitors || []).find(v => v.id === id);
    if (person) type = 'VISITEUR';

    // Sinon chercher dans le staff exposant
    if (!person) {
      person = (event.exhibitorTeams || []).find(m => m.id === id);
      if (person) type = 'EXPOSANT';
    }

    if (!person) {
      setErrorMsg("Participant non trouvé dans cet événement.");
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    if (person.isCheckedIn) {
      setScannedPerson({ name: person.name, company: (person as any).company || 'Exposant', category: type });
      setStatus('already-in');
      setTimeout(() => setStatus('idle'), 4000);
      return;
    }

    // Valider le check-in
    setEvents(prev => prev.map(ev => {
      if (ev.id === event.id) {
        return {
          ...ev,
          visitors: (ev.visitors || []).map(v => v.id === id ? { ...v, isCheckedIn: true, updatedAt: Date.now() } : v),
          exhibitorTeams: (ev.exhibitorTeams || []).map(m => m.id === id ? { ...m, isCheckedIn: true, updatedAt: Date.now() } : m)
        };
      }
      return ev;
    }));

    setScannedPerson({ name: person.name, company: (person as any).company || 'Exposant', category: type });
    setStatus('success');
    
    // Ajouter à l'historique local rapide
    setLastScans(prev => [{ 
      name: person!.name, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type 
    }, ...prev].slice(0, 5));

    // Vibration haptique si supportée
    if (window.navigator.vibrate) window.navigator.vibrate(100);

    setTimeout(() => {
      setStatus('idle');
      setScannedPerson(null);
    }, 2500);
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      
      {!isCameraActive ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-8 bg-white dark:bg-slate-900 rounded-[48px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                <Scan size={48} />
            </div>
            <div className="max-w-xs">
                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white">Scanner Mobile</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">Utilisez la caméra de votre téléphone pour valider les entrées instantanément.</p>
            </div>
            <button 
                onClick={() => setIsCameraActive(true)}
                className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
            >
                Activer la Caméra
            </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
            
            {/* CAMERA VIEWPORT */}
            <div className="relative bg-black rounded-[40px] overflow-hidden shadow-2xl border-4 border-slate-900 aspect-[3/4] lg:aspect-auto">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[0.2]" />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Viseur de scan */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/20 rounded-[32px] relative">
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
                        
                        {/* Ligne laser animée */}
                        <div className={`absolute inset-x-4 top-0 h-1 bg-indigo-500/50 shadow-[0_0_15px_#6366f1] animate-[scan_2s_infinite] ${status === 'processing' ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>
                </div>

                {/* Overlays de Statut */}
                {status === 'success' && (
                    <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in zoom-in">
                        <CheckCircle2 size={80} className="mb-4" />
                        <h4 className="text-2xl font-black uppercase text-center">{scannedPerson?.name}</h4>
                        <p className="font-bold opacity-80 uppercase tracking-widest">{scannedPerson?.company}</p>
                        <span className="mt-6 px-4 py-1 bg-white text-emerald-600 rounded-full text-[10px] font-black uppercase">Entrée Validée</span>
                    </div>
                )}

                {status === 'already-in' && (
                    <div className="absolute inset-0 bg-amber-500/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in zoom-in">
                        <ShieldAlert size={80} className="mb-4" />
                        <h4 className="text-xl font-black uppercase text-center">{scannedPerson?.name}</h4>
                        <p className="font-bold text-center">DÉJÀ ENREGISTRÉ SUR SITE</p>
                        <button onClick={() => setStatus('idle')} className="mt-8 px-6 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase">Continuer</button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 bg-rose-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in zoom-in">
                        <AlertCircle size={80} className="mb-4" />
                        <h4 className="text-lg font-black uppercase text-center">{errorMsg}</h4>
                        <button onClick={() => setStatus('idle')} className="mt-8 px-6 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase">Réessayer</button>
                    </div>
                )}

                {/* Bouton de capture */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center px-6">
                    <button 
                        // Fix: Corrected the function name from captureAndProcess to captureAndCheckIn
                        onClick={captureAndCheckIn}
                        disabled={status === 'processing'}
                        className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 ${status === 'processing' ? 'bg-indigo-600' : 'bg-white/20 backdrop-blur-md'}`}
                    >
                        {status === 'processing' ? (
                            <RefreshCw className="text-white animate-spin" size={32} />
                        ) : (
                            <div className="w-14 h-14 bg-white rounded-full"></div>
                        )}
                    </button>
                </div>

                <button onClick={() => setIsCameraActive(false)} className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all">
                    <X size={20} />
                </button>
            </div>

            {/* STATS & HISTORY */}
            <div className="space-y-6 flex flex-col">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                        <History size={16} className="mr-2 text-indigo-500" /> Flux des entrées (Derniers 5)
                    </h4>
                    <div className="space-y-3">
                        {lastScans.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-in slide-in-from-right-4" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${s.type === 'VISITEUR' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        <UserCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{s.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{s.type}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono font-black text-slate-400">{s.time}</span>
                            </div>
                        ))}
                        {lastScans.length === 0 && (
                            <div className="py-10 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Aucun scan récent</div>
                        )}
                    </div>
                </div>

                <div className="flex-1 bg-slate-900 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Statistiques Live</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-3xl font-black">
                                    {((event.visitors || []).filter(v => v.isCheckedIn).length) + 
                                     ((event.exhibitorTeams || []).filter(m => m.isCheckedIn).length)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Présents sur site</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-indigo-500">
                                    {Math.round((((event.visitors || []).filter(v => v.isCheckedIn).length + 
                                     (event.exhibitorTeams || []).filter(m => m.isCheckedIn).length) / 
                                     ((event.visitors?.length || 0) + (event.exhibitorTeams?.length || 0) || 1)) * 100)}%
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Taux de présence</p>
                            </div>
                        </div>
                    </div>
                    <Users size={120} className="absolute -bottom-10 -right-10 opacity-10" />
                </div>
            </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(240px); }
        }
      `}</style>
    </div>
  );
};

export default CheckInScannerTab;