
import React, { useState, useEffect } from 'react';
import { ModuleType } from '../types';
import { Language, translations } from '../translations';
import { ThemeType } from '../App';
import { Key, X, ShieldCheck, Terminal, ShieldAlert, Zap } from 'lucide-react';

interface SidebarProps {
  isExpanded: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
  filteredItems: any[];
  language: Language;
  companyName: string;
  companyLogo?: string;
  isMaster?: boolean;
  theme: ThemeType;
  onDevModeTrigger?: () => void;
  currentUserRole?: string;
  currentUsername?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isExpanded, isMobileOpen, onCloseMobile, activeModule, onModuleChange, 
  filteredItems, language, companyName, companyLogo, isMaster, theme,
  onDevModeTrigger, currentUsername
}) => {
  const t = translations[language];
  const isRtl = language === 'ar';
  
  // LOGIQUE SECRÈTE : 10 clics rapides sur le logo pour activer le mode développeur
  const [logoClicks, setLogoClicks] = useState(0);
  
  const handleLogoClick = () => {
    if (currentUsername === 'admin') {
      const newCount = logoClicks + 1;
      setLogoClicks(newCount);
      
      if (newCount >= 10) {
        if (onDevModeTrigger) onDevModeTrigger();
        setLogoClicks(0);
      }
      
      // Reset automatique après 2 secondes d'inactivité
      const timer = setTimeout(() => setLogoClicks(0), 2000);
      return () => clearTimeout(timer);
    }
  };

  const sidebarClasses = `
    fixed inset-y-0 z-[100] transform transition-all duration-300 ease-in-out border-slate-800 flex flex-col no-print
    ${theme === 'midnight' ? 'bg-slate-900 border-slate-800' : 'bg-slate-900 border-slate-800'}
    ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
    ${isMobileOpen ? 'translate-x-0 w-72 shadow-2xl' : (isRtl ? 'translate-x-full' : '-translate-x-full') + ' w-72'}
    md:relative md:translate-x-0 ${isExpanded ? 'md:w-72' : 'md:w-20'}
  `;

  const activeColorMap: Record<ThemeType, string> = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
    midnight: 'bg-slate-700',
    slate: 'bg-slate-600'
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="h-24 flex items-center px-6 border-b border-slate-800 shrink-0 relative">
          <div 
            onClick={handleLogoClick}
            className="cursor-pointer transition-transform active:scale-90 flex items-center group select-none relative"
          >
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shadow-lg border border-slate-700" />
            ) : (
              <div className={`w-10 h-10 md:w-12 md:h-12 ${activeColorMap[theme]} rounded-xl flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg`}>
                {companyName[0]}
              </div>
            )}
            {logoClicks > 3 && (
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[8px] font-black text-white animate-ping">
                  {logoClicks}
               </div>
            )}
          </div>
          
          {(isExpanded || isMobileOpen) && (
            <div className="mx-4 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="block font-black text-sm text-white leading-tight tracking-tight truncate">{companyName}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t.active_dz}</span>
            </div>
          )}

          <button onClick={onCloseMobile} className={`md:hidden absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ${isRtl ? 'left-4' : 'right-4'}`}><X size={20} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {filteredItems.map((item) => {
            const isActive = activeModule === item.id;
            const translatedLabel = (translations[language] as any)[item.id.toLowerCase()] || item.label;
            
            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center p-3 rounded-xl transition-all group relative ${isActive ? `${activeColorMap[theme]} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'group-hover:text-white'}`}>{item.icon}</span>
                {(isExpanded || isMobileOpen) && <span className={`mx-3 font-medium text-sm truncate animate-in fade-in slide-in-from-left-2 ${isRtl ? 'text-right' : 'text-left'}`}>{translatedLabel}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center p-3 bg-slate-800/50 rounded-xl border border-slate-800 ${(!isExpanded && !isMobileOpen) && 'justify-center'} ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><ShieldCheck size={16} /></div>
            {(isExpanded || isMobileOpen) && (
              <div className={`mx-3 overflow-hidden ${isRtl ? 'text-right' : 'text-left'}`}>
                 <p className="text-[10px] font-black text-emerald-500 uppercase">LAN SECURE</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
