import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Customer, Invoice, Payment, PaymentPromise } from '../types';
import { 
  Users, Plus, Search, Filter, Mail, Phone, MapPin, 
  FileText, CreditCard, ChevronRight, X, ArrowRight, 
  Clock, CheckCircle2, AlertTriangle, MessageSquare, ArrowLeft
} from 'lucide-react';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';

interface CustomersViewProps {
  customers: Customer[];
  invoices: Invoice[];
  payments: Payment[];
  promises: PaymentPromise[];
  currency: string;
  onRefresh: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
}

export default function CustomersView({
  customers,
  invoices,
  payments,
  promises,
  currency,
  onRefresh,
  onSelectInvoice,
}: CustomersViewProps) {
  const { currentCompany } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState(currentCompany?.country || 'Côte d’Ivoire');
  const [newRef, setNewRef] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter customers by search
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.customerReference && c.customerReference.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || (filteredCustomers[0] || null);

  // Customer specific stats
  const customerInvoices = invoices.filter((inv) => inv.customerId === selectedCustomer?.id);
  const customerPayments = payments.filter((p) => p.customerId === selectedCustomer?.id);
  const customerPromises = promises.filter((p) => p.customerId === selectedCustomer?.id);

  const totalInvoiced = customerInvoices.reduce((a, b) => a + b.amount, 0);
  const totalPaid = customerInvoices.reduce((a, b) => a + b.paidAmount, 0);
  const totalRemaining = customerInvoices.reduce((a, b) => a + b.remainingAmount, 0);
  const totalOverdue = customerInvoices
    .filter((inv) => inv.remainingAmount > 0 && calculateDaysOverdue(inv.dueDate) > 0)
    .reduce((a, b) => a + b.remainingAmount, 0);

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id || !newName || !newEmail) return;
    setSaving(true);

    try {
      const cRef = doc(collection(db, COLLECTIONS.CUSTOMERS));
      const customer: Customer = {
        id: cRef.id,
        companyId: currentCompany.id,
        name: newName,
        email: newEmail,
        phone: newPhone,
        whatsapp: newWhatsapp || newPhone,
        city: newCity,
        country: newCountry,
        customerReference: newRef || 'CUST-' + Math.floor(1000 + Math.random() * 9000),
        notes: newNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(cRef, customer);
      setIsCreating(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewWhatsapp('');
      setNewNotes('');
      onRefresh();
      setSelectedCustomerId(cRef.id);
      setMobileDetailOpen(true);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création du client.');
    } finally {
      setSaving(false);
    }
  }

  function handleSelectCustomer(custId: string) {
    setSelectedCustomerId(custId);
    setMobileDetailOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Portefeuille Clients</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi individuel des créances, historique des relances et promesses de règlement.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouveau Client
        </button>
      </div>

      {/* Main Layout: Responsive Master-Detail pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* Left Column: Customer List (hidden on small screens if mobile detail is open) */}
        <div className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[550px] sm:h-[650px] ${
          mobileDetailOpen ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun client trouvé.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const custInvs = invoices.filter((i) => i.customerId === c.id);
                const unpaid = custInvs.reduce((a, b) => a + b.remainingAmount, 0);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c.id)}
                    className={`w-full text-left p-3.5 sm:p-4 transition-all flex items-center justify-between cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="font-semibold text-xs text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{c.email}</div>
                      {c.city && <div className="text-[10px] text-slate-400 mt-0.5">{c.city} • {c.country}</div>}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      {unpaid > 0 ? (
                        <div>
                          <div className="text-xs font-bold text-rose-600">
                            {formatCurrency(unpaid, currency)}
                          </div>
                          <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded">
                            Impayé
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                          À jour
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 lg:hidden" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Customer Record (Fiche Client) */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col justify-between ${
          !mobileDetailOpen ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedCustomer ? (
            <div>
              {/* Header profile */}
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  className="lg:hidden mb-3 text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour à la liste des clients
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                      {selectedCustomer.customerReference || 'CUST'}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">{selectedCustomer.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedCustomer.email}
                      </span>
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedCustomer.city}, {selectedCustomer.country}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Financial KPIs for this client */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 sm:mt-5">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase">Total facturé</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{formatCurrency(totalInvoiced, currency)}</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold uppercase">Encaissé</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5 truncate">{formatCurrency(totalPaid, currency)}</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] text-amber-600 font-semibold uppercase">Solde dû</div>
                    <div className="text-xs font-bold text-amber-600 mt-0.5 truncate">{formatCurrency(totalRemaining, currency)}</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="text-[9px] sm:text-[10px] text-rose-600 font-semibold uppercase">En retard</div>
                    <div className="text-xs font-bold text-rose-600 mt-0.5 truncate">{formatCurrency(totalOverdue, currency)}</div>
                  </div>
                </div>
              </div>

              {/* Invoices sub-section */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Factures du client ({customerInvoices.length})</span>
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
                    <table className="w-full text-left min-w-[500px] sm:min-w-full">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Numéro</th>
                          <th className="p-2.5">Échéance</th>
                          <th className="p-2.5">Montant</th>
                          <th className="p-2.5">Reste dû</th>
                          <th className="p-2.5">Statut</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-slate-400">
                              Aucune facture enregistrée pour ce client.
                            </td>
                          </tr>
                        ) : (
                          customerInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/70">
                              <td className="p-2.5 font-mono font-semibold text-slate-900">{inv.invoiceNumber}</td>
                              <td className="p-2.5 text-slate-600">{inv.dueDate}</td>
                              <td className="p-2.5 font-semibold text-slate-900">{formatCurrency(inv.amount, inv.currency)}</td>
                              <td className="p-2.5 font-bold text-rose-600">{formatCurrency(inv.remainingAmount, inv.currency)}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                  inv.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                                  inv.status === 'DISPUTED' ? 'bg-purple-100 text-purple-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => onSelectInvoice(inv)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                >
                                  Détails
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes & Promesses */}
                {customerPromises.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Promesses de paiement ({customerPromises.length})
                    </h3>
                    <div className="space-y-2">
                      {customerPromises.map((p) => (
                        <div key={p.id} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div>
                            <span className="font-bold text-indigo-900">
                              {formatCurrency(p.amount, currency)} promis pour le {p.promisedDate}
                            </span>
                            <div className="text-slate-600 mt-0.5">{p.notes || 'Sans note particulière'}</div>
                          </div>
                          <span className="self-start sm:self-auto px-2 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold text-[10px]">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Sélectionnez un client dans la liste pour voir sa fiche détaillée.
            </div>
          )}
        </div>
      </div>

      {/* Create Customer Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Nouveau client</h2>
              </div>
              <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Raison sociale / Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Entreprise Travaux Publics SA"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email de facturation *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="compta@client.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    N° Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp pour relances
                  </label>
                  <input
                    type="tel"
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Abidjan / Paris"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes internes sur le client
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ex: Habitude de règlement à 30 jours fin de mois."
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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
                >
                  {saving ? 'Création...' : 'Créer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
