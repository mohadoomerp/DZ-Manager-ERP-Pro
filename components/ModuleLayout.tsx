
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ModuleLayoutProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ title, subtitle, icon, actions, children, className = "" }) => {
  return (
    <div className={`space-y-8 animate-in fade-in duration-500 pb-20 ${className}`}>
      {/* Universal Module Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center space-x-5">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] text-indigo-600 dark:text-indigo-400 shadow-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">{title}</h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{subtitle}</p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center space-x-3 w-full md:w-auto">
            {actions}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default ModuleLayout;
