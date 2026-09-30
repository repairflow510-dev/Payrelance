import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Invoice } from '../types';
import { 
  CalendarClock, AlertOctagon, X, CheckCircle2, ShieldAlert, ArrowRight 
} from 'lucide-react';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { formatCurrency } from '../lib/constants';

interface PromiseAndDisputeModalProps {
  invoice: Invoice;
  mode: 'PROMISE' | 'DISPUTE';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PromiseAndDisputeModal({ 
  invoice, 
  mode, 
  isOpen, 
  onClose, 
  onSuccess 
}: PromiseAndDisputeModalProps) {
  const { currentCompany, currentUser } = useAuth();
  
  // Promise state
  const [promisedDate, setPromisedDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [promiseAmount, setPromiseAmount] = useState(invoice.remainingAmount);

  // Dispute state
  const [disputeReason, setDisputeReason] = useState<any>('INCORRECT_AMOUNT');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handlePromiseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id) return;
    setSaving(true);

    try {
      const promiseRef = doc(collection(db, COLLECTIONS.PROMISES));
      await setDoc(promiseRef, {
        id: promiseRef.id,
        companyId: currentCompany.id,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: Number(promiseAmount),
        promisedDate,
        status: 'PENDING',
        notes: description,
        createdAt: new Date().toISOString(),
      });

      const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      await setDoc(notifRef, {
        id: notifRef.id,
        companyId: currentCompany.id,
        title: 'Promesse de paiement enregistrée',
        message: `Le client ${invoice.customerName} s'engage à régler ${formatCurrency(promiseAmount, invoice.currency)} d'ici le ${promisedDate}.`,
        type: 'PROMISE',
        read: false,
        createdAt: new Date().toISOString(),
      });

      setFeedback('Promesse de paiement enregistrée avec succès.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l’enregistrement de la promesse.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id) return;
    setSaving(true);

    try {
      const disputeRef = doc(collection(db, COLLECTIONS.DISPUTES));
      await setDoc(disputeRef, {
        id: disputeRef.id,
        companyId: currentCompany.id,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        reason: disputeReason,
        description,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, COLLECTIONS.INVOICES, invoice.id), {
        status: 'DISPUTED',
        disputeReason,
        disputeNotes: description,
        updatedAt: new Date().toISOString(),
      });

      const auditRef = doc(collection(db, COLLECTIONS.AUDIT_LOGS));
      await setDoc(auditRef, {
        id: auditRef.id,
        companyId: currentCompany.id,
        userId: currentUser?.id || 'sys',
        userName: currentUser?.name || 'Utilisateur',
        action: 'INVOICE_DISPUTED',
        resource: 'INVOICE',
        resourceId: invoice.id,
        metadata: { reason: disputeReason, description },
        timestamp: new Date().toISOString(),
      });

      const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      await setDoc(notifRef, {
        id: notifRef.id,
        companyId: currentCompany.id,
        title: 'Litige déclaré — Relances suspendues',
        message: `La facture ${invoice.invoiceNumber} a été mise en litige. Les relances sont arrêtées.`,
        type: 'DISPUTE',
        read: false,
        createdAt: new Date().toISOString(),
      });

      setFeedback('Facture placée en litige. Les relances automatiques sont suspendues.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la déclaration du litige.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className={`p-4 sm:p-6 text-white flex items-center justify-between ${mode === 'PROMISE' ? 'bg-indigo-900' : 'bg-rose-900'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
              {mode === 'PROMISE' ? (
                <CalendarClock className="w-5 h-5 text-indigo-300" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-300" />
              )}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-base sm:text-lg font-bold">
                {mode === 'PROMISE' ? 'Promesse de paiement' : 'Déclarer un litige'}
              </h2>
              <p className="text-xs text-white/80 truncate">
                {invoice.invoiceNumber} — {invoice.customerName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg">
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
        ) : mode === 'PROMISE' ? (
          <form onSubmit={handlePromiseSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date promise par le client
              </label>
              <input
                type="date"
                required
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Montant promis ({invoice.currency})
              </label>
              <input
                type="number"
                required
                min={1}
                max={invoice.remainingAmount}
                value={promiseAmount}
                onChange={(e) => setPromiseAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notes d'échange / Contexte
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Confirmation reçue par téléphone."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
            </div>

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
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDisputeSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                Attention : la mise en litige suspend immédiatement toutes les relances automatiques.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Motif principal du litige
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-600 focus:outline-none"
              >
                <option value="INCORRECT_AMOUNT">Montant incorrect / contesté</option>
                <option value="SERVICE_NOT_DELIVERED">Prestation non livrée ou non conforme</option>
                <option value="ALREADY_PAID">Facture déjà payée (justificatif attendu)</option>
                <option value="ADMINISTRATIVE">Problème administratif / bon de commande</option>
                <option value="OTHER">Autre contestation commerciale</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description de la contestation
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Le client conteste la prestation..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-600 focus:outline-none"
              />
            </div>

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
                disabled={saving || !description}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? 'Suspension...' : 'Suspendre en litige'}
                {!saving && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
