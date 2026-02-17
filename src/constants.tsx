

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
  Watch,
  ScanBarcode
} from 'lucide-react';
import { ModuleType, UserRole, LicenseType } from './types';

export const TAX_RATES = {
  TVA_NORMAL: 0.19,
  TVA_REDUCED: 0.09,
  TIMBRE_MAX: 2500, // Max 2500 DA for standard cash payments in Algeria
  TIMBRE_MIN: 5,    // Min 5 DA
  TIMBRE_RATE: 0.01, // 1%
  TAP_RATE: 0.02, 
};

export const MENU_ITEMS = [
  { id: ModuleType.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: ModuleType.RETAIL, label: 'Caisse Tactile', icon: <ScanBarcode size={20} className="text-emerald-500" /> },
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
    ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, 
    ModuleType.EVENTS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.HR, 
    ModuleType.ACCOUNTING, ModuleType.USERS, ModuleType.SETTINGS 
  ],
  'MANAGER': [
    ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, 
    ModuleType.EVENTS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.HR, 
    ModuleType.ACCOUNTING, ModuleType.SETTINGS 
  ],
  'ACCOUNTANT': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.ACCOUNTING, ModuleType.FINANCE, ModuleType.SALES, ModuleType.PURCHASES, ModuleType.EVENTS
  ],
  'SALES': [
    ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.OPERATIONS, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.INVENTORY, ModuleType.EVENTS
  ],
  'HR_MANAGER': [
    ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.TIME_CLOCK, ModuleType.HR
  ]
};

export const LICENSE_PLANS: Record<string, { type: LicenseType, modules: ModuleType[], maxUsers: number, name: string }> = {
  'STA': { 
    type: 'STARTUP',
    name: 'Starter TPE',
    maxUsers: 2,
    modules: [ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.INVENTORY, ModuleType.FINANCE, ModuleType.SETTINGS]
  },
  'RET': { 
    type: 'RETAIL',
    name: 'Retail Négoce',
    maxUsers: 5,
    modules: [ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.SETTINGS]
  },
  'SER': { 
    type: 'SERVICE',
    name: 'Services & CRM',
    maxUsers: 5,
    modules: [ModuleType.DASHBOARD, ModuleType.OPERATIONS, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.FINANCE, ModuleType.SETTINGS]
  },
  'HR_': { 
    type: 'HR_FOCUS',
    name: 'RH & Paie',
    maxUsers: 3,
    modules: [ModuleType.DASHBOARD, ModuleType.HR, ModuleType.TIME_CLOCK, ModuleType.USERS, ModuleType.SETTINGS]
  },
  'EVE': { 
    type: 'EVENTS',
    name: 'Event Planner',
    maxUsers: 5,
    modules: [ModuleType.DASHBOARD, ModuleType.EVENTS, ModuleType.CRM, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.FINANCE, ModuleType.SETTINGS]
  },
  'BUS': { 
    type: 'BUSINESS',
    name: 'PME Intégrale',
    maxUsers: 15,
    modules: [ModuleType.DASHBOARD, ModuleType.RETAIL, ModuleType.OPERATIONS, ModuleType.SALES, ModuleType.CLIENTS, ModuleType.SUPPLIERS, ModuleType.INVENTORY, ModuleType.PURCHASES, ModuleType.FINANCE, ModuleType.HR, ModuleType.ACCOUNTING, ModuleType.CRM, ModuleType.SETTINGS, ModuleType.USERS]
  },
  'COR': { 
    type: 'CORPORATE',
    name: 'Holding Unlimited',
    maxUsers: 999,
    modules: Object.values(ModuleType)
  }
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
  if (n === 0) return "Zéro Dinar Algérien";

  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  const convertGroup = (num: number): string => {
    let str = "";
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      if (hundreds === 1) str += "cent";
      else str += units[hundreds] + " cent";
      if (remainder === 0 && hundreds > 1) str += "s"; 
      if (remainder > 0) str += " ";
      num = remainder;
    }
    if (num > 0) {
      if (num < 10) str += units[num];
      else if (num < 20) str += teens[num - 10];
      else {
        const ten = Math.floor(num / 10);
        const unit = num % 10;
        str += tens[ten];
        if (unit > 0) str += (unit === 1 && ten < 8 ? " et " : "-") + units[unit];
      }
    }
    return str;
  };

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  let result = "";
  if (integerPart === 0) result = "Zéro";
  else {
    const billions = Math.floor(integerPart / 1000000000);
    let remaining = integerPart % 1000000000;
    if (billions > 0) result += convertGroup(billions) + " milliard" + (billions > 1 ? "s" : "") + " ";
    const millions = Math.floor(remaining / 1000000);
    remaining = remaining % 1000000;
    if (millions > 0) result += convertGroup(millions) + " million" + (millions > 1 ? "s" : "") + " ";
    const thousands = Math.floor(remaining / 1000);
    remaining = remaining % 1000;
    if (thousands > 0) {
      if (thousands === 1) result += "mille ";
      else result += convertGroup(thousands) + " mille ";
    }
    if (remaining > 0) result += convertGroup(remaining);
  }

  result = result.trim().replace(/\s+/g, ' ');
  result += integerPart > 1 ? " Dinars Algériens" : " Dinar Algérien";
  if (decimalPart > 0) result += " et " + convertGroup(decimalPart) + (decimalPart > 1 ? " Centimes" : " Centime");

  return result.charAt(0).toUpperCase() + result.slice(1);
};
