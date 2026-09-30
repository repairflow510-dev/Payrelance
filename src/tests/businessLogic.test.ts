import { describe, it, expect } from 'vitest';
import { calculateDaysOverdue, formatCurrency, renderTemplate } from '../src/lib/constants';
import { PLAN_LIMITS } from '../src/lib/constants';

describe('PayRelance Business Logic Tests', () => {
  it('correctly calculates overdue days', () => {
    const today = new Date();
    const tenDaysAgo = new Date(today.getTime() - 10 * 86400000).toISOString().split('T')[0];
    const fiveDaysInFuture = new Date(today.getTime() + 5 * 86400000).toISOString().split('T')[0];

    expect(calculateDaysOverdue(tenDaysAgo)).toBe(10);
    expect(calculateDaysOverdue(fiveDaysInFuture)).toBe(-5);
  });

  it('correctly substitutes template variables', () => {
    const template = 'Bonjour {{client_name}}, votre facture {{invoice_number}} de {{remaining_amount}} {{currency}} est due le {{due_date}}.';
    const result = renderTemplate(template, {
      client_name: 'SARL BATIMENT',
      invoice_number: 'FAC-2026-001',
      remaining_amount: '500 000',
      currency: 'FCFA',
      due_date: '2026-10-15',
    });

    expect(result).toBe('Bonjour SARL BATIMENT, votre facture FAC-2026-001 de 500 000 FCFA est due le 2026-10-15.');
  });

  it('formats multiple currencies gracefully', () => {
    expect(formatCurrency(1500000, 'FCFA')).toContain('1 500 000');
    expect(formatCurrency(2500, 'EUR')).toContain('2 500 €');
  });

  it('enforces tier limits on Starter and Pro plans', () => {
    expect(PLAN_LIMITS.FREE.maxInvoices).toBe(20);
    expect(PLAN_LIMITS.STARTER.whatsappEnabled).toBe(true);
    expect(PLAN_LIMITS.PRO.maxInvoices).toBe(1000);
    expect(PLAN_LIMITS.BUSINESS.apiEnabled).toBe(true);
  });
});
