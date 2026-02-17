import React from 'react';
import { Camera, Plus, Edit3, Trash2, Phone, Calendar, ArrowRight, Briefcase } from 'lucide-react';
import { Candidate } from '../../../types';
import { RECRUITMENT_STAGES } from '../constants';

interface RecruitmentTabProps {
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  onEditCandidate: (c: Candidate) => void;
  onHireCandidate: (c: Candidate) => void;
  onDeleteCandidate: (id: string) => void;
  onOpenScanner: () => void;
  onNewCandidate: () => void;
  onAddLog: (type: string, module: any, msg: string) => void;
}

const RecruitmentTab: React.FC<RecruitmentTabProps> = ({ 
  candidates, setCandidates, onEditCandidate, onHireCandidate, onDeleteCandidate, onOpenScanner, onNewCandidate
}) => {
  return (
    <div className="animate-in fade-in duration-300 overflow-x-auto pb-8">
        <div className="flex justify-between items-center mb-8 min-w-[1000px]">
            <div><h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Pipeline Recrutement</h2><p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Suivi des candidatures</p></div>
            <div className="flex space-x-2">
                <button onClick={onOpenScanner} className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center hover:bg-indigo-100 transition-all shadow-sm">
                    <Camera size={16} className="mr-2" /> <span className="text-[10px] font-black uppercase">Scanner CV</span>
                </button>
                <button onClick={onNewCandidate} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-indigo-700 transition-all"><Plus size={16} className="mr-2" /> Nouveau Candidat</button>
            </div>
        </div>
        
        <div className="flex space-x-6 min-w-[1000px]">
            {RECRUITMENT_STAGES.filter(s => s.id !== 'Hired').map(stage => (
                <div key={stage.id} className="w-80 flex-shrink-0">
                    <div className={`p-4 rounded-2xl mb-4 flex justify-between items-center ${stage.color} bg-opacity-20`}>
                        <h4 className="font-black uppercase text-xs tracking-widest">{stage.label}</h4>
                        <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-black">{candidates.filter(c => c.status === stage.id).length}</span>
                    </div>
                    <div className="space-y-4">
                        {candidates.filter(c => c.status === stage.id).map(c => (
                            <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-black text-slate-800 dark:text-white uppercase text-sm">{c.name}</h5>
                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEditCandidate(c)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded"><Edit3 size={14}/></button>
                                        <button onClick={() => onDeleteCandidate(c.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">{c.position}</p>
                                <div className="space-y-1 mb-4">
                                    <div className="flex items-center text-[10px] text-slate-500"><Phone size={10} className="mr-2"/> {c.phone}</div>
                                    <div className="flex items-center text-[10px] text-slate-500"><Calendar size={10} className="mr-2"/> {c.applicationDate}</div>
                                </div>
                                
                                {c.status === 'Offer' ? (
                                    <button onClick={() => onHireCandidate(c)} className="w-full py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center">
                                        <Briefcase size={12} className="mr-2" /> Embaucher
                                    </button>
                                ) : (
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-700">
                                        {/* Boutons de déplacement rapide */}
                                        {c.status !== 'Rejected' && <button onClick={() => { 
                                            const nextIdx = RECRUITMENT_STAGES.findIndex(s => s.id === c.status) + 1;
                                            if (nextIdx < RECRUITMENT_STAGES.length) setCandidates(prev => prev.map(x => x.id === c.id ? {...x, status: RECRUITMENT_STAGES[nextIdx].id as any} : x));
                                        }} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 flex items-center">Étape Suivante <ArrowRight size={10} className="ml-1"/></button>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default RecruitmentTab;