import React, { useState, useRef } from 'react';
import { Palette, Upload, Move, Type, QrCode, Save, RefreshCw, Image as ImageIcon, Eye, Bold } from 'lucide-react';
import { EventBooking, BadgeTemplate, BadgeFieldConfig } from '../../../types';

interface BadgeDesignerTabProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
}

const DEFAULT_TEMPLATE: BadgeTemplate = {
  widthMm: 85,
  heightMm: 120,
  fields: {
    name: { x: 50, y: 40, fontSize: 24, color: '#000000', isBold: true, isVisible: true },
    company: { x: 50, y: 50, fontSize: 16, color: '#666666', isBold: false, isVisible: true },
    category: { x: 50, y: 85, fontSize: 14, color: '#ffffff', isBold: true, isVisible: true },
    qrCode: { x: 50, y: 70, size: 80, isVisible: true }
  }
};

const BadgeDesignerTab: React.FC<BadgeDesignerTabProps> = ({ event, setEvents }) => {
  const [template, setTemplate] = useState<BadgeTemplate>(event.badgeTemplate || DEFAULT_TEMPLATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateTemplate = (updates: Partial<BadgeTemplate>) => {
    setTemplate(prev => ({ ...prev, ...updates }));
  };

  const updateField = (fieldName: keyof BadgeTemplate['fields'], updates: any) => {
    setTemplate(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: { ...prev.fields[fieldName], ...updates }
      }
    }));
  };

  const handleSave = () => {
    setEvents(prev => prev.map(ev => 
      ev.id === event.id ? { ...ev, badgeTemplate: template, updatedAt: Date.now() } : ev
    ));
    alert("Modèle de badge sauvegardé avec succès pour cet événement !");
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => updateTemplate({ backgroundImage: ev.target?.result as string });
      reader.readAsDataURL(file);
    }
  };

  const FieldControl = ({ label, fieldName, config }: { label: string, fieldName: keyof BadgeTemplate['fields'], config: BadgeFieldConfig }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.isVisible ? 'bg-indigo-500' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">{label}</span>
        </div>
        <input type="checkbox" checked={config.isVisible} onChange={e => updateField(fieldName, { isVisible: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400">Position X (%)</label>
          <input type="range" min="0" max="100" value={config.x} onChange={e => updateField(fieldName, { x: parseInt(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black uppercase text-slate-400">Position Y (%)</label>
          <input type="range" min="0" max="100" value={config.y} onChange={e => updateField(fieldName, { y: parseInt(e.target.value) })} className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl px-2 py-1 border border-slate-100 dark:border-slate-700 flex-1">
            <Type size={12} className="text-slate-400 mr-2" />
            <input type="number" value={config.fontSize} onChange={e => updateField(fieldName, { fontSize: parseInt(e.target.value) })} className="w-full bg-transparent border-none text-[10px] font-bold p-0 outline-none" />
        </div>
        <input type="color" value={config.color} onChange={e => updateField(fieldName, { color: e.target.value })} className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer" />
        <button 
            type="button"
            onClick={() => updateField(fieldName, { isBold: !config.isBold })}
            className={`p-2 rounded-lg transition-colors ${config.isBold ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}
        >
            <Bold size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      
      {/* Configuration Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-indigo-600">
                <Palette size={20} />
                <h3 className="font-black uppercase text-sm tracking-widest">Configuration</h3>
              </div>
              <button onClick={() => setTemplate(DEFAULT_TEMPLATE)} className="text-[8px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">Réinitialiser</button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
             <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-3xl text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-100 transition-all flex items-center justify-center">
                <Upload size={16} className="mr-2" /> Charger un design (PNG/JPG)
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
             
             <FieldControl label="Nom complet" fieldName="name" config={template.fields.name} />
             <FieldControl label="Entreprise" fieldName="company" config={template.fields.company} />
             <FieldControl label="Catégorie" fieldName="category" config={template.fields.category} />

             <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <QrCode size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">QR Code</span>
                  </div>
                  <input type="checkbox" checked={template.fields.qrCode.isVisible} onChange={e => updateField('qrCode', { isVisible: e.target.checked })} className="accent-indigo-600 w-4 h-4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Position X (%)</label>
                    <input type="range" min="0" max="100" value={template.fields.qrCode.x} onChange={e => updateField('qrCode', { x: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Position Y (%)</label>
                    <input type="range" min="0" max="100" value={template.fields.qrCode.y} onChange={e => updateField('qrCode', { y: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                  </div>
                </div>
             </div>
          </div>

          <button onClick={handleSave} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all">
            <Save size={18} className="mr-2" /> Enregistrer le modèle
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-2 flex flex-col items-center">
        <div className="sticky top-8 space-y-4 w-full flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-4">
              <Eye size={16} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aperçu du Badge Pro (85x120mm)</p>
          </div>
          
          <div 
            className="bg-white rounded-3xl shadow-2xl relative overflow-hidden border border-slate-200"
            style={{ width: '85mm', height: '120mm', transform: 'scale(0.85)', transformOrigin: 'top center' }}
          >
            {template.backgroundImage ? (
              <img src={template.backgroundImage} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 m-4 rounded-2xl">
                <ImageIcon size={48} className="text-slate-200" />
              </div>
            )}

            {template.fields.name.isVisible && (
              <div className="absolute transform -translate-x-1/2" style={{ 
                  left: `${template.fields.name.x}%`, 
                  top: `${template.fields.name.y}%`, 
                  fontSize: `${template.fields.name.fontSize}px`, 
                  color: template.fields.name.color, 
                  fontWeight: template.fields.name.isBold ? '900' : '400',
                  whiteSpace: 'nowrap'
              }}>
                MOHAMED AMINE
              </div>
            )}

            {template.fields.company.isVisible && (
              <div className="absolute transform -translate-x-1/2" style={{ 
                  left: `${template.fields.company.x}%`, 
                  top: `${template.fields.company.y}%`, 
                  fontSize: `${template.fields.company.fontSize}px`, 
                  color: template.fields.company.color, 
                  fontWeight: template.fields.company.isBold ? '900' : '400',
                  whiteSpace: 'nowrap'
              }}>
                DZ-MANAGER SOLUTIONS
              </div>
            )}

            {template.fields.qrCode.isVisible && (
              <div className="absolute transform -translate-x-1/2 bg-white p-2 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden" style={{ 
                  left: `${template.fields.qrCode.x}%`,
                  top: `${template.fields.qrCode.y}%`, 
                  width: `${template.fields.qrCode.size}px`, 
                  height: `${template.fields.qrCode.size}px` 
              }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=DEMO-QR`} alt="Demo QR" className="w-full h-full object-contain" />
              </div>
            )}

            {template.fields.category.isVisible && (
              <div className="absolute transform -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white font-black uppercase shadow-lg rounded-full" style={{ 
                  left: `${template.fields.category.x}%`,
                  top: `${template.fields.category.y}%`, 
                  fontSize: `${template.fields.category.fontSize}px` 
              }}>
                VISITEUR VIP
              </div>
            )}
          </div>
          
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-4 rounded-3xl max-w-sm mt-[-20px] shadow-sm">
             <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold leading-relaxed text-center">
               <RefreshCw size={12} className="inline mr-2" /> Le rendu final utilise les données réelles de l'inscrit lors de l'impression.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeDesignerTab;