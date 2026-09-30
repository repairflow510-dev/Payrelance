import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Invoice, Customer, InvoiceStatus } from '../types';
import { 
  FileText, Plus, Search, Filter, Upload, Download, 
  CreditCard, CalendarClock, AlertOctagon, Send, ExternalLink,
  ChevronDown, CheckCircle2, Clock, Eye, AlertTriangle
} from 'lucide-react';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';

interface InvoicesViewProps {
  invoices: Invoice[];
  customers: Customer[];
  currency: string;
  initialFilter?: string;
  onRefresh: () => void;
  onOpenPayment: (invoice: Invoice) => void;
  onOpenPromiseOrDispute: (invoice: Invoice, mode: 'PROMISE' | 'DISPUTE') => void;
  onOpenCSVImport: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export default function InvoicesView({
  invoices,
  customers,
  currency,
  initialFilter = 'ALL',
  onRefresh,
  onOpenPayment,
  onOpenPromiseOrDispute,
  onOpenCSVImport,
  onSelectInvoice,
}: InvoicesViewProps) {
  const { currentCompany } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [isCreating, setIsCreating] = useState(false);

  // New Invoice Form
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('FAC-2026-' + Math.floor(1000 + Math.random() * 9000));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(500000);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Filtering
  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.description && inv.description.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return inv.remainingAmount > 0 && calculateDaysOverdue(inv.dueDate) > 0;
    if (statusFilter === 'OVERDUE_30') return inv.remainingAmount > 0 && calculateDaysOverdue(inv.dueDate) > 30;
    if (statusFilter === 'UNPAID') return inv.remainingAmount > 0;
    return inv.status === statusFilter;
  });

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id || !selectedCustomerId || amount <= 0) return;
    setSaving(true);

    try {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      const invRef = doc(collection(db, COLLECTIONS.INVOICES));

      const daysOverdue = calculateDaysOverdue(dueDate);
      const status: InvoiceStatus = daysOverdue > 0 ? 'OVERDUE' : 'SENT';

      const newInv: Invoice = {
        id: invRef.id,
        companyId: currentCompany.id,
        customerId: selectedCustomerId,
        customerName: customer?.name || 'Client',
        invoiceNumber,
        description: description || `Prestation / Vente - Facture ${invoiceNumber}`,
        amount: Number(amount),
        paidAmount: 0,
        remainingAmount: Number(amount),
        currency: currentCompany.currency || 'FCFA',
        issueDate,
        dueDate,
        status,
        publicToken: 'tok_' + Math.random().toString(36).substring(2, 12),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(invRef, newInv);
      setIsCreating(false);
      setDescription('');
      onRefresh();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la création de la facture.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Gestion des Factures</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des soldes restants, détection des retards et liens de règlement direct.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCSVImport}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importer CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Créer Facture</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par n°, client, libellé..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Scrollable Status Pill Filters on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'OVERDUE', label: 'En retard' },
            { id: 'UNPAID', label: 'Impayées' },
            { id: 'PAID', label: 'Payées' },
            { id: 'PARTIALLY_PAID', label: 'Partielles' },
            { id: 'DISPUTED', label: 'En litige' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive View: Desktop Table + Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Desktop Table View (hidden on small mobile, visible sm and up) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 lg:p-4">N° Facture</th>
                <th className="p-3.5 lg:p-4">Client</th>
                <th className="p-3.5 lg:p-4">Échéance</th>
                <th className="p-3.5 lg:p-4">Montant Initial</th>
                <th className="p-3.5 lg:p-4">Encaissé</th>
                <th className="p-3.5 lg:p-4">Reste à Payer</th>
                <th className="p-3.5 lg:p-4">Statut</th>
                <th className="p-3.5 lg:p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Aucune facture ne correspond à ces critères.</span>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  const isLate = inv.remainingAmount > 0 && daysOverdue > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 lg:p-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-3.5 lg:p-4">
                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{inv.description}</div>
                      </td>
                      <td className="p-3.5 lg:p-4">
                        <div className="text-slate-700">{inv.dueDate}</div>
                        {isLate ? (
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            +{daysOverdue} j. retard
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Dans les délais</span>
                        )}
                      </td>
                      <td className="p-3.5 lg:p-4 font-semibold text-slate-900">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="p-3.5 lg:p-4 text-emerald-600 font-semibold">
                        {formatCurrency(inv.paidAmount, inv.currency)}
                      </td>
                      <td className="p-3.5 lg:p-4">
                        <div className={`font-bold ${inv.remainingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatCurrency(inv.remainingAmount, inv.currency)}
                        </div>
                      </td>
                      <td className="p-3.5 lg:p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : inv.status === 'DISPUTED'
                            ? 'bg-purple-100 text-purple-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 lg:p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenPayment(inv)}
                              title="Enregistrer paiement"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          {inv.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenPromiseOrDispute(inv, 'PROMISE')}
                              title="Promesse de paiement"
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                            >
                              <CalendarClock className="w-4 h-4" />
                            </button>
                          )}
                          {inv.status !== 'DISPUTED' && inv.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenPromiseOrDispute(inv, 'DISPUTE')}
                              title="Déclarer litige"
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={`/#/pay/${inv.publicToken}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Lien public de paiement"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (optimized for smartphones) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>Aucune facture trouvée.</span>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const daysOverdue = calculateDaysOverdue(inv.dueDate);
              const isLate = inv.remainingAmount > 0 && daysOverdue > 0;

              return (
                <div key={inv.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">{inv.invoiceNumber}</span>
                      <div className="font-semibold text-xs text-slate-800 mt-0.5">{inv.customerName}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                      inv.status === 'DISPUTED' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Échéance</div>
                      <div className="font-medium text-slate-700">{inv.dueDate}</div>
                      {isLate && (
                        <span className="text-[10px] font-bold text-rose-600">
                          +{daysOverdue} j. retard
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Solde dû</div>
                      <div className="font-bold text-rose-600">
                        {formatCurrency(inv.remainingAmount, inv.currency)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        sur {formatCurrency(inv.amount, inv.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions Bar */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <a
                      href={`/#/pay/${inv.publicToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Lien client
                    </a>

                    <div className="flex items-center gap-1.5">
                      {inv.remainingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPayment(inv)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Encaisser
                        </button>
                      )}
                      {inv.remainingAmount > 0 && (
                        <button
                          type="button"
                          onClick={() => onOpenPromiseOrDispute(inv, 'PROMISE')}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Nouvelle Facture</h2>
              </div>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Client débiteur *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">Sélectionnez un client...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Numéro de facture *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Montant TTC ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date d'émission
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date d'échéance *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Libellé de prestation
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Fourniture matériaux de construction et suivi de chantier"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedCustomerId}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
                >
                  {saving ? 'Enregistrement...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
