import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Payment, Invoice } from '../types';
import { 
  CreditCard, Search, Download, CheckCircle2, 
  Calendar, FileText, ArrowDownLeft 
} from 'lucide-react';
import { formatCurrency } from '../lib/constants';

interface PaymentsViewProps {
  payments: Payment[];
  invoices: Invoice[];
  currency: string;
}

export default function PaymentsView({ payments, invoices, currency }: PaymentsViewProps) {
  const [search, setSearch] = useState('');

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.reference.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Paiements & Encaissements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Journal complet des règlements totaux et partiels enregistrés.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-800">Total Encaissé</div>
            <div className="text-base font-extrabold text-emerald-900">
              {formatCurrency(totalCollected, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par référence, moyen..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Date</th>
                <th className="p-4">Facture Liée</th>
                <th className="p-4">Moyen</th>
                <th className="p-4">Montant Reçu</th>
                <th className="p-4">Commentaire</th>
                <th className="p-4">Enregistré par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Aucun paiement enregistré pour le moment.</span>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoiceId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">{p.reference}</td>
                      <td className="p-4 text-slate-600">{p.paymentDate}</td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-900">{inv?.invoiceNumber || 'Facture'}</span>
                        <div className="text-[11px] text-slate-400">{inv?.customerName}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.method}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 text-sm">
                        +{formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{p.notes || '—'}</td>
                      <td className="p-4 text-slate-400 text-[11px]">{p.createdBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>Aucun paiement enregistré.</span>
            </div>
          ) : (
            filteredPayments.map((p) => {
              const inv = invoices.find((i) => i.id === p.invoiceId);
              return (
                <div key={p.id} className="p-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{p.reference}</span>
                    <span className="font-bold text-emerald-600 text-sm">
                      +{formatCurrency(p.amount, p.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>{inv?.invoiceNumber} ({inv?.customerName})</span>
                    <span>{p.paymentDate}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {p.method}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.createdBy}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
