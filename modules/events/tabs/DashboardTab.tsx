
import React, { useMemo } from 'react';
import { Users, Layout, TrendingDown, Briefcase, TrendingUp, DollarSign, Wallet, Percent, ArrowUpRight, UserCheck, UserMinus, Activity } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../../constants';
import { EventBooking, Product } from '../../../types';

interface DashboardTabProps {
  activeEvent: EventBooking;
  setActiveTab: (tab: any) => void;
  products: Product[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

const DashboardTab: React.FC<DashboardTabProps> = ({ activeEvent, setActiveTab, products }) => {
  
  // CALCULS FINANCIERS
  const financials = useMemo(() => {
    const standsRevenue = (activeEvent.stands || []).reduce((acc, s) => s.participantId ? acc + (s.area * s.pricePerSqm) : acc, 0);
    const registrationRevenue = (activeEvent.participants || []).length * (activeEvent.registrationFee || 0);
    const servicesRevenue = (activeEvent.items || []).reduce((acc, item) => {
        const product = products.find(p => p.id === item.productId);
        return acc + (item.quantity * (product?.priceRetail || 0));
    }, 0);

    const totalRevenue = standsRevenue + registrationRevenue + servicesRevenue;
    const totalExpenses = (activeEvent.expenses || []).reduce((acc, e) => acc + e.amount, 0);
    return { totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
  }, [activeEvent, products]);

  // CALCULS FRÉQUENTATION (CHECK-IN)
  const attendance = useMemo(() => {
      const totalVisitors = (activeEvent.visitors || []).length;
      const checkedInVisitors = (activeEvent.visitors || []).filter(v => v.isCheckedIn).length;
      
      const totalExhibitors = (activeEvent.exhibitorTeams || []).length;
      const checkedInExhibitors = (activeEvent.exhibitorTeams || []).filter(m => m.isCheckedIn).length;

      const totalExpected = totalVisitors + totalExhibitors;
      const totalPresent = checkedInVisitors + checkedInExhibitors;
      const globalRate = totalExpected > 0 ? (totalPresent / totalExpected) * 100 : 0;

      return { totalVisitors, checkedInVisitors, totalExhibitors, checkedInExhibitors, totalExpected, totalPresent, globalRate };
  }, [activeEvent]);

  // DATA POUR GRAPHIQUE CATÉGORIES VISITEURS
  const visitorStatsByCategory = useMemo(() => {
      const cats: Record<string, { total: number, present: number }> = {};
      (activeEvent.visitors || []).forEach(v => {
          if (!cats[v.category]) cats[v.category] = { total: 0, present: 0 };
          cats[v.category].total++;
          if (v.isCheckedIn) cats[v.category].present++;
      });
      return Object.entries(cats).map(([name, data]) => ({
          name: name.toUpperCase(),
          Attendus: data.total,
          Présents: data.present
      }));
  }, [activeEvent.visitors]);

  const checkinPieData = [
      { name: 'Présents', value: attendance.totalPresent },
      { name: 'Absents', value: attendance.totalExpected - attendance.totalPresent }
  ].filter(d => d.value > 0);

  return (
    <div className="animate-in fade-in duration-300 space-y-8 pb-20">
      
      {/* KPI ATTENDANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-500 rounded-2xl"><Activity size={20} /></div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase">LIVE EN DIRECT</span>
                  </div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Fréquentation Totale</p>
                  <p className="text-3xl font-black mt-1">{attendance.totalPresent} <span className="text-lg opacity-40">/ {attendance.totalExpected}</span></p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Taux d'arrivée : {attendance.globalRate.toFixed(1)}%</p>
              </div>
              <Activity size={100} className="absolute right-[-20px] bottom-[-20px] opacity-10" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm group cursor-pointer" onClick={() => setActiveTab('visitors')}>
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600"><Users size={20} /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Visiteurs</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in Visiteurs</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{attendance.checkedInVisitors} <span className="text-sm opacity-40">PRÉSENTS</span></p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${(attendance.checkedInVisitors / (attendance.totalVisitors || 1)) * 100}%` }}></div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm group cursor-pointer" onClick={() => setActiveTab('staff')}>
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600"><Briefcase size={20} /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Exposants</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in Staff Exposants</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{attendance.checkedInExhibitors} <span className="text-sm opacity-40">SUR SITE</span></p>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${(attendance.checkedInExhibitors / (attendance.totalExhibitors || 1)) * 100}%` }}></div>
              </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600"><Wallet size={20} /></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Finances</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marge Événement</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(financials.netProfit)}</p>
              <p className="text-[9px] font-bold text-slate-400 mt-2">Rentabilité brute estimée</p>
          </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FRÉQUENTATION PAR CATÉGORIE */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-widest flex items-center"><UserCheck size={16} className="mr-2 text-indigo-600"/> Analyse des entrées par catégorie</h3>
              </div>
              <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visitorStatsByCategory}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="Attendus" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
                          <Bar dataKey="Présents" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* PIE CHART GLOBAL STATUS */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white mb-10 tracking-widest w-full">Status Global</h3>
              <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={checkinPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {checkinPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f1f5f9'} />
                              ))}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(attendance.globalRate)}%</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Présents</p>
                  </div>
              </div>
              <div className="mt-8 space-y-3 w-full">
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                      <span className="text-[10px] font-black text-emerald-700 uppercase">Sur site</span>
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-300">{attendance.totalPresent}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Non arrivés</span>
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">{attendance.totalExpected - attendance.totalPresent}</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default DashboardTab;
