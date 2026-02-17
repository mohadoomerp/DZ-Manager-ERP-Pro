
import React, { useState, useMemo } from 'react';
import { Package, Search, Plus, Filter, AlertCircle, RefreshCcw, X, Tag, Calendar, Database, Trash2, Edit3, Save, Box, Layers, BarChart3, Wrench, CheckCircle2, Ban, ShoppingCart, Key, Cpu } from 'lucide-react';
import { Product, User, AuditLog, ModuleType } from '../types';
import { formatCurrency } from '../constants';

interface InventoryModuleProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  currentUser: User;
  onAddLog: (action: AuditLog['action'], module: ModuleType, details: string) => void;
}

const CATEGORIES = ['Informatique', 'Fournitures Bureau', 'Matériel BTP', 'Outillage', 'Mobilier', 'Consommables', 'Pièces Rechange', 'Autre'];
const UNITS = ['Unité (U)', 'Kilogramme (Kg)', 'Litre (L)', 'Mètre (M)', 'Mètre Linéaire (ML)', 'Boite (Bte)', 'Ramette'];

const InventoryModule: React.FC<InventoryModuleProps> = ({ products, setProducts, currentUser, onAddLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Available' | 'Rented' | 'Maintenance' | 'Broken'>('All');

  const stats = useMemo(() => {
    return {
      totalValue: products.reduce((acc, p) => acc + (p.stock * p.priceRetail), 0),
      alerts: products.filter(p => p.isPhysical && p.stock <= p.minStock).length,
      maintenance: products.filter(p => p.status === 'Maintenance').length,
      available: products.filter(p => p.status === 'Available').length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [products, searchTerm, filterStatus]);

  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData: Product = {
      id: editingProduct?.id || `PRD-${Date.now().toString().slice(-6)}`,
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      priceRetail: parseFloat(formData.get('priceRetail') as string) || 0,
      priceWholesale: parseFloat(formData.get('priceWholesale') as string) || 0,
      rentalPriceDay: parseFloat(formData.get('rentalPriceDay') as string) || 0,
      stock: parseInt(formData.get('stock') as string) || 0,
      minStock: parseInt(formData.get('minStock') as string) || 0,
      isRental: formData.get('isRental') === 'on',
      isSale: formData.get('isSale') === 'on',
      isPhysical: formData.get('isPhysical') === 'on',
      status: (formData.get('status') as any) || 'Available',
      lotNumber: formData.get('lotNumber') as string,
      expiryDate: formData.get('expiryDate') as string || undefined,
      createdBy: editingProduct?.createdBy || currentUser.name
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? productData : p));
      onAddLog('UPDATE', ModuleType.INVENTORY, `Mise à jour produit ${productData.name}`);
    } else {
      setProducts(prev => [productData, ...prev]);
      onAddLog('CREATE', ModuleType.INVENTORY, `Nouveau produit ${productData.name}`);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const updateStatus = (id: string, status: Product['status']) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status };
      }
      return p;
    }));
    const product = products.find(p => p.id === id);
    if(product) onAddLog('UPDATE', ModuleType.INVENTORY, `Statut produit ${product.name} : ${status}`);
  };

  const deleteProduct = (product: Product) => {
    setProducts(prev => prev.filter(x => x.id !== product.id));
    onAddLog('DELETE', ModuleType.INVENTORY, `Suppression produit ${product.name}`);
  }

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rented': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maintenance': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Broken': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Catalogue Articles & Services</h2>
          <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mt-1">Gestion mixte Vente, Location et Services</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center shadow-xl hover:bg-indigo-600 transition-all active:scale-95">
          <Plus size={18} className="mr-3" /> Nouveau Produit / Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center group">
           <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-700 mr-5"><Database size={24} /></div>
           <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valeur Stock</p><p className="text-xl font-black text-slate-900">{formatCurrency(stats.totalValue)}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center group">
           <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 mr-5"><CheckCircle2 size={24} /></div>
           <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p><p className="text-xl font-black text-slate-900">{stats.available}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center group">
           <div className="p-4 rounded-2xl bg-amber-50 text-amber-700 mr-5"><Wrench size={24} /></div>
           <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">En Maintenance</p><p className="text-xl font-black text-slate-900">{stats.maintenance}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center group">
           <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 mr-5"><AlertCircle size={24} /></div>
           <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Alerte Stock</p><p className="text-xl font-black text-rose-700">{stats.alerts}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Référence ou nom..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400" />
           </div>
           <div className="flex space-x-2">
              {['All', 'Available', 'Maintenance', 'Broken'].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-300'}`}>
                  {s === 'All' ? 'Tous' : s}
                </button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-600 uppercase text-[10px] tracking-widest">
                <th className="px-8 py-5">Article & Nature</th>
                <th className="px-8 py-5">Usage</th>
                <th className="px-8 py-5">Prix & Stock</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm mr-4 border ${getStatusStyle(p.status)}`}>
                        {p.isPhysical ? <Package size={20} /> : <Key size={20} className="text-purple-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{p.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                           <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${getStatusStyle(p.status)}`}>{p.status}</span>
                           <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase ${p.isPhysical ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'}`}>{p.isPhysical ? 'Physique' : 'Service'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-1">
                       {p.isSale && <span className="text-[7px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">Pour Vente</span>}
                       {p.isRental && <span className="text-[7px] font-black bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full uppercase">Pour Location</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs font-black text-slate-900">Vente: {formatCurrency(p.priceRetail)}</p>
                    {p.isRental && <p className="text-[9px] font-bold text-indigo-600 mt-0.5">Loc: {formatCurrency(p.rentalPriceDay)}/j</p>}
                    <div className={`mt-1 text-[10px] font-black ${p.isPhysical && p.stock <= p.minStock ? 'text-rose-600' : 'text-slate-600'}`}>
                      {p.isPhysical ? `${p.stock} ${p.unit.split(' ')[0]} (Min: ${p.minStock})` : 'Illimité (Service)'}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => updateStatus(p.id, 'Maintenance')} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl" title="Maintenance"><Wrench size={16}/></button>
                       <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16} /></button>
                       <button onClick={() => deleteProduct(p)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={4} className="py-20 text-center font-black uppercase text-xs text-slate-400">Aucun article trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col h-[90vh]">
            <div className="p-8 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><Box size={24} /></div>
                 <div>
                   <h3 className="font-black uppercase tracking-widest text-sm">{editingProduct ? 'Modifier' : 'Nouveau Produit'}</h3>
                   <p className="text-[10px] text-indigo-300 font-bold uppercase">Configuration Directe</p>
                 </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-10 custom-scrollbar">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2 flex items-center"><Layers size={14} className="mr-3"/> Nature & Usage</h4>
                
                <div className="grid grid-cols-1 gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-200">
                   <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" name="isPhysical" defaultChecked={editingProduct ? editingProduct.isPhysical : true} className="w-5 h-5 accent-indigo-600 rounded" />
                      <div className="flex items-center space-x-3">
                         <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-indigo-300"><Package size={14} /></div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-800">Produit Physique</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Gestion de stock activée</p>
                         </div>
                      </div>
                   </label>
                   <div className="h-px bg-slate-200"></div>
                   <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" name="isSale" defaultChecked={editingProduct ? editingProduct.isSale : true} className="w-5 h-5 accent-emerald-600 rounded" />
                      <div className="flex items-center space-x-3">
                         <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-emerald-300"><ShoppingCart size={14} className="text-emerald-600" /></div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-800">Disponible à la Vente</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Afficher dans le module facturation</p>
                         </div>
                      </div>
                   </label>
                   <div className="h-px bg-slate-200"></div>
                   <label className="flex items-center space-x-3 cursor-pointer group">
                      <input type="checkbox" name="isRental" defaultChecked={editingProduct ? editingProduct.isRental : false} className="w-5 h-5 accent-blue-600 rounded" />
                      <div className="flex items-center space-x-3">
                         <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-blue-300"><Calendar size={14} className="text-blue-600" /></div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-800">Disponible à la Location</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase">Afficher dans le module événements</p>
                         </div>
                      </div>
                   </label>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Désignation</label>
                  <input name="name" required defaultValue={editingProduct?.name} placeholder="Nom du produit" className="w-full px-6 py-4 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-950 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Code / SKU</label>
                    <input name="code" required defaultValue={editingProduct?.code} placeholder="SKU-XXXX" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-950 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Unité</label>
                    <select name="unit" defaultValue={editingProduct?.unit} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-900 outline-none">{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-2 flex items-center"><BarChart3 size={14} className="mr-3"/> Tarification & Stock</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Prix Vente (DA)</label>
                    <input name="priceRetail" type="number" required defaultValue={editingProduct?.priceRetail} placeholder="0.00" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-950" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Prix Loc / Jour (DA)</label>
                    <input name="rentalPriceDay" type="number" defaultValue={editingProduct?.rentalPriceDay || 0} placeholder="0.00" className="w-full px-5 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl font-black text-blue-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Stock Actuel</label>
                    <input name="stock" type="number" required defaultValue={editingProduct?.stock || 0} placeholder="0" className="w-full px-5 py-3.5 bg-rose-50 border border-rose-200 rounded-2xl font-black text-rose-900" />
                  </div>
                  <div>
                   <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Seuil Alerte</label>
                   <input name="minStock" type="number" required defaultValue={editingProduct?.minStock || 5} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-950" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Catégorie</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-900 outline-none">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">N° Lot</label>
                    <input name="lotNumber" defaultValue={editingProduct?.lotNumber} placeholder="LOT-XXX" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-950 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-2 ml-1">Date Péremption</label>
                    <input name="expiryDate" type="date" defaultValue={editingProduct?.expiryDate} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-black text-slate-900 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-200 flex justify-end space-x-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 text-slate-700 font-bold uppercase text-xs tracking-widest hover:text-slate-950">Annuler</button>
              <button type="submit" className="px-16 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all flex items-center"><Save size={20} className="mr-3" /> Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InventoryModule;
