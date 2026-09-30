import React, { useState } from 'react';
import { Invoice, Payment, Customer } from '../types';
import { 
  FileSpreadsheet, Download, TrendingUp, DollarSign, 
  Calendar, PieChart, Users, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';

interface ReportsViewProps {
  invoices: Invoice[];
  payments: Payment[];
  customers: Customer[];
  currency: string;
}

export default function ReportsView({ invoices, payments, customers, currency }: ReportsViewProps) {
  const [period, setPeriod] = useState<'30D' | '90D' | 'ALL'>('ALL');

  // Stats calculation
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
  const totalRemaining = invoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  const overdueInvoices = invoices.filter(
    (inv) => inv.remainingAmount > 0 && inv.status !== 'CANCELLED' && calculateDaysOverdue(inv.dueDate) > 0
  );
  const totalOverdue = overdueInvoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  // DSO calculation
  const dso = totalInvoiced > 0 ? Math.round((totalRemaining / totalInvoiced) * 90) : 0;

  // Risky clients
  const clientOverdueMap = new Map<string, { customer: Customer; overdueAmount: number; invoiceCount: number }>();
  overdueInvoices.forEach((inv) => {
    const cust = customers.find((c) => c.id === inv.customerId);
    if (!cust) return;
    const existing = clientOverdueMap.get(cust.id) || { customer: cust, overdueAmount: 0, invoiceCount: 0 };
    existing.overdueAmount += inv.remainingAmount;
    existing.invoiceCount += 1;
    clientOverdueMap.set(cust.id, existing);
  });

  const riskyClients = Array.from(clientOverdueMap.values()).sort((a, b) => b.overdueAmount - a.overdueAmount);

  // Export to CSV
  function exportCSV() {
    const headers = ['Numero_Facture', 'Client', 'Montant_Total', 'Encaisse', 'Solde_Restant', 'Devise', 'Echeance', 'Statut', 'Jours_Retard'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      `"${inv.customerName || ''}"`,
      inv.amount,
      inv.paidAmount,
      inv.remainingAmount,
      inv.currency,
      inv.dueDate,
      inv.status,
      calculateDaysOverdue(inv.dueDate),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rapport_PayRelance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Rapports Financiers & Recouvrement</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analyse des délais moyens de paiement (DSO), créances échues et clients à risque.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exporter en CSV (Excel)</span>
        </button>
      </div>

      {/* KPI Metric Cards (1 col mobile, 2 col tablet, 4 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Facturé</div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 truncate">{formatCurrency(totalInvoiced, currency)}</div>
          <div className="text-[11px] text-slate-500">{invoices.length} factures analysées</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-emerald-600 font-semibold uppercase">Total Encaissé</div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 truncate">{formatCurrency(totalCollected, currency)}</div>
          <div className="text-[11px] text-emerald-700">
            {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% de taux de recouvrement
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-rose-600 font-semibold uppercase">Créances en Retard</div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 truncate">{formatCurrency(totalOverdue, currency)}</div>
          <div className="text-[11px] text-rose-700">{overdueInvoices.length} factures échues</div>
        </div>

        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-indigo-600 font-semibold uppercase">Délai Moyen (DSO)</div>
          <div className="text-lg sm:text-xl font-bold text-indigo-600">{dso} jours</div>
          <div className="text-[11px] text-slate-500">Délai moyen de règlement client</div>
        </div>
      </div>

      {/* Risky Clients Report */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              Clients à risque de retard persistant ({riskyClients.length})
            </h2>
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400">Classés par montant échu</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {riskyClients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Aucun client présentant de retard critique identifié.
            </div>
          ) : (
            riskyClients.map((item) => (
              <div key={item.customer.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-bold text-slate-900">{item.customer.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {item.customer.email} • {item.invoiceCount} facture(s) en souffrance
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                  <div className="font-bold text-rose-600 text-sm">
                    {formatCurrency(item.overdueAmount, currency)}
                  </div>
                  <span className="text-[10px] text-slate-400">À relancer activement</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
