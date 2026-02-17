
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { X, Send, Sparkles, BrainCircuit, LineChart, ShieldCheck, Loader2, Zap } from 'lucide-react';
import { formatCurrency } from '../constants';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, data }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState<'gemini-3-pro-preview' | 'gemini-flash-lite-latest'>('gemini-3-pro-preview');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleAskGemini = async () => {
    if (!prompt.trim()) return;

    const userMsg = prompt;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        Vous êtes un consultant ERP senior et un analyste commercial.
        Aperçu actuel des données de l'entreprise :
        - Stock Critique : ${data.products.filter((p:any) => p.stock <= p.minStock).map((p:any) => p.name).join(', ') || 'Aucun'}
        - Total Facturé : ${data.invoices.reduce((acc:any, inv:any) => acc + inv.totalTTC, 0)} DZD
        - Nombre de Clients : ${data.clients.length}
        - Solde de Caisse : ${data.transactions.reduce((acc:any, tx:any) => acc + (tx.type === 'income' ? tx.amount : -tx.amount), 0)} DZD
        
        Directives :
        1. Répondez en français.
        2. Soyez concis et professionnel.
        3. Fournissez des informations commerciales exploitables.
        4. Le cas échéant, mentionnez les réglementations fiscales algériennes (TVA, IRG, État 104).
      `;

      const response = await ai.models.generateContent({
        model: aiModel,
        contents: userMsg,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "Je n'ai pas pu analyser les données pour le moment." }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Désolé, une erreur s'est produite lors de l'analyse. Veuillez vérifier votre configuration API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500 rounded-lg">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm">Gemini AI Assistant</h3>
              <p className="text-[10px] text-indigo-300 font-bold uppercase">Business Intelligence</p>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center px-6">
            <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center space-x-1">
              <button 
                onClick={() => setAiModel('gemini-3-pro-preview')} 
                className={`flex items-center space-x-2 px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${aiModel === 'gemini-3-pro-preview' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                <BrainCircuit size={14} />
                <span>Qualité</span>
              </button>
              <button 
                onClick={() => setAiModel('gemini-flash-lite-latest')} 
                className={`flex items-center space-x-2 px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${aiModel === 'gemini-flash-lite-latest' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
              >
                <Zap size={14} />
                <span>Vitesse</span>
              </button>
            </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-950 custom-scrollbar" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="space-y-6 pt-10">
              <div className="text-center space-y-2">
                <BrainCircuit size={48} className="mx-auto text-indigo-200" />
                <p className="text-slate-400 text-xs font-bold uppercase">Comment puis-je aider votre entreprise aujourd'hui ?</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => setPrompt("Analyser mon stock critique")} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left text-xs hover:border-indigo-500 transition-all font-medium flex items-center dark:text-white">
                  <LineChart size={14} className="mr-3 text-indigo-500" /> Analyser les niveaux de stock
                </button>
                <button onClick={() => setPrompt("Résumé de ma situation financière")} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left text-xs hover:border-indigo-500 transition-all font-medium flex items-center dark:text-white">
                  <ShieldCheck size={14} className="mr-3 text-emerald-500" /> Résumé de la santé financière
                </button>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl rounded-tl-none flex items-center space-x-2">
                <Loader2 size={16} className="text-indigo-500 animate-spin" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Analyse des données en cours...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskGemini()}
              placeholder="Posez une question sur votre entreprise..."
              className="w-full pl-4 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium dark:text-white"
            />
            <button 
              onClick={handleAskGemini}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="mt-3 text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter">
            Powered by {aiModel === 'gemini-3-pro-preview' ? 'Gemini 3 Pro' : 'Gemini Flash Lite'} • DZ Edition
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
