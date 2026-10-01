import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './lib/authContext';
import { 
  Customer, Invoice, Payment, PaymentPromise, Dispute, 
  ReminderSequence, MessageTemplate, MessageLog, AppNotification, Channel 
} from './types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { COLLECTIONS } from './lib/db';
import { runReminderEngine, ReminderJobResult } from './lib/reminderEngine';
import { Menu, Bell, RefreshCw, Sparkles } from 'lucide-react';

// Components
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import OnboardingModal from './components/OnboardingModal';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import InvoicesView from './components/InvoicesView';
import CustomersView from './components/CustomersView';
import PaymentsView from './components/PaymentsView';
import RemindersView from './components/RemindersView';
import SequencesView from './components/SequencesView';
import TemplatesView from './components/TemplatesView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import PaymentModal from './components/PaymentModal';
import PromiseAndDisputeModal from './components/PromiseAndDisputeModal';
import CSVImportModal from './components/CSVImportModal';
import PublicPaymentPage from './components/PublicPaymentPage';
import CreateInvoiceModal from './components/CreateInvoiceModal';
import CreateCustomerModal from './components/CreateCustomerModal';
import FloatingQuickAction from './components/FloatingQuickAction';
import NotificationPanel from './components/NotificationPanel';

function AppContent() {
  const { currentCompany, currentUser, loading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals for actions
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [promiseDisputeInvoice, setPromiseDisputeInvoice] = useState<{ invoice: Invoice; mode: 'PROMISE' | 'DISPUTE' } | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  // Public Link Check (e.g. /#/pay/{token})
  const [publicToken, setPublicToken] = useState<string | null>(null);

  // Engine state
  const [engineRunning, setEngineRunning] = useState(false);
  const [lastEngineResult, setLastEngineResult] = useState<ReminderJobResult | null>(null);

  // Real-time Firestore state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [promises, setPromises] = useState<PaymentPromise[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [sequences, setSequences] = useState<ReminderSequence[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Check URL hash for public payment token
  useEffect(() => {
    function checkHashRoute() {
      const hash = window.location.hash;
      if (hash.startsWith('#/pay/')) {
        const token = hash.replace('#/pay/', '');
        setPublicToken(token);
      } else {
        setPublicToken(null);
      }
    }

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, []);

  // Listen to Firestore data for the current active company
  useEffect(() => {
    if (!currentCompany?.id) return;

    const compId = currentCompany.id;

    const unsubs = [
      onSnapshot(query(collection(db, COLLECTIONS.CUSTOMERS), where('companyId', '==', compId)), (s) => {
        setCustomers(s.docs.map((d) => d.data() as Customer));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.INVOICES), where('companyId', '==', compId)), (s) => {
        setInvoices(s.docs.map((d) => d.data() as Invoice));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.PAYMENTS), where('companyId', '==', compId)), (s) => {
        setPayments(s.docs.map((d) => d.data() as Payment));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.PROMISES), where('companyId', '==', compId)), (s) => {
        setPromises(s.docs.map((d) => d.data() as PaymentPromise));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.DISPUTES), where('companyId', '==', compId)), (s) => {
        setDisputes(s.docs.map((d) => d.data() as Dispute));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.SEQUENCES), where('companyId', '==', compId)), (s) => {
        setSequences(s.docs.map((d) => d.data() as ReminderSequence));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.TEMPLATES), where('companyId', '==', compId)), (s) => {
        setTemplates(s.docs.map((d) => d.data() as MessageTemplate));
      }),
      onSnapshot(query(collection(db, COLLECTIONS.MESSAGES), where('companyId', '==', compId)), (s) => {
        const logs = s.docs.map((d) => d.data() as MessageLog);
        logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
        setMessageLogs(logs);
      }),
      onSnapshot(query(collection(db, COLLECTIONS.NOTIFICATIONS), where('companyId', '==', compId)), (s) => {
        const notifs = s.docs.map((d) => d.data() as AppNotification);
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(notifs);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [currentCompany?.id]);

  // Run Reminder Engine Handler
  async function triggerReminderEngine() {
    if (!currentCompany?.id) return;
    setEngineRunning(true);
    try {
      const res = await runReminderEngine(
        currentCompany.id,
        currentCompany.name,
        currentCompany.managerName || 'Le Service Recouvrement'
      );
      setLastEngineResult(res);
    } catch (e) {
      console.error('Reminder engine error:', e);
      alert('Erreur lors du traitement des relances.');
    } finally {
      setEngineRunning(false);
    }
  }

  // Handle navigation from dashboard priority items
  function handleNavigate(tab: string, filter?: string) {
    setCurrentTab(tab);
    if (filter) {
      setInvoiceFilter(filter);
    }
  }

  // Public Payment Page Route
  if (publicToken) {
    return (
      <PublicPaymentPage
        token={publicToken}
        onNavigateHome={() => {
          window.location.hash = '';
          setPublicToken(null);
        }}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Initialisation de PayRelance...</span>
        </div>
      </div>
    );
  }

  // If no company or user is signed in, show high-converting Landing Page
  if (!currentCompany) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onEnterDemo={() => {
            setAuthModalMode('login');
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authModalMode}
        />
      </>
    );
  }

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row font-sans text-slate-800">
      
      {/* Mobile Top Header Bar with Hamburger Menu */}
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Ouvrir le menu de navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs">
              PR
            </div>
            <span className="font-bold text-sm tracking-tight text-white">PayRelance</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-blue-300 bg-slate-800 px-2 py-0.5 rounded">
            {currentCompany.currency}
          </span>
          <button
            type="button"
            onClick={() => setNotificationsPanelOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 relative cursor-pointer"
            title="Alertes et notifications"
            aria-label="Ouvrir les notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation (drawer on mobile/tablet, fixed sidebar on desktop) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setInvoiceFilter('ALL');
        }}
        unreadCount={unreadNotifsCount}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenNotifications={() => setNotificationsPanelOpen(true)}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode || 'login');
          setAuthModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {currentTab === 'dashboard' && (
            <DashboardView
              invoices={invoices}
              customers={customers}
              payments={payments}
              promises={promises}
              currency={currentCompany.currency}
              onNavigate={handleNavigate}
              onRunEngine={triggerReminderEngine}
              engineRunning={engineRunning}
              onAddInvoice={() => setCreateInvoiceOpen(true)}
              onCreateCustomer={() => setCreateCustomerOpen(true)}
              onOpenNotifications={() => setNotificationsPanelOpen(true)}
              unreadNotifsCount={unreadNotifsCount}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesView
              invoices={invoices}
              customers={customers}
              currency={currentCompany.currency}
              initialFilter={invoiceFilter}
              onRefresh={() => {}}
              onOpenPayment={(inv) => setPaymentModalInvoice(inv)}
              onOpenPromiseOrDispute={(inv, mode) => setPromiseDisputeInvoice({ invoice: inv, mode })}
              onOpenCSVImport={() => setCsvImportOpen(true)}
              onSelectInvoice={(inv) => setPaymentModalInvoice(inv)}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              invoices={invoices}
              payments={payments}
              promises={promises}
              currency={currentCompany.currency}
              onRefresh={() => {}}
              onSelectInvoice={(inv) => setPaymentModalInvoice(inv)}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentsView
              payments={payments}
              invoices={invoices}
              currency={currentCompany.currency}
            />
          )}

          {currentTab === 'reminders' && (
            <RemindersView
              logs={messageLogs}
              invoices={invoices}
              currency={currentCompany.currency}
              onRunEngine={triggerReminderEngine}
              engineRunning={engineRunning}
              lastResult={lastEngineResult}
            />
          )}

          {currentTab === 'sequences' && (
            <SequencesView
              sequences={sequences}
              templates={templates}
              onRefresh={() => {}}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesView
              templates={templates}
              currency={currentCompany.currency}
              onRefresh={() => {}}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              invoices={invoices}
              payments={payments}
              customers={customers}
              currency={currentCompany.currency}
            />
          )}

          {currentTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Action Modals */}
      {paymentModalInvoice && (
        <PaymentModal
          invoice={paymentModalInvoice}
          isOpen={true}
          onClose={() => setPaymentModalInvoice(null)}
          onSuccess={() => setPaymentModalInvoice(null)}
        />
      )}

      {promiseDisputeInvoice && (
        <PromiseAndDisputeModal
          invoice={promiseDisputeInvoice.invoice}
          mode={promiseDisputeInvoice.mode}
          isOpen={true}
          onClose={() => setPromiseDisputeInvoice(null)}
          onSuccess={() => setPromiseDisputeInvoice(null)}
        />
      )}

      {csvImportOpen && (
        <CSVImportModal
          isOpen={true}
          onClose={() => setCsvImportOpen(false)}
          onSuccess={() => setCsvImportOpen(false)}
        />
      )}

      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      {createInvoiceOpen && (
        <CreateInvoiceModal
          isOpen={true}
          onClose={() => setCreateInvoiceOpen(false)}
          customers={customers}
          currency={currentCompany.currency}
          onSuccess={() => setCreateInvoiceOpen(false)}
        />
      )}

      {createCustomerOpen && (
        <CreateCustomerModal
          isOpen={true}
          onClose={() => setCreateCustomerOpen(false)}
          onSuccess={() => setCreateCustomerOpen(false)}
        />
      )}

      {/* Notification Slide-Over Panel */}
      <NotificationPanel
        isOpen={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
        notifications={notifications}
        onNavigate={handleNavigate}
      />

      {/* Authentication & Registration & OTP Modal */}
      {authModalOpen && (
        <AuthModal
          isOpen={true}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authModalMode}
        />
      )}

      {/* Global Floating Quick Action Button accessible from any view */}
      {currentTab !== 'dashboard' && (
        <FloatingQuickAction
          onAddInvoice={() => setCreateInvoiceOpen(true)}
          onCreateCustomer={() => setCreateCustomerOpen(true)}
          onRunEngine={triggerReminderEngine}
          engineRunning={engineRunning}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
