import React, { useMemo } from 'react';
import { TrendingUp, Users, ShoppingCart, Package, ArrowUpRight, AlertCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '../constants';
import { Language, translations } from '../translations';
import { ModuleType, Invoice, Product, Transaction, SessionInfo } from '../types';

interface DashboardProps {
  onNavigate: (module: ModuleType) => void;
  invoices: Invoice[];
  products: Product[];
  transactions: Transaction[];
  theme: 'light' | 'dark';
  language: Language;
  activeSessions?: SessionInfo[];
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; trend: string; rtl?: boolean; onClick?: () => void }> = ({ title, value, icon, color, trend, rtl, onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group ${rtl ? 'text-right' : 'text-left'} ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
    <div className={`flex items-center justify-between mb-4 md:mb-6 ${rtl ? 'flex-row-reverse' : ''}`}>
      <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 dark:text-${color.split('-')[1]}-400 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className={`px-2 py-1 md:px-3 bg-slate-50 dark:bg-slate-800 rounded-full text-[9px] md:text-[10px] font-black text-emerald-500 flex items-center ${rtl ? 'flex-row-reverse' : ''}`}>
        <ArrowUpRight size={10} className={rtl ? 'ml-1' : 'mr-1'} /> {trend}
      </div>
    </div>
    <div>
      <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1">{title}</p>
      <p className="text-lg md:text-3xl font-black text-slate-800 dark:text-white tracking-tighter truncate">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, invoices, products, transactions, theme, language, activeSessions = [] }) => {
  const t = translations[language];
  const isRtl = language === 'ar';

  const stats = useMemo(() => {
    // Seules les factures finales validées comptent dans le CA
    const totalSales = invoices
      .filter(inv => inv.type === 'Invoice' && inv.status === 'Validated')
      .reduce((acc, inv) => acc + inv.totalTTC, 0);
      
    const criticalStock = products.filter(p => p.stock <= p.minStock).length;
    // Calcul du solde en ignorant les transactions supprimées
    const balance = transactions.filter(t => !t.isDeleted).reduce((acc, tx) => acc + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
    const onlineNow = activeSessions.filter(s => new Date(s.lastActive).getTime() > Date.now() - 900000).length;
    return { totalSales, criticalStock, balance, onlineNow };
  }, [invoices, products, transactions, activeSessions]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6">
        <StatCard 
          title={t.total_sales} 
          value={formatCurrency(stats.totalSales)} 
          icon={<TrendingUp size={20} className="md:w-6 md:h-6" />} 
          color="bg-indigo-500" 
          trend="+14.2%"
          rtl={isRtl}
        />
        <StatCard 
          title={t.cash_balance} 
          value={formatCurrency(stats.balance)} 
          icon={<ShoppingCart size={20} className="md:w-6 md:h-6" />} 
          color="bg-emerald-500" 
          trend="+5.1%"
          rtl={isRtl}
        />
        <StatCard 
          title={t.stock_items} 
          value={products.length.toString()} 
          icon={<Package size={20} className="md:w-6 md:h-6" />} 
          color="bg-blue-500" 
          trend="0.0%"
          rtl={isRtl}
        />
        <StatCard 
          title="Utilisateurs" 
          value={activeSessions.length.toString()} 
          icon={<Users size={20} className="md:w-6 md:h-6" />} 
          color="bg-purple-500" 
          trend={`${stats.onlineNow} actifs`}
          rtl={isRtl}
          onClick={() => onNavigate(ModuleType.SETTINGS)}
        />
        <div onClick={() => onNavigate(ModuleType.INVENTORY)} className={`cursor-pointer bg-rose-500 p-4 md:p-8 rounded-[24px] md:rounded-[32px] shadow-lg shadow-rose-500/20 flex flex-col justify-between text-white group hover:scale-[1.02] transition-all col-span-2 md:col-span-1 ${isRtl ? 'text-right' : 'text-left'}`}>
           <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
             <div className="p-2 md:p-3 bg-white/20 rounded-xl"><AlertCircle size={20} className="md:w-6 md:h-6" /></div>
             <Sparkles size={16} className="animate-pulse md:w-5 md:h-5" />
           </div>
           <div className="mt-2 md:mt-4">
             <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{t.stock_alerts}</p>
             <p className="text-xl md:text-3xl font-black">{stats.criticalStock} <span className="text-xs md:text-sm font-bold opacity-60 uppercase">{isRtl ? 'أصول' : 'Assets'}</span></p>
           </div>
        </div>
      </div>

      <div className="w-full">
        <div className={`bg-slate-900 dark:bg-slate-900/50 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <h3 className="font-black text-indigo-300 text-xs uppercase tracking-[0.2em] mb-6 md:mb-8 relative z-10">{t.recent_flows}</h3>
          <div className="space-y-3 relative z-10 flex-1 overflow-y-auto custom-scrollbar-light">
            {transactions.slice(0, 8).map((tx, i) => (
              <div key={i} className={`flex items-center justify-between p-3 md:p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-lg ${isRtl ? 'ml-3' : 'mr-3'} ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <i className={`fa-solid ${tx.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs`}></i>
                  </div>
                  <div className={isRtl ? 'text-right' : 'text-left'}>
                    <p className="text-[10px] md:text-xs font-black text-white leading-none mb-1 truncate max-w-[200px]">{tx.title}</p>
                    <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-[10px] md:text-xs font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount).split('DZD')[0]}
                </p>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate(ModuleType.FINANCE)} className="mt-6 py-3 md:py-4 bg-white/10 hover:bg-white text-indigo-300 hover:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
             {t.all_treasury}
          </button>
          <ShoppingCart size={180} className={`absolute -bottom-10 opacity-5 text-white pointer-events-none ${isRtl ? '-right-10' : '-left-10'}`} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
