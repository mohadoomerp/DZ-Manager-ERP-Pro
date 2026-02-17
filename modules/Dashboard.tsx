
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { TrendingUp, Users, ShoppingCart, Package, ArrowUpRight, ArrowDownRight, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
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
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group ${rtl ? 'text-right' : 'text-left'} ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}>
    <div className={`flex items-center justify-between mb-6 ${rtl ? 'flex-row-reverse' : ''}`}>
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 dark:text-${color.split('-')[1]}-400 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className={`px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-black text-emerald-500 flex items-center ${rtl ? 'flex-row-reverse' : ''}`}>
        <ArrowUpRight size={12} className={rtl ? 'ml-1' : 'mr-1'} /> {trend}
      </div>
    </div>
    <div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1.5">{title}</p>
      <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{value}</p>
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
    const balance = transactions.reduce((acc, tx) => acc + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
    const onlineNow = activeSessions.filter(s => new Date(s.lastActive).getTime() > Date.now() - 900000).length;
    return { totalSales, criticalStock, balance, onlineNow };
  }, [invoices, products, transactions, activeSessions]);

  const data = [
    { name: isRtl ? 'أ1' : 'W1', sales: 4000 },
    { name: isRtl ? 'أ2' : 'W2', sales: 3000 },
    { name: isRtl ? 'أ3' : 'W3', sales: stats.totalSales > 0 ? stats.totalSales / 1000 : 2500 },
    { name: isRtl ? 'أ4' : 'W4', sales: 2780 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          title={t.total_sales} 
          value={formatCurrency(stats.totalSales)} 
          icon={<TrendingUp size={24} />} 
          color="bg-indigo-500" 
          trend="+14.2%"
          rtl={isRtl}
        />
        <StatCard 
          title={t.cash_balance} 
          value={formatCurrency(stats.balance)} 
          icon={<ShoppingCart size={24} />} 
          color="bg-emerald-500" 
          trend="+5.1%"
          rtl={isRtl}
        />
        <StatCard 
          title={t.stock_items} 
          value={products.length.toString()} 
          icon={<Package size={24} />} 
          color="bg-blue-500" 
          trend="0.0%"
          rtl={isRtl}
        />
        <StatCard 
          title="Utilisateurs License" 
          value={activeSessions.length.toString()} 
          icon={<Users size={24} />} 
          color="bg-purple-500" 
          trend={`${stats.onlineNow} actifs`}
          rtl={isRtl}
          onClick={() => onNavigate(ModuleType.SETTINGS)}
        />
        <div onClick={() => onNavigate(ModuleType.INVENTORY)} className={`cursor-pointer bg-rose-500 p-8 rounded-[32px] shadow-lg shadow-rose-500/20 flex flex-col justify-between text-white group hover:scale-[1.02] transition-all ${isRtl ? 'text-right' : 'text-left'}`}>
           <div className={`flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
             <div className="p-3 bg-white/20 rounded-xl"><AlertCircle size={24} /></div>
             <Sparkles size={20} className="animate-pulse" />
           </div>
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{t.stock_alerts}</p>
             <p className="text-3xl font-black">{stats.criticalStock} <span className="text-sm font-bold opacity-60 uppercase">{isRtl ? 'أصول' : 'Assets'}</span></p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className={`flex items-center justify-between mb-10 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">{t.performance}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Weekly Revenue Evolution</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  reversed={isRtl}
                  tick={{fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700}} 
                />
                <YAxis 
                  orientation={isRtl ? 'right' : 'left'}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: theme === 'dark' ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    textAlign: isRtl ? 'right' : 'left'
                  }}
                  itemStyle={{fontWeight: 900, textTransform: 'uppercase', fontSize: '10px'}}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`bg-slate-900 dark:bg-slate-900/50 p-8 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border border-white/5 ${isRtl ? 'text-right' : 'text-left'}`}>
          <h3 className="font-black text-indigo-300 text-xs uppercase tracking-[0.2em] mb-8 relative z-10">{t.recent_flows}</h3>
          <div className="space-y-4 relative z-10 flex-1 overflow-y-auto custom-scrollbar-light">
            {transactions.slice(0, 5).map((tx, i) => (
              <div key={i} className={`flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-2 rounded-lg ${isRtl ? 'ml-3' : 'mr-3'} ${tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    <i className={`fa-solid ${tx.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'} text-xs`}></i>
                  </div>
                  <div className={isRtl ? 'text-right' : 'text-left'}>
                    <p className="text-xs font-black text-white leading-none mb-1">{tx.title}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate(ModuleType.FINANCE)} className="mt-6 py-4 bg-white/10 hover:bg-white text-indigo-300 hover:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
             {t.all_treasury}
          </button>
          <ShoppingCart size={180} className={`absolute -bottom-10 opacity-5 text-white pointer-events-none ${isRtl ? '-right-10' : '-left-10'}`} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
