import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Invoice, PaymentMethod } from '../types';
import { 
  CreditCard, CheckCircle2, X, DollarSign, Calendar, 
  FileText, ShieldCheck, ArrowRight 
} from 'lucide-react';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { formatCurrency } from '../lib/constants';

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ invoice, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { currentCompany, currentUser } = useAuth();
  const [amount, setAmount] = useState<number>(invoice.remainingAmount);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState('VIR-' + Math.floor(100000 + Math.random() * 900000));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id || amount <= 0) return;
    setSaving(true);

    try {
      const payRef = doc(collection(db, COLLECTIONS.PAYMENTS));
      const paymentData = {
        id: payRef.id,
        companyId: currentCompany.id,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: Number(amount),
        currency: invoice.currency,
        paymentDate,
        method,
        reference,
        notes,
        createdBy: currentUser?.name || 'Comptable',
        createdAt: new Date().toISOString(),
      };
      await setDoc(payRef, paymentData);

      const newPaidTotal = invoice.paidAmount + Number(amount);
      const newRemaining = Math.max(0, invoice.amount - newPaidTotal);
      const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

      await updateDoc(doc(db, COLLECTIONS.INVOICES, invoice.id), {
        paidAmount: newPaidTotal,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
      await setDoc(auditRef, {
        id: auditRef.id,
        companyId: currentCompany.id,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Comptable',
        action: 'PAYMENT_RECORDED',
        resource: 'INVOICE',
        resourceId: invoice.id,
        metadata: {
          amount,
          newRemaining,
          method,
          status: newStatus,
        },
        timestamp: new Date().toISOString(),
      });

      const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      await setDoc(notifRef, {
        id: notifRef.id,
        companyId: currentCompany.id,
        title: 'Paiement encaissé',
        message: `Paiement de ${formatCurrency(amount, invoice.currency)} enregistré sur la facture ${invoice.invoiceNumber}. Nouveau solde : ${formatCurrency(newRemaining, invoice.currency)}.`,
        type: 'PAYMENT',
        read: false,
        createdAt: new Date().toISOString(),
      });

      setFeedback(`Paiement de ${formatCurrency(amount, invoice.currency)} validé avec succès ! Solde restant : ${formatCurrency(newRemaining, invoice.currency)}.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Payment record error:', err);
      alert('Erreur lors de l’enregistrement du paiement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base sm:text-lg font-bold">Enregistrer un paiement</h2>
              <p className="text-xs text-slate-300 truncate">
                {invoice.invoiceNumber} — {invoice.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-800">{feedback}</p>
          </div>
        ) : (
          <form onSubmit={handleRecordPayment} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {/* Invoice summary bar */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Total</span>
                <span className="font-semibold text-slate-900 truncate block">{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Déjà payé</span>
                <span className="font-semibold text-emerald-700 truncate block">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Solde</span>
                <span className="font-bold text-rose-600 truncate block">{formatCurrency(invoice.remainingAmount, invoice.currency)}</span>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Montant encaissé
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(invoice.remainingAmount)}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Tout régler
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  required
                  min={1}
                  max={invoice.remainingAmount}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-slate-500">
                  {invoice.currency}
                </span>
              </div>
              {amount < invoice.remainingAmount && (
                <p className="text-[11px] text-amber-700 mt-1">
                  * Paiement partiel : relances recalculées sur le solde restant.
                </p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Moyen de paiement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'BANK_TRANSFER', label: 'Virement bancaire' },
                  { id: 'MOBILE_MONEY', label: 'Mobile Money' },
                  { id: 'CARD', label: 'Carte Bancaire' },
                  { id: 'CASH', label: 'Espèces / Chèque' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id as PaymentMethod)}
                    className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all cursor-pointer ${
                      method === m.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Date de réception
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Référence / N° Transaction
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="VIR-001239"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Commentaire interne (optionnel)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reçu bancaire vérifié par la comptabilité."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving || amount <= 0}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? 'Validation...' : 'Enregistrer le règlement'}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
