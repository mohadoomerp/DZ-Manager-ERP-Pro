

export enum ModuleType {
  DASHBOARD = 'DASHBOARD',
  OPERATIONS = 'OPERATIONS',
  SALES = 'SALES',
  RETAIL = 'RETAIL',
  CLIENTS = 'CLIENTS',
  CRM = 'CRM',
  SUPPLIERS = 'SUPPLIERS',
  EVENTS = 'EVENTS',
  INVENTORY = 'INVENTORY',
  PURCHASES = 'PURCHASES',
  FINANCE = 'FINANCE',
  HR = 'HR',
  ACCOUNTING = 'ACCOUNTING',
  USERS = 'USERS',
  SETTINGS = 'SETTINGS',
  LICENSE_GEN = 'LICENSE_GEN',
  TIME_CLOCK = 'TIME_CLOCK'
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'HR_MANAGER';
export type NetworkRole = 'HUB' | 'WORKSTATION' | 'STANDALONE';
export type LicenseType = 'STARTUP' | 'RETAIL' | 'SERVICE' | 'HR_FOCUS' | 'EVENTS' | 'BUSINESS' | 'CORPORATE';

export interface Traceable {
  createdBy?: string;
  createdById?: string;
  updatedAt?: number;
  updatedBy?: string;
  isDeleted?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  module: ModuleType;
  details: string;
}

export interface User extends Traceable {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  active: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userName: string;
  lastActive: string;
  deviceName?: string;
  isServer?: boolean; 
  ipAddress?: string;
  dbId: string;
  status?: 'online' | 'away' | 'offline';
}

export type LeadStatus = 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface LeadMilestone {
  id: string;
  label: string;
  completed: boolean;
}

export interface Lead extends Traceable {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  estimatedValue: number;
  source: string;
  createdAt: string;
  lastActivity: string;
  notes: string;
  milestones?: LeadMilestone[];
  eventId?: string;
}

export interface GeneratedLicense {
  id: string;
  key: string;
  owner: string;
  authorizedEmail: string; 
  date: string;
  databaseId: string;
  type: LicenseType;
  expiryDate: string;
  maxUsers?: number;
  modules?: ModuleType[];
}

export interface LicenseInfo {
  key: string;
  status: 'Active' | 'Expired' | 'Invalid';
  expiryDate: string;
  owner: string;
  databaseId: string;
  networkRole: NetworkRole;
  hubAddress: string;
  serverPort?: number;
  useManualConfig?: boolean;
  type?: LicenseType;
  maxUsers?: number;
  modules?: ModuleType[];
}

export type POSType = 'Retail' | 'Service';

export interface CompanySettings extends Traceable {
  id: string;
  name: string;
  legalForm: string;
  address: string;
  wilaya: string;
  commune: string;
  phone: string;
  email: string;
  rc: string;
  nif: string;
  ai: string;
  nis: string;
  capital: string;
  rib: string;
  logoUrl?: string;
  posType?: POSType;
  timeClockIp?: string;
  timeClockPort?: number;
  timeClockPassword?: string;
  employerCnasNumber?: string;
  payrollStartDay?: number;
  workingDaysCount?: number;
  hourlyBase?: number;
  workSchedule?: {
    startTime: string;
    endTime: string;
    weekendDays: number[];
  };
  attendanceRules?: {
    latenessToleranceMinutes: number;
    overtimeRateWeek: number;
    overtimeRateWeekend: number;
    overtimeRateHoliday: number;
  };
  customRubriques?: SalaryRubrique[];
  googleClientId?: string;
}

export interface Partner extends Traceable {
  id: string;
  name: string;
  type: 'Client' | 'Supplier';
  nif: string;
  ai: string;
  rc: string;
  nis: string;
  address: string;
  phone: string;
  email: string;
  balance: number;
}

export interface Product extends Traceable {
  id: string;
  code: string;
  name: string;
  priceRetail: number;
  priceWholesale?: number;
  rentalPriceDay: number;
  stock: number;
  minStock: number;
  unit: string;
  category: string;
  isRental: boolean;
  isSale: boolean;
  isPhysical: boolean;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Broken';
  expiryDate?: string;
  lotNumber?: string;
}

export interface AttendanceRecord extends Traceable {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Late' | 'Mission' | 'Holiday';
  entryTime?: string;
  exitTime?: string;
  isValidated?: boolean;
}

export interface TimeClockLog extends Traceable {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: number;
  type: 'CheckIn' | 'CheckOut' | 'BreakOut' | 'BreakIn';
  method: 'Face' | 'Fingerprint' | 'Pin' | 'Card';
  deviceId: string;
  photoUrl?: string;
}

export type DocType = 'Contract' | 'ID' | 'Medical' | 'Diploma' | 'Disciplinary' | 'Certificate' | 'Other';

export interface EmployeeDocument {
  id: string;
  name: string;
  type: DocType;
  date: string;
  content?: string;
  isGenerated?: boolean;
}

export interface Employee extends Traceable {
  id: string;
  name: string;
  gender: 'M' | 'F';
  dateOfBirth: string;
  placeOfBirth: string;
  bloodGroup: string;
  address: string;
  position: string;
  contractType: 'CDI' | 'CDD' | 'CTA' | 'Autre';
  contractEndDate?: string;
  email: string;
  phone: string;
  bankRIB: string;
  baseSalary: number;
  presenceBonus: number;
  rubriques: SalaryRubrique[];
  cnasNumber: string;
  joinDate: string;
  familyStatus: 'Single' | 'Married' | 'Divorced';
  childrenCount: number;
  loans: EmployeeLoan[];
  isSociallyInsured: boolean; 
  isTaxable: boolean;
  status: 'Active' | 'Archived';
  exitDate?: string;
  exitReason?: 'Resignation' | 'Dismissal' | 'EndOfContract' | 'Retirement';
  documents: EmployeeDocument[];
  pinCode?: string; 
}

export interface Candidate extends Traceable {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  status: 'New' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected';
  applicationDate: string;
  notes: string;
  resumeUrl?: string;
}

export interface SalaryRubrique {
  id: string;
  label: string;
  value: number;
  isCotisable: boolean;
  isImposable: boolean;
  type: 'fixed' | 'variable';
}

export interface EmployeeLoan {
  id: string;
  amount: number;
  date: string;
  reason: string;
  monthlyPayment: number;
  status: 'Pending' | 'Approved' | 'Repaid';
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
  discount?: number;
}

export interface Invoice extends Traceable {
  id: string;
  number: string;
  date: string;
  partnerId: string;
  partnerName: string;
  items: InvoiceItem[];
  totalHT: number;
  totalTVA: number;
  timbreFiscal: number;
  totalTTC: number;
  globalDiscount?: number;
  status: 'Draft' | 'Validated' | 'Paid' | 'Partially Paid' | 'Cancelled';
  paymentMethod: 'Cash' | 'Check' | 'Transfer';
  eventId?: string; 
  excludeTva?: boolean;
  isTaxExempt?: boolean;
  paidAmount?: number;
  type: 'Invoice' | 'Proforma' | 'Quote' | 'Delivery' | 'Order';
}

export interface Purchase extends Traceable {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  amountHT: number;
  amountTVA: number;
  amountTTC: number;
  status: 'Draft' | 'Validated' | 'Paid' | 'Received';
  type: 'Order' | 'PurchaseInvoice' | 'Return';
}

export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
}

export interface Transaction extends Traceable {
  id: string;
  date: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  referenceId?: string;
  account?: string;
}

export interface DailyClosing extends Traceable {
  id: string;
  date: string;
  closedAt: string;
  closedBy: string;
  totalIncome: number;
  totalExpense: number;
  cashBalance: number;
  bankBalance: number;
  realCashCount?: number;
  difference?: number;
  note?: string;
}

export type StandType = 'amenage' | 'nu' | 'exterieur' | 'chapiteau';
export type UtilityType = 'porte' | 'sanitaire' | 'scene' | 'info' | 'secours' | 'extincteur' | 'conference' | 'restauration' | 'vip' | 'technique' | 'stockage' | 'electricite' | 'wifi' | 'accueil';

export interface UtilitySpace {
  id: string;
  type: UtilityType;
  label: string;
  pavilionId: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation?: number;
  color?: string;
}

export interface Stand {
  id: string;
  number: string; 
  area: number; 
  pricePerSqm: number;
  participantId?: string; 
  type?: StandType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  width?: number;
  depth?: number;
  customLogoUrl?: string;
  pavilionId?: string;
  shape?: 'rect' | 'L';
  cutoutWidth?: number;
  cutoutDepth?: number;
  cutoutPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: string;
  rotation?: number;
}

export interface EventParticipant {
  clientId: string;
  clientName: string;
  joinedAt: string;
}

export interface EventExpense {
  id: string;
  label: string;
  amount: number;
  category: 'Logistique' | 'Marketing' | 'Restauration' | 'Personnel' | 'Autre';
  date: string;
  paidBy: string;
}

export interface Pavilion {
  id: string;
  name: string;
  type: 'Hall' | 'Marquee' | 'Outdoor'; 
  width: number;
  depth: number;
  x?: number;
  y?: number;
}

export interface Visitor {
  id: string;
  name: string;
  company: string;
  category: string;
  email: string;
  phone: string;
  isCheckedIn: boolean;
  isEmailSent: boolean;
  emailSentAt?: number;
  updatedAt: number;
}

export interface ExhibitorTeamMember {
  id: string;
  exhibitorId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  badgeNumber: string;
  isCheckedIn: boolean;
  updatedAt: number;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export type FormFieldType = 'text' | 'number' | 'email' | 'tel' | 'select' | 'checkbox' | 'textarea';

export interface CategoryFormConfig {
  categoryId: string;
  isEnabled: boolean;
  fields: FormField[];
  welcomeMessage?: string;
}

export interface BadgeFieldConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  isBold: boolean;
  isVisible: boolean;
}

export interface BadgeTemplate {
  widthMm: number;
  heightMm: number;
  backgroundImage?: string;
  fields: {
    name: BadgeFieldConfig;
    company: BadgeFieldConfig;
    category: BadgeFieldConfig;
    qrCode: { x: number; y: number; size: number; isVisible: boolean };
  };
}

export interface EventBooking extends Traceable {
  id: string;
  title: string;
  theme?: string;
  startDate: string;
  endDate: string;
  participants: EventParticipant[];
  items: { productId: string; name: string; quantity: number; participantId: string }[];
  stands: Stand[];
  visitors: Visitor[];
  exhibitorTeams: ExhibitorTeamMember[];
  totalAmount: number;
  status: 'Confirmed' | 'In Progress' | 'Cancelled' | 'Completed';
  logoUrl?: string; 
  assignedAgents?: string[];
  registrationFee?: number;
  planWidth?: number;
  planDepth?: number;
  pavilions?: Pavilion[]; 
  expenses?: EventExpense[];
  utilitySpaces?: UtilitySpace[];
  badgeTemplate?: BadgeTemplate;
  formConfigs?: CategoryFormConfig[];
  googleSheetId?: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: number;
  user?: string;
}
