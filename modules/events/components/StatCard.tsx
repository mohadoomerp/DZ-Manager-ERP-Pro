import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, onClick }) => (
  <button onClick={onClick} disabled={!onClick} className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-500 transition-all text-left group disabled:pointer-events-none disabled:opacity-80 no-print w-full">
    <div className="flex justify-between items-start">
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
        {icon}
      </div>
    </div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">{title}</p>
  </button>
);

export default StatCard;