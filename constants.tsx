
import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Package, 
  ShoppingCart, 
  Wallet, 
  Users, 
  BookOpen,
  Settings, 
  FileText,
  Truck,
  UserPlus,
  ShieldCheck,
  Target,
  Zap,
  Key,
  Watch
} from 'lucide-react';
import { ModuleType, UserRole } from './types';

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUCED: 0.09,
  TIMBRE_MAX: 2500, // Max 2500 DA for standard cash payments
  TIMBRE_MIN: 5,    // Min 5 DA
  TIMBRE_RATE: 0.01,
  TAP_RATE: 0.02, 
};

export const MENU_ITEMS = [
  { id: ModuleType.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: ModuleType.OPERATIONS, label: 'Mission Control', icon: <Zap size={20} className="text-amber-500" /> },
  { id: ModuleType.TIME_CLOCK, label: 'Pointeuse ZK', icon: <Watch size={20} className="text-cyan-500" /> },
  { id: ModuleType.CRM, label: 'CRM & Pipeline', icon: <Target size={20} /> },
  { id: ModuleType.SALES, label: 'Ventes & Factures', icon: <FileText size={20} /> },
  { id: ModuleType.CLIENTS, label: 'Clients', icon: <Users size={20} /> },
  { id: ModuleType.SUPPLIERS, label: 'Fournisseurs', icon: <Truck size={20} /> },
  { id: ModuleType.EVENTS, label: 'Événements & Location', icon: <CalendarDays size={20} /> },
  { id: ModuleType.INVENTORY, label: 'Stocks & Actifs', icon: <Package size={20} /> },
  { id: ModuleType.PURCHASES, label: 'Achats', icon: <ShoppingCart size={20} /> },
  { id: ModuleType.FINANCE, label: 'Caisse & Trésorerie', icon: <Wallet size={20} /> },
  { id: ModuleType.HR, label: 'RH & Paie', icon: <Users size={20} /> },
  { id: ModuleType.ACCOUNTING, label: 'Comptabilité / Tax', icon: <BookOpen size={20} /> },
  { id: ModuleType.USERS, label: 'Accès Utilisateurs', icon: <UserPlus size={20} /> },
  { id: ModuleType.LICENSE_GEN, label: 'Générateur Licences', icon: <ShieldCheck size={20} className="text-indigo-500" /> },
  { id: ModuleType.SETTINGS, label: 'Configuration', icon: <Settings size={20} /> },
];

export const ROLE_PERMISSIONS: Record<UserRole, ModuleType[]> = {
  'ADMIN': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, 
    ModuleType.EVENTS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.HR, 
    ModuleType.ACCOUNTING, ModuleType.USERS, ModuleType.SETTINGS 
  ],
  'MANAGER': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, 
    ModuleType.EVENTS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.HR, 
    ModuleType.ACCOUNTING, ModuleType.SETTINGS 
  ],
  'ACCOUNTANT': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.ACCOUNTING, ModuleType.FINANCE, ModuleType.SALES, ModuleType.PURCHASES, ModuleType.EVENTS
  ],
  'SALES': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.INVENTORY, ModuleType.EVENTS
  ],
  'HR_MANAGER': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.HR
  ]
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-DZ', { 
    style: 'currency', 
    currency: 'DZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const numberToWords = (n: number): string => {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  const special = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];

  const convertBase = (num: number): string => {
    if (num === 0) return "";
    if (num < 10) return units[num];
    if (num < 17) return special[num - 10];
    if (num < 20) return "dix-" + units[num - 10];
    if (num < 70) {
      const unit = num % 10;
      return tens[Math.floor(num / 10)] + (unit === 1 ? "-et-un" : (unit > 0 ? "-" + units[unit] : ""));
    }
    if (num < 80) return "soixante-" + convertBase(num - 60);
    if (num < 100) return "quatre-vingt" + (num === 80 ? "s" : "-" + convertBase(num - 80));
    if (num < 1000) {
      const hundred = Math.floor(num / 100);
      const rest = num % 100;
      let text = (hundred === 1 ? "" : units[hundred] + "-") + "cent";
      if (hundred > 1 && rest === 0) text += "s";
      return text + (rest > 0 ? "-" + convertBase(rest) : "");
    }
    if (num < 1000000) {
      const thousand = Math.floor(num / 100);
      const rest = num % 1000;
      let text = (thousand === 1 ? "" : convertBase(thousand) + "-") + "mille";
      return text + (rest > 0 ? "-" + convertBase(rest) : "");
    }
    return num.toString();
  };

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) return "Zéro Dinars Algériens";

  let result = "";
  if (integerPart > 0) {
    result = convertBase(integerPart) + (integerPart > 1 ? " Dinars Algériens" : " Dinar Algérien");
  }

  if (decimalPart > 0) {
    if (result !== "") result += " et ";
    result += convertBase(decimalPart) + (decimalPart > 1 ? " Centimes" : " Centime");
  }

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1).replace(/-$/, "");
};
