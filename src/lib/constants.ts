import { PlanType, PlanLimits } from '../types';

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: {
    maxInvoices: 20,
    maxUsers: 1,
    maxCustomers: 15,
    whatsappEnabled: false,
    reportsEnabled: false,
    apiEnabled: false,
    aiEnabled: false,
  },
  STARTER: {
    maxInvoices: 200,
    maxUsers: 3,
    maxCustomers: 150,
    whatsappEnabled: true,
    reportsEnabled: true,
    apiEnabled: false,
    aiEnabled: false,
  },
  PRO: {
    maxInvoices: 1000,
    maxUsers: 10,
    maxCustomers: 800,
    whatsappEnabled: true,
    reportsEnabled: true,
    apiEnabled: true,
    aiEnabled: true,
  },
  BUSINESS: {
    maxInvoices: 999999,
    maxUsers: 999,
    maxCustomers: 999999,
    whatsappEnabled: true,
    reportsEnabled: true,
    apiEnabled: true,
    aiEnabled: true,
  },
};

export const PLAN_PRICING: Record<PlanType, { name: string; priceEur: number; priceFcfa: number; desc: string }> = {
  FREE: {
    name: 'Gratuit',
    priceEur: 0,
    priceFcfa: 0,
    desc: 'Pour démarrer et tester PayRelance sur vos premiers impayés.',
  },
  STARTER: {
    name: 'Starter',
    priceEur: 19,
    priceFcfa: 12500,
    desc: 'Idéal pour TPE et indépendants avec relances automatisées.',
  },
  PRO: {
    name: 'Professionnel',
    priceEur: 49,
    priceFcfa: 32000,
    desc: 'Pour PME structurées voulant automatiser à grande échelle.',
  },
  BUSINESS: {
    name: 'Business',
    priceEur: 129,
    priceFcfa: 85000,
    desc: 'Accompagnement, volume illimité, API et intégrations dédiées.',
  },
};

export function formatCurrency(amount: number, currency: string = 'FCFA'): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('fr-FR').format(rounded);
  if (currency === 'EUR' || currency === '€') {
    return `${formatted} €`;
  }
  if (currency === 'USD' || currency === '$') {
    return `$${formatted}`;
  }
  return `${formatted} ${currency}`;
}

export function calculateDaysOverdue(dueDate: string): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function renderTemplate(
  templateContent: string,
  variables: {
    client_name?: string;
    company_name?: string;
    invoice_number?: string;
    amount?: string | number;
    currency?: string;
    due_date?: string;
    days_overdue?: string | number;
    remaining_amount?: string | number;
    payment_link?: string;
    account_manager?: string;
  }
): string {
  let result = templateContent;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  }
  return result;
}
