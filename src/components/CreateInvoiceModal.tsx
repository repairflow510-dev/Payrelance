import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Customer, Invoice, InvoiceStatus } from '../types';
import { FileText, X } from 'lucide-react';
import { calculateDaysOverdue } from '../lib/constants';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  currency: string;
  onSuccess?: () => void;
}

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  customers,
  currency,
  onSuccess,
}: CreateInvoiceModalProps) {
  const { currentCompany } = useAuth();
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('FAC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(500000);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

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
        currency: currentCompany.currency || currency || 'FCFA',
        issueDate,
        dueDate,
        status,
        publicToken: 'tok_' + Math.random().toString(36).substring(2, 12),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(invRef, newInv);
      onClose();
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la création de la facture.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Nouvelle Facture</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
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
              placeholder="Ex: Prestations de conseil ou vente de matériel"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
              disabled={saving || !selectedCustomerId}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
