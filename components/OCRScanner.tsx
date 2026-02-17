
import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Sparkles, RefreshCw, Check, AlertCircle, Maximize, Zap } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface OCRScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
  targetType: 'client' | 'company' | 'candidate';
}

const OCRScanner: React.FC<OCRScannerProps> = ({ onScanComplete, onClose, targetType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 2560 }, // Increased resolution request
          height: { ideal: 1440 },
          // Focus automatique et continu si supporté
          // @ts-ignore
          advanced: [{ focusMode: 'continuous' }]
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      setError("Accès caméra refusé. Vérifiez les permissions de votre navigateur.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Haute résolution pour une meilleure lecture OCR
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // 1. Désactivation du lissage pour garder les bords de texte nets
      ctx.imageSmoothingEnabled = false;
      
      // 2. Capture de l'image
      ctx.drawImage(video, 0, 0);
      
      // 3. Amélioration du contraste pour Gemini (Algorithme amélioré)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Seuil adaptatif pour le texte noir sur fond blanc
        const factor = (259 * (128 + 255)) / (255 * (259 - 128)); // Contraste élevé
        const color = factor * (avg - 128) + 128;
        
        data[i] = Math.max(0, Math.min(255, color));     // R
        data[i + 1] = Math.max(0, Math.min(255, color)); // G
        data[i + 2] = Math.max(0, Math.min(255, color)); // B
      }
      ctx.putImageData(imageData, 0, 0);
      
      const base64Image = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let prompt = '';

        if (targetType === 'client') {
            // Prompt optimisé pour CRM / Cartes de Visite / Dossiers
            prompt = `
              Tu es un expert en extraction de données commerciales (Cartes de visite, En-têtes, Flyers, Documents).
              Analyse cette image et extrais les informations suivantes avec une très haute précision.
              
              PRIORITÉ ABSOLUE :
              1. **Nom de l'Entreprise** (Raison Sociale) : Cherche le logo ou le texte principal en gras/grand.
              2. **Numéro de Téléphone** : Cherche activement les formats algériens (+213, 05, 06, 07, 02, 03...). Priorise les mobiles.
              3. **Adresse Email** : Cherche le symbole @ et un domaine.
              4. **Nom du Contact** : Si c'est une carte de visite (Prénom Nom).
              
              AUTRES CHAMPS :
              5. **Adresse Physique**.
              6. **Site Web** (Optionnel).
              7. **NIF/RC** (Optionnel).

              Retourne un JSON pur (sans markdown) :
              {
                "name": "string",        // Nom Entreprise
                "contactName": "string", // Nom Personne
                "phone": "string",       // Téléphone
                "email": "string",       // Email
                "address": "string",
                "nif": "string",
                "rc": "string",
                "website": "string"
              }
              Laisse vide "" si introuvable.
            `;
        } else if (targetType === 'candidate') {
            // Prompt optimisé pour CV / Resume
            prompt = `
              Tu es un recruteur expert en analyse de CV.
              Extrais les informations clés de ce CV (Image) pour remplir une fiche candidat.
              
              Champs à extraire :
              1. **Nom Complet** : Le nom du candidat.
              2. **Poste Actuel / Visé** : Le titre du poste recherché ou le dernier poste occupé.
              3. **Email** : Adresse email personnelle.
              4. **Téléphone** : Numéro de mobile (Format Algérien si possible).
              5. **Compétences / Notes** : Résumé très court (max 150 caractères) des compétences clés ou diplômes majeurs.

              Retourne un JSON pur (sans markdown) :
              {
                "name": "string",
                "position": "string",
                "email": "string",
                "phone": "string",
                "notes": "string"
              }
              Si une info est introuvable, laisse vide "".
            `;
        } else {
            // Prompt optimisé pour Documents Administratifs (RCM/NIF)
            prompt = `
              Tu es un expert en documents administratifs algériens (Registre de Commerce "RCM", NIF, NIS).
              Analyse l'image fournie et extrais les informations fiscales :

              1. **Nom / Raison Sociale** : Le nom officiel de l'entreprise.
              2. **Téléphone** : (Optionnel, chercher format 05/06/07/02)
              3. **Email** : (Optionnel)
              4. **NIF** : Numéro d'Identification Fiscale (15 chiffres).
              5. **RC** : Numéro du Registre de Commerce.
              6. **AI** : Article d'Imposition.
              7. **NIS** : Numéro d'Identification Statistique.
              8. **Adresse** : L'adresse du siège social.

              Retourne un JSON pur (sans markdown) :
              {
                "name": "string",
                "phone": "string",
                "email": "string",
                "address": "string",
                "nif": "string",
                "rc": "string",
                "ai": "string",
                "nis": "string"
              }
              Laisse vide "" si introuvable.
            `;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
              { text: prompt }
            ]
          }
        });

        const text = response.text || "{}";
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(jsonStr);

        onScanComplete(result);
        onClose();
      } catch (err: any) {
        console.error(err);
        setError("L'IA n'a pas pu lire le document. Assurez-vous que le texte est net et bien éclairé.");
        setIsProcessing(false);
      }
    }
  };

  const getGuideText = () => {
      switch(targetType) {
          case 'client': return 'Alignez Carte Visite / Prospect';
          case 'candidate': return 'Alignez le CV (En-tête)';
          default: return 'Alignez Registre Commerce / NIF';
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className={`relative w-full max-w-2xl aspect-[3/4] md:aspect-video bg-black rounded-[40px] overflow-hidden shadow-2xl border border-white/10 transition-all ${flash ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
        {!error && <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-[0.1]" />}
        <canvas ref={canvasRef} className="hidden" />

        {/* Cadre de guidage */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[85%] h-[75%] border-2 border-white/20 rounded-3xl relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
            
            <div className={`absolute inset-x-0 top-0 h-1 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] ${isProcessing ? 'animate-[scan_2s_infinite]' : 'hidden'}`}></div>
            
            <div className="absolute inset-0 flex items-center justify-center">
               {!isProcessing && (
                 <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-xl backdrop-blur-sm">
                   {getGuideText()}
                 </p>
               )}
            </div>
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-center items-center justify-center p-8 text-center backdrop-blur-md">
            <div className="space-y-4">
              <AlertCircle size={48} className="text-rose-500 mx-auto" />
              <p className="text-white font-black uppercase text-sm">{error}</p>
              <button onClick={() => { setError(null); startCamera(); }} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Réessayer</button>
            </div>
          </div>
        )}

        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
           <div className="bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl flex items-center space-x-3 border border-white/10">
              <Zap size={16} className="text-indigo-400" />
              <span className="text-[10px] text-white font-black uppercase tracking-widest">OCR GenAI</span>
           </div>
           <button onClick={onClose} className="p-3 bg-black/60 backdrop-blur-xl text-white rounded-full hover:bg-white/20 transition-all border border-white/10">
              <X size={20} />
           </button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center space-y-4 px-6">
           <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
              <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest">
                Mode : {targetType === 'candidate' ? 'Extraction CV' : targetType === 'client' ? 'Extraction Contact' : 'Extraction Fiscale'}
              </p>
           </div>
           
           <button 
             onClick={captureAndProcess}
             disabled={!isCameraReady || isProcessing}
             className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 ${isProcessing ? 'border-indigo-500/30' : 'border-white hover:border-indigo-500 shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}
           >
              {isProcessing ? (
                <RefreshCw size={32} className="text-indigo-500 animate-spin" />
              ) : (
                <div className="w-14 h-14 bg-white rounded-full shadow-lg"></div>
              )}
           </button>
           
           <p className="text-[9px] text-white/50 font-bold uppercase text-center max-w-[200px] leading-relaxed">
             {targetType === 'candidate'
               ? 'Capture : Nom, Poste, Tél, Email, Compétences.'
               : targetType === 'client' 
                 ? 'Capture : Nom Société, Contact, Tél, Email.' 
                 : 'Capture : RC, NIF, AI, NIS, Adresse.'}
           </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0% }
          100% { top: 100% }
        }
      `}</style>
    </div>
  );
};

export default OCRScanner;
