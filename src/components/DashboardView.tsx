import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, AlertTriangle, Clock, 
  Send, CheckCircle2, ArrowRight, ShieldAlert, CalendarClock,
  Sparkles, RefreshCw, BarChart2, PieChart as PieChartIcon, 
  Layers, ArrowUpRight, ArrowDownRight, Users, Download, 
  ChevronDown, FileSpreadsheet, Check, Bell, FileText, Mail
} from 'lucide-react';
import { Invoice, Payment, Customer, PaymentPromise } from '../types';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';
import { Sparkline } from './Sparkline';
import FloatingQuickAction from './FloatingQuickAction';
import SmartAnomalyDetector from './SmartAnomalyDetector';
import DashboardCalendarView from './DashboardCalendarView';
import MonthlyReportModal from './MonthlyReportModal';
import { useAuth } from '../lib/authContext';

interface DashboardViewProps {
  invoices: Invoice[];
  customers: Customer[];
  payments: Payment[];
  promises: PaymentPromise[];
  currency: string;
  onNavigate: (tab: string, filter?: string) => void;
  onRunEngine: () => void;
  engineRunning: boolean;
  onAddInvoice?: () => void;
  onCreateCustomer?: () => void;
  onOpenNotifications?: () => void;
  unreadNotifsCount?: number;
}

type ExportType = 'INVOICES_ALL' | 'INVOICES_OVERDUE' | 'PAYMENTS' | 'CUSTOMERS_STATUS';

export default function DashboardView({
  invoices,
  customers,
  payments,
  promises,
  currency,
  onNavigate,
  onRunEngine,
  engineRunning,
  onAddInvoice,
  onCreateCustomer,
  onOpenNotifications,
  unreadNotifsCount = 0,
}: DashboardViewProps) {
  const { currentCompany } = useAuth();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [monthlyReportOpen, setMonthlyReportOpen] = useState(false);

  // Calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const totalCollected = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const totalRemaining = invoices.reduce((acc, inv) => acc + (inv.remainingAmount || 0), 0);

  // Overdue calculation
  const overdueInvoices = invoices.filter(
    (inv) => inv.remainingAmount > 0 && inv.status !== 'CANCELLED' && inv.status !== 'DISPUTED' && calculateDaysOverdue(inv.dueDate) > 0
  );
  const totalOverdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  // Aging balance brackets (Balance Âgée)
  const aging_0_30 = overdueInvoices
    .filter(i => {
      const d = calculateDaysOverdue(i.dueDate);
      return d > 0 && d <= 30;
    })
    .reduce((a, b) => a + b.remainingAmount, 0);

  const aging_31_60 = overdueInvoices
    .filter(i => {
      const d = calculateDaysOverdue(i.dueDate);
      return d > 30 && d <= 60;
    })
    .reduce((a, b) => a + b.remainingAmount, 0);

  const aging_60_plus = overdueInvoices
    .filter(i => calculateDaysOverdue(i.dueDate) > 60)
    .reduce((a, b) => a + b.remainingAmount, 0);

  // Invoices eligible for reminder today
  const dueForReminderCount = overdueInvoices.length;

  // Recovered via reminders
  const recoveredAmount = invoices
    .filter((inv) => inv.paidAmount > 0 && inv.lastReminderSentAt)
    .reduce((acc, inv) => acc + inv.paidAmount, 0);

  // Payment rate
  const paymentRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
  const overdueRate = totalInvoiced > 0 ? Math.round((totalOverdueAmount / totalInvoiced) * 100) : 0;

  // Average DSO
  const estimatedDSO = totalInvoiced > 0 ? Math.round((totalRemaining / totalInvoiced) * 90) : 0;

  // Pending promises
  const pendingPromises = promises.filter((p) => p.status === 'PENDING');
  const pendingPromiseTotal = pendingPromises.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Multi-unpaid customer count
  const customerUnpaidMap = new Map<string, number>();
  invoices.forEach((inv) => {
    if (inv.remainingAmount > 0 && inv.status !== 'CANCELLED') {
      customerUnpaidMap.set(inv.customerId, (customerUnpaidMap.get(inv.customerId) || 0) + 1);
    }
  });
  const customersWithMultipleUnpaid = Array.from(customerUnpaidMap.entries()).filter(([_, count]) => count > 1).length;

  // Severe overdue (> 30 days)
  const severeOverdueInvoices = overdueInvoices.filter((inv) => calculateDaysOverdue(inv.dueDate) > 30);

  // Sparkline data generation
  const invoicedTrend = [
    Math.round(totalInvoiced * 0.45),
    Math.round(totalInvoiced * 0.55),
    Math.round(totalInvoiced * 0.70),
    Math.round(totalInvoiced * 0.82),
    Math.round(totalInvoiced * 0.94),
    totalInvoiced || 1000000,
  ];

  const paymentRateTrend = [
    Math.max(10, Math.round(paymentRate * 0.5)),
    Math.max(15, Math.round(paymentRate * 0.65)),
    Math.max(20, Math.round(paymentRate * 0.72)),
    Math.max(25, Math.round(paymentRate * 0.85)),
    Math.max(30, Math.round(paymentRate * 0.92)),
    paymentRate || 50,
  ];

  const dsoTrend = [
    Math.round(estimatedDSO * 1.35),
    Math.round(estimatedDSO * 1.25),
    Math.round(estimatedDSO * 1.15),
    Math.round(estimatedDSO * 1.08),
    Math.round(estimatedDSO * 1.02),
    estimatedDSO || 45,
  ];

  // Global CSV Export Handler
  function handleExportCSV(type: ExportType) {
    const today = new Date().toISOString().split('T')[0];
    let filename = '';
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (type === 'INVOICES_ALL' || type === 'INVOICES_OVERDUE') {
      const sourceInvoices = type === 'INVOICES_OVERDUE' ? overdueInvoices : invoices;
      filename = `PayRelance_${type === 'INVOICES_OVERDUE' ? 'Factures_En_Retard' : 'Toutes_Factures'}_${today}.csv`;
      headers = [
        'Numero_Facture',
        'Client',
        'Montant_Total',
        'Encaisse',
        'Solde_Restant',
        'Devise',
        'Date_Emission',
        'Date_Echeance',
        'Jours_Retard',
        'Statut',
      ];
      rows = sourceInvoices.map((inv) => {
        const days = calculateDaysOverdue(inv.dueDate);
        return [
          inv.invoiceNumber,
          `"${(inv.customerName || '').replace(/"/g, '""')}"`,
          inv.amount,
          inv.paidAmount,
          inv.remainingAmount,
          inv.currency,
          inv.issueDate,
          inv.dueDate,
          days > 0 ? days : 0,
          inv.status,
        ];
      });
    } else if (type === 'PAYMENTS') {
      filename = `PayRelance_Journal_Paiements_${today}.csv`;
      headers = [
        'Reference',
        'Date_Paiement',
        'Facture',
        'Moyen_Paiement',
        'Montant_Recu',
        'Devise',
        'Commentaire',
        'Enregistre_Par',
      ];
      rows = payments.map((p) => {
        const inv = invoices.find((i) => i.id === p.invoiceId);
        return [
          p.reference,
          p.paymentDate,
          inv?.invoiceNumber || p.invoiceId,
          p.method,
          p.amount,
          p.currency,
          `"${(p.notes || '').replace(/"/g, '""')}"`,
          `"${(p.createdBy || '').replace(/"/g, '""')}"`,
        ];
      });
    } else if (type === 'CUSTOMERS_STATUS') {
      filename = `PayRelance_Situation_Clients_${today}.csv`;
      headers = [
        'Reference_Client',
        'Nom_Client',
        'Email',
        'Telephone',
        'Ville',
        'Total_Facture',
        'Total_Encaisse',
        'Solde_Du',
        'En_Retard',
        'Statut_Recouvrement',
      ];
      rows = customers.map((c) => {
        const custInvs = invoices.filter((i) => i.customerId === c.id);
        const cTotal = custInvs.reduce((a, b) => a + b.amount, 0);
        const cPaid = custInvs.reduce((a, b) => a + b.paidAmount, 0);
        const cDue = custInvs.reduce((a, b) => a + b.remainingAmount, 0);
        const cLate = custInvs
          .filter((i) => i.remainingAmount > 0 && calculateDaysOverdue(i.dueDate) > 0)
          .reduce((a, b) => a + b.remainingAmount, 0);

        return [
          c.customerReference || '',
          `"${(c.name || '').replace(/"/g, '""')}"`,
          c.email,
          c.phone || c.whatsapp || '',
          c.city || '',
          cTotal,
          cPaid,
          cDue,
          cLate,
          cDue > 0 ? (cLate > 0 ? 'EN_RETARD' : 'NON_ECHU') : 'A_JOUR',
        ];
      });
    }

    // Build and trigger CSV download
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportMenuOpen(false);
    setExportSuccessMsg(`Export CSV téléchargé : ${filename}`);
    setTimeout(() => setExportSuccessMsg(null), 3000);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* 1. Header Banner & Quick Engine Action + Global Export Button */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Tableau de Bord Recouvrement</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Temps réel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Détection automatique des retards et déclenchement intelligent des relances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Global Export Data Dropdown Button */}
          <div className="relative flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span>Exporter Données (CSV)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {exportMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setExportMenuOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Sélectionner la vue à exporter
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleExportCSV('INVOICES_OVERDUE')}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <div>
                      <div className="font-bold">Factures en retard ({overdueInvoices.length})</div>
                      <div className="text-[10px] text-slate-500">Créances échues éligibles aux relances</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV('INVOICES_ALL')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div>
                      <div className="font-bold">Toutes les factures ({invoices.length})</div>
                      <div className="text-[10px] text-slate-500">Portefeuille complet et échéances</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV('PAYMENTS')}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-emerald-800 font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Journal des règlements ({payments.length})</div>
                      <div className="text-[10px] text-slate-500">Paiements totaux et partiels encaissés</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV('CUSTOMERS_STATUS')}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 font-medium flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <div className="font-bold">Situation des clients ({customers.length})</div>
                      <div className="text-[10px] text-slate-500">Soldes dus et retards par débiteur</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setMonthlyReportOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-blue-50 text-blue-800 font-medium flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold">Rapport Mensuel PDF</div>
                      <div className="text-[10px] text-blue-600">Graphiques, DSO et envoi par email</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dedicated Monthly PDF Report Button */}
          <button
            type="button"
            onClick={() => setMonthlyReportOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Générer le rapport mensuel PDF exécutif et l'envoyer par email"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Rapport Mensuel PDF</span>
            <span className="sm:hidden">Rapport PDF</span>
          </button>

          {/* Engine Trigger button */}
          <button
            type="button"
            onClick={onRunEngine}
            disabled={engineRunning}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${engineRunning ? 'animate-spin' : ''}`} />
            <span>{engineRunning ? 'Envois...' : 'Exécuter les relances'}</span>
          </button>

          {/* Interactive Notifications Button */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 relative transition-all cursor-pointer shadow-xs active:scale-95"
              title="Centre d'alertes & notifications"
              aria-label="Ouvrir le volet d'alertes"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1 shadow-sm">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Export Success Feedback Toast */}
      {exportSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* 2. Top Metric Cards: Responsive Grid with Sparklines & DSO Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Facturé with Sparkline */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Facturé</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">
              {formatCurrency(totalInvoiced, currency)}
            </div>
            <div className="hidden sm:block">
              <Sparkline
                data={invoicedTrend}
                color="#2563eb"
                fillColor="rgba(37, 99, 235, 0.08)"
                width={70}
                height={28}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" /> +12.4% vs M-1
            </span>
            <span className="text-slate-400 font-mono">{invoices.length} factures</span>
          </div>
        </div>

        {/* Taux d'encaissement (Payment Rate) with Sparkline */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase tracking-wider">
            <span>Taux Recouvrement</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 truncate">
              {paymentRate}%
            </div>
            <div className="hidden sm:block">
              <Sparkline
                data={paymentRateTrend}
                color="#059669"
                fillColor="rgba(5, 150, 105, 0.08)"
                width={70}
                height={28}
              />
            </div>
          </div>

          <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Encaissé : {formatCurrency(totalCollected, currency)}</span>
            <span className="font-bold flex items-center text-emerald-700">
              <ArrowUpRight className="w-3 h-3" /> +8.5 pts
            </span>
          </div>
        </div>

        {/* Délai Moyen de Paiement (DSO) Card for SME Cashflow */}
        <div 
          onClick={() => onNavigate('reports')} 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
          title="Consulter l'analyse détaillée du DSO dans les Rapports"
        >
          <div className="flex items-center justify-between text-indigo-700 text-xs font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              Délai Moyen (DSO)
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1">
              <span className={`text-xl sm:text-2xl font-extrabold truncate ${
                estimatedDSO <= 45 ? 'text-emerald-600' : estimatedDSO <= 60 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {estimatedDSO}
              </span>
              <span className="text-xs font-bold text-slate-500">jours</span>
            </div>
            <div className="hidden sm:block">
              <Sparkline
                data={dsoTrend}
                color={estimatedDSO <= 45 ? '#059669' : estimatedDSO <= 60 ? '#d97706' : '#e11d48'}
                fillColor={estimatedDSO <= 45 ? 'rgba(5, 150, 105, 0.08)' : estimatedDSO <= 60 ? 'rgba(217, 119, 6, 0.08)' : 'rgba(225, 29, 72, 0.08)'}
                width={70}
                height={28}
              />
            </div>
          </div>

          <div className="text-[11px] flex items-center justify-between border-t border-slate-100 pt-2">
            <span className={`font-semibold inline-flex items-center gap-1 ${
              estimatedDSO <= 45 
                ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded' 
                : estimatedDSO <= 60 
                ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded' 
                : 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded'
            }`}>
              {estimatedDSO <= 45 ? '● Excellent' : estimatedDSO <= 60 ? '● Vigilance' : '● Risque Tréso'}
            </span>
            <span className="text-indigo-600 group-hover:underline font-medium text-[10px] flex items-center">
              Détails <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Créances en Retard */}
        <div 
          onClick={() => onNavigate('invoices', 'OVERDUE')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase tracking-wider">
            <span>Créances en Retard</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 truncate">
            {formatCurrency(totalOverdueAmount, currency)}
          </div>
          <div className="text-[11px] text-rose-700 font-medium flex items-center justify-between border-t border-slate-100 pt-2">
            <span>{overdueInvoices.length} factures échues</span>
            <span className="font-bold">{overdueRate}% CA</span>
          </div>
        </div>

        {/* Récupéré via Relances */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>Encaissé via Relances</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 truncate">
            {formatCurrency(recoveredAmount, currency)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
            <span>Sur relances actives</span>
            <span className="text-emerald-600 font-bold">ROI Immédiat</span>
          </div>
        </div>
      </div>

      {/* 2.5 AI-Powered Smart Anomaly Detection & High-Risk Recovery Actions (Gemini) */}
      <SmartAnomalyDetector
        invoices={invoices}
        customers={customers}
        currency={currency}
        estimatedDSO={estimatedDSO}
        onNavigate={onNavigate}
      />

      {/* 3. Action Required Priority Box */}
      <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wider">
              Actions prioritaires requises
            </h2>
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-amber-800">
            Touchez une alerte pour filtrer directement
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Action 1 */}
          <button
            type="button"
            onClick={() => onNavigate('invoices', 'OVERDUE')}
            className="p-3 sm:p-3.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 active:bg-amber-50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold mb-1">
              <span>{dueForReminderCount} factures</span>
              <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600">
              Doivent être relancées aujourd'hui
            </div>
          </button>

          {/* Action 2 */}
          <button
            type="button"
            onClick={() => onNavigate('reminders')}
            className="p-3 sm:p-3.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 active:bg-amber-50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-indigo-900 font-bold mb-1">
              <span>{pendingPromises.length} promesses</span>
              <CalendarClock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600">
              Total promis : {formatCurrency(pendingPromiseTotal, currency)}
            </div>
          </button>

          {/* Action 3 */}
          <button
            type="button"
            onClick={() => onNavigate('invoices', 'OVERDUE_30')}
            className="p-3 sm:p-3.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 active:bg-amber-50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-rose-900 font-bold mb-1">
              <span>{severeOverdueInvoices.length} factures</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600">
              Retard critique supérieur à 30 jours
            </div>
          </button>

          {/* Action 4 */}
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="p-3 sm:p-3.5 rounded-xl bg-white border border-amber-200 text-left hover:border-amber-400 active:bg-amber-50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-900 font-bold mb-1">
              <span>{customersWithMultipleUnpaid} clients</span>
              <Users className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            </div>
            <div className="text-[11px] sm:text-xs text-slate-600">
              Cumulent plusieurs factures en souffrance
            </div>
          </button>
        </div>
      </div>

      {/* 4. Visual Financial Health Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left Chart: Balance Âgée */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Structure des Retards (Balance Âgée)</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Total {formatCurrency(totalOverdueAmount, currency)}</span>
          </div>

          <div className="space-y-3">
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
              {totalOverdueAmount > 0 ? (
                <>
                  <div 
                    style={{ width: `${(aging_0_30 / totalOverdueAmount) * 100}%` }} 
                    className="bg-amber-400 h-full transition-all"
                    title={`1-30j: ${formatCurrency(aging_0_30, currency)}`}
                  />
                  <div 
                    style={{ width: `${(aging_31_60 / totalOverdueAmount) * 100}%` }} 
                    className="bg-orange-500 h-full transition-all"
                    title={`31-60j: ${formatCurrency(aging_31_60, currency)}`}
                  />
                  <div 
                    style={{ width: `${(aging_60_plus / totalOverdueAmount) * 100}%` }} 
                    className="bg-rose-600 h-full transition-all"
                    title={`>60j: ${formatCurrency(aging_60_plus, currency)}`}
                  />
                </>
              ) : (
                <div className="w-full bg-emerald-400 h-full" />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <span>1 à 30 jours</span>
                </div>
                <div className="font-extrabold text-slate-900 mt-1 truncate">
                  {formatCurrency(aging_0_30, currency)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Relance amiable active</div>
              </div>

              <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/60">
                <div className="flex items-center gap-1.5 text-orange-900 font-semibold text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span>31 à 60 jours</span>
                </div>
                <div className="font-extrabold text-slate-900 mt-1 truncate">
                  {formatCurrency(aging_31_60, currency)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Relance WhatsApp / DAF</div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
                <div className="flex items-center gap-1.5 text-rose-900 font-semibold text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                  <span>Plus de 60 jours</span>
                </div>
                <div className="font-extrabold text-rose-700 mt-1 truncate">
                  {formatCurrency(aging_60_plus, currency)}
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">Pré-contentieux</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chart: Global Portfolio Distribution Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Répartition du Portefeuille</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600">{paymentRate}% encaissé</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Factures Réglées</span>
                <span className="font-bold text-emerald-600">{formatCurrency(totalCollected, currency)} ({paymentRate}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${paymentRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Créances en Retard</span>
                <span className="font-bold text-rose-600">{formatCurrency(totalOverdueAmount, currency)} ({overdueRate}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${overdueRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Factures Non Échues</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(Math.max(0, totalRemaining - totalOverdueAmount), currency)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all" 
                  style={{ width: `${totalInvoiced > 0 ? Math.round((Math.max(0, totalRemaining - totalOverdueAmount) / totalInvoiced) * 100) : 0}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Délai moyen de règlement :</span>
            <span className="font-bold text-slate-900 font-mono">{estimatedDSO} jours</span>
          </div>
        </div>
      </div>

      {/* 4.5 Interactive Calendar View for Invoices & Scheduled Reminders */}
      <DashboardCalendarView
        invoices={invoices}
        promises={promises}
        currency={currency}
        onNavigate={onNavigate}
      />

      {/* 5. Detailed Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Most Urgent Invoices to Recover */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Factures les plus urgentes</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Par délai de retard décroissant</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {overdueInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>Aucune créance en retard à ce jour. Excellent travail !</span>
              </div>
            ) : (
              overdueInvoices.slice(0, 5).map((inv) => {
                const days = calculateDaysOverdue(inv.dueDate);
                return (
                  <div key={inv.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                    <div className="overflow-hidden">
                      <div className="font-semibold text-slate-900 truncate">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {inv.invoiceNumber} • Échue le {inv.dueDate}
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(inv.remainingAmount, inv.currency)}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        +{days} j. retard
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('invoices', 'OVERDUE')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Afficher les {overdueInvoices.length} factures en retard
            </button>
          </div>
        </div>

        {/* Recent Recorded Payments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Derniers règlements</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Traçabilité des encaissements</p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Historique complet <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span>Aucun paiement enregistré pour l'instant.</span>
              </div>
            ) : (
              payments.slice(0, 5).map((p) => (
                <div key={p.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 hover:bg-slate-50 transition-colors">
                  <div className="overflow-hidden">
                    <div className="font-semibold text-slate-900 truncate">Réf: {p.reference}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {p.method} • {p.paymentDate}
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                    <div className="font-bold text-emerald-600">
                      +{formatCurrency(p.amount, p.currency)}
                    </div>
                    <span className="text-[10px] text-slate-400">{p.createdBy}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Consulter tous les encaissements ({payments.length})
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {monthlyReportOpen && (
        <MonthlyReportModal
          isOpen={true}
          onClose={() => setMonthlyReportOpen(false)}
          invoices={invoices}
          payments={payments}
          customers={customers}
          promises={promises}
          company={currentCompany}
          currency={currency}
        />
      )}

      {/* Floating Quick Action Button */}
      <FloatingQuickAction
        onAddInvoice={onAddInvoice || (() => onNavigate('invoices'))}
        onCreateCustomer={onCreateCustomer || (() => onNavigate('customers'))}
        onRunEngine={onRunEngine}
        engineRunning={engineRunning}
      />
    </div>
  );
}
