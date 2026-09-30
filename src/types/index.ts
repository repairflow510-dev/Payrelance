export type UserRole = 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'SALES' | 'VIEWER';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DISPUTED';

export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'OTHER';

export type Channel = 'EMAIL' | 'WHATSAPP' | 'INTERNAL_NOTE';

export type PromiseStatus = 'PENDING' | 'FULFILLED' | 'BROKEN' | 'CANCELLED';

export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface PlanLimits {
  maxInvoices: number;
  maxUsers: number;
  maxCustomers: number;
  whatsappEnabled: boolean;
  reportsEnabled: boolean;
  apiEnabled: boolean;
  aiEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  currency: string; // e.g. 'FCFA', 'EUR', 'USD'
  managerName: string;
  email?: string;
  phone?: string;
  address?: string;
  plan: PlanType;
  createdAt: string;
  settings: {
    sendDailyDigest: boolean;
    autoRemindersEnabled: boolean;
    replyToEmail?: string;
    whatsappPhone?: string;
  };
}

export interface Membership {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  customerReference?: string;
  notes?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string;
  customerName?: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  status: InvoiceStatus;
  paidAmount: number;
  remainingAmount: number;
  publicToken: string;
  attachmentUrl?: string;
  disputeReason?: string;
  disputeNotes?: string;
  sequenceId?: string;
  currentStepIndex?: number;
  lastReminderSentAt?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  companyId: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: PaymentMethod;
  reference: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentPromise {
  id: string;
  companyId: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  promisedDate: string;
  status: PromiseStatus;
  notes?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  companyId: string;
  invoiceId: string;
  customerId: string;
  reason: 'INCORRECT_AMOUNT' | 'SERVICE_NOT_DELIVERED' | 'ALREADY_PAID' | 'ADMINISTRATIVE' | 'OTHER';
  description: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export interface ReminderStep {
  id: string;
  dayOffset: number; // e.g. -7 (J-7), 0 (J0), 3 (J+3), 7 (J+7), 15 (J+15), 30 (J+30)
  channel: Channel;
  templateId: string;
  actionTitle: string;
}

export interface ReminderSequence {
  id: string;
  companyId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  steps: ReminderStep[];
  createdAt: string;
}

export interface MessageTemplate {
  id: string;
  companyId: string;
  name: string;
  channel: Channel;
  subject: string;
  content: string;
  isDefault?: boolean;
}

export interface MessageLog {
  id: string;
  companyId: string;
  invoiceId: string;
  customerId: string;
  channel: Channel;
  recipient: string;
  subject: string;
  content: string;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'OPENED' | 'FAILED';
  error?: string;
  sentAt: string;
  stepOffset?: number;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  type: 'REMINDER' | 'PAYMENT' | 'PROMISE' | 'DISPUTE' | 'ALERT';
  read: boolean;
  link?: string;
  createdAt: string;
}
