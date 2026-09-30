import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { MessageLog, Invoice, ReminderJobResult } from '../types';
import { 
  Send, RefreshCw, CheckCircle2, AlertTriangle, 
  Mail, MessageSquare, Clock, Zap, ArrowRight, ShieldCheck
} from 'lucide-react';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';

interface RemindersViewProps {
  logs: MessageLog[];
  invoices: Invoice[];
  currency: string;
  onRunEngine: () => void;
  engineRunning: boolean;
  lastResult: ReminderJobResult | null;
}

export default function RemindersView({
  logs,
  invoices,
  currency,
  onRunEngine,
  engineRunning,
  lastResult,
}: RemindersViewProps) {
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'EMAIL' | 'WHATSAPP'>('ALL');

  const overdueInvoices = invoices.filter(
    (inv) => inv.remainingAmount > 0 && inv.status !== 'CANCELLED' && inv.status !== 'DISPUTED' && calculateDaysOverdue(inv.dueDate) > 0
  );

  const filteredLogs = logs.filter((l) => {
    if (filterChannel === 'ALL') return true;
    return l.channel === filterChannel;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Moteur de Relance Intelligent</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold">
              Automatisé & Idempotent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Évalue quotidiennement le statut des factures, vérifie l'absence de litiges et envoie les relances par Email & WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunEngine}
          disabled={engineRunning}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${engineRunning ? 'animate-spin' : ''}`} />
          <span>{engineRunning ? 'Exécution du moteur...' : 'Lancer une passe de relance'}</span>
        </button>
      </div>

      {/* Safety Rules & Idempotency Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Garanties de sécurité et d'intégrité commerciale</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="font-bold text-white block mb-0.5">Arrêt dès encaissement</span>
            Si le solde restant est à 0 ou payé, aucune relance n'est envoyée.
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="font-bold text-white block mb-0.5">Suspension sur litige</span>
            Toute facture marquée en litige interrompt immédiatement le cycle.
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="font-bold text-white block mb-0.5">Idempotence garantie</span>
            Une même étape de relance ne peut jamais être transmise deux fois.
          </div>
        </div>
      </div>

      {/* Last execution execution feedback box if any */}
      {lastResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cycle de relance terminé</span>
          </div>
          <p className="text-emerald-800">
            {lastResult.invoicesEvaluated} facture(s) examinée(s) • {lastResult.remindersSent} relance(s) transmise(s) avec succès.
          </p>
          {lastResult.details.length > 0 && (
            <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100 max-h-40 overflow-y-auto space-y-1.5 text-[11px]">
              {lastResult.details.map((d, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-slate-700 gap-1 border-b border-emerald-50 pb-1 last:border-0">
                  <span className="truncate">
                    <strong>{d.invoiceNumber}</strong> ({d.customerName}) — {d.stepTitle} [{d.channel}]
                  </span>
                  <span className="font-semibold text-emerald-700 self-start sm:self-auto">{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message History Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Journal des relances envoyées ({filteredLogs.length})
          </h2>

          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'EMAIL', 'WHATSAPP'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setFilterChannel(ch)}
                className={`px-3 py-1 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  filterChannel === ch ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ch === 'ALL' ? 'Tous' : ch}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Send className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <span>Aucune relance envoyée pour l'instant.</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {log.channel === 'EMAIL' ? (
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="font-bold text-slate-900 truncate">{log.subject}</span>
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({log.recipient})</span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {log.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.sentAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 sm:pl-7 text-[11px] line-clamp-2">
                  {log.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
