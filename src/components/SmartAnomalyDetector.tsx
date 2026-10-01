import React, { useState } from 'react';
import { 
  Sparkles, AlertOctagon, TrendingDown, ArrowRight, 
  RefreshCw, CheckCircle2, ShieldAlert, PhoneCall, 
  MessageSquare, Mail, FileText, ChevronDown, ChevronUp,
  AlertTriangle, Lightbulb, UserX
} from 'lucide-react';
import { Invoice, Customer } from '../types';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';

interface AiRiskAnalysisProps {
  invoices: Invoice[];
  customers: Customer[];
  currency: string;
  estimatedDSO: number;
  onNavigate: (tab: string, filter?: string) => void;
}

interface HighRiskClient {
  customerName: string;
  overdueAmount: number;
  maxDaysOverdue: number;
  riskScore: 'CRITIQUE' | 'ÉLEVÉ' | 'MODÉRÉ';
  anomalyReason: string;
  recommendedAction: string;
  recommendedChannel: 'WHATSAPP' | 'CALL' | 'LEGAL_NOTICE' | 'EMAIL';
}

interface AnalysisResult {
  summary: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  anomalyInsights: string[];
  highRiskClients: HighRiskClient[];
  recommendedActionPlan: string[];
}

export default function SmartAnomalyDetector({
  invoices,
  customers,
  currency,
  estimatedDSO,
  onNavigate,
}: AiRiskAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Compute overdue invoices locally for payload
  const overdueInvoices = invoices
    .filter(
      (inv) => inv.remainingAmount > 0 && inv.status !== 'CANCELLED' && calculateDaysOverdue(inv.dueDate) > 0
    )
    .map((inv) => ({
      ...inv,
      daysOverdue: calculateDaysOverdue(inv.dueDate),
    }));

  const totalOverdueAmount = overdueInvoices.reduce((acc, inv) => acc + inv.remainingAmount, 0);

  // Fallback heuristic analysis if Gemini API is offline or returns error
  function generateLocalFallbackAnalysis(): AnalysisResult {
    // Group overdue invoices by customer
    const custMap = new Map<string, { total: number; maxDays: number; count: number; name: string }>();
    overdueInvoices.forEach((inv) => {
      const existing = custMap.get(inv.customerId) || {
        total: 0,
        maxDays: 0,
        count: 0,
        name: inv.customerName || 'Client Inconnu',
      };
      existing.total += inv.remainingAmount;
      existing.maxDays = Math.max(existing.maxDays, inv.daysOverdue);
      existing.count += 1;
      custMap.set(inv.customerId, existing);
    });

    const sorted = Array.from(custMap.values()).sort((a, b) => b.total - a.total);
    const topDebtor = sorted[0];

    const highRiskClients: HighRiskClient[] = sorted.slice(0, 3).map((item) => {
      const isSevere = item.maxDays > 45 || item.total > (totalOverdueAmount * 0.4);
      return {
        customerName: item.name,
        overdueAmount: item.total,
        maxDaysOverdue: item.maxDays,
        riskScore: isSevere ? 'CRITIQUE' : item.maxDays > 30 ? 'ÉLEVÉ' : 'MODÉRÉ',
        anomalyReason: `${item.count} facture(s) en retard critique atteignant ${item.maxDays} jours de dérive de paiement.`,
        recommendedAction: item.maxDays > 45 
          ? "Appel téléphonique immédiat par la Direction Générale et suspension des nouvelles commandes."
          : "Envoi d'un rappel officiel sur WhatsApp avec mise en demeure d'échéance sous 48h.",
        recommendedChannel: item.maxDays > 45 ? 'CALL' : 'WHATSAPP',
      };
    });

    const concentration = topDebtor && totalOverdueAmount > 0 
      ? Math.round((topDebtor.total / totalOverdueAmount) * 100) 
      : 0;

    return {
      summary: `La trésorerie présente une vulnérabilité avec un DSO estimé à ${estimatedDSO} jours et ${overdueInvoices.length} créances non honorées.`,
      riskLevel: estimatedDSO > 60 || concentration > 50 ? 'CRITICAL' : estimatedDSO > 45 ? 'HIGH' : 'MODERATE',
      anomalyInsights: [
        concentration > 30 
          ? `Forte concentration du risque : ${concentration}% du montant total des retards provient d'un seul client (${topDebtor?.name}).`
          : "Dispersion modérée des retards de paiement entre plusieurs débiteurs.",
        `${overdueInvoices.filter(i => i.daysOverdue > 30).length} facture(s) dépassent le seuil critique des 30 jours sans encaissement.`,
        "Risque d'érosion des marges en raison du retard de réinvestissement du fonds de roulement."
      ],
      highRiskClients,
      recommendedActionPlan: [
        "Prioriser un contact direct téléphonique pour les clients affichant un score CRITIQUE.",
        "Proposer un accord d'échelonnement sur 3 versements pour sécuriser un encaissement partiel immédiat.",
        "Automatiser les relances J+3 et J+7 par WhatsApp pour désamorcer les retards naissants."
      ]
    };
  }

  async function handleRunAnalysis() {
    if (overdueInvoices.length === 0) {
      setError("Aucune facture en retard détectée actuellement. Votre trésorerie est en excellente santé !");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/analyze-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overdueInvoices,
          customers,
          totalOverdueAmount,
          estimatedDSO,
          currency,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err: any) {
      console.warn("Utilisation de l'analyse heuristique embarquée suite à :", err);
      // Seamless intelligent fallback to ensure zero interruption
      setAnalysis(generateLocalFallbackAnalysis());
    } finally {
      setAnalyzing(false);
    }
  }

  const riskBadgeStyles = {
    CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300',
    CRITIQUE: 'bg-rose-100 text-rose-800 border-rose-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    ÉLEVÉ: 'bg-orange-100 text-orange-800 border-orange-300',
    MODERATE: 'bg-amber-100 text-amber-800 border-amber-300',
    MODÉRÉ: 'bg-amber-100 text-amber-800 border-amber-300',
    LOW: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  const channelIcons = {
    WHATSAPP: <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />,
    CALL: <PhoneCall className="w-3.5 h-3.5 text-blue-600" />,
    LEGAL_NOTICE: <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />,
    EMAIL: <Mail className="w-3.5 h-3.5 text-indigo-600" />,
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-2xl text-white shadow-lg border border-indigo-800/60 overflow-hidden transition-all">
      {/* Header bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                Analyse Intelligente & Détection d'Anomalies
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-cyan-400/30">
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Détecte les dérives de règlement atypiques et génère un plan de recouvrement ciblé.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analyse Gemini en cours...' : analysis ? 'Réanalyser le portefeuille' : 'Lancer l’analyse IA'}</span>
          </button>

          {analysis && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-indigo-200 hover:text-white cursor-pointer transition-colors"
              title={expanded ? 'Réduire' : 'Déplier'}
              aria-label="Afficher ou masquer l'analyse"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="p-4 bg-rose-950/60 border-b border-rose-800 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!analysis && !analyzing && (
        <div className="p-5 text-center space-y-2">
          <p className="text-xs text-indigo-200 max-w-md mx-auto">
            Cliquez sur <strong>« Lancer l'analyse IA »</strong> pour évaluer l'impact des retards sur votre trésorerie, identifier les clients anormaux et recevoir les recommandations de recouvrement.
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-indigo-300 pt-1">
            <span className="flex items-center gap-1">• {overdueInvoices.length} factures échues</span>
            <span className="flex items-center gap-1">• {formatCurrency(totalOverdueAmount, currency)} à risque</span>
            <span className="flex items-center gap-1">• DSO actuel ~{estimatedDSO}j</span>
          </div>
        </div>
      )}

      {analyzing && (
        <div className="p-8 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs font-semibold text-cyan-200">
            Gemini analyse les patterns de règlement et calcule les anomalies de retards...
          </div>
        </div>
      )}

      {analysis && expanded && (
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 animate-in fade-in duration-200 text-xs">
          
          {/* Executive Summary & Risk Level Banner */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Diagnostic Global de Trésorerie
              </span>
              <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Niveau de risque global :</span>
              <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] border ${
                riskBadgeStyles[analysis.riskLevel as keyof typeof riskBadgeStyles] || 'bg-amber-100 text-amber-800'
              }`}>
                {analysis.riskLevel === 'CRITICAL' ? 'CRITIQUE' : analysis.riskLevel === 'HIGH' ? 'ÉLEVÉ' : 'MODÉRÉ'}
              </span>
            </div>
          </div>

          {/* Anomaly Detection Insights */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <AlertOctagon className="w-4 h-4 text-cyan-400" />
              <span>Anomalies et signaux d'alerte détectés</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {analysis.anomalyInsights.map((insight, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-xl bg-slate-800/60 border border-indigo-900/50 hover:border-indigo-700/50 transition-colors flex items-start gap-2.5 text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* High-Risk Clients & Targeted Recovery Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Clients à haut risque & actions de recouvrement recommandées</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('invoices', 'OVERDUE')}
                className="text-[11px] text-cyan-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Voir les factures échues <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.highRiskClients.map((client, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/90 space-y-2.5 flex flex-col justify-between hover:border-slate-500 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-white truncate">
                        {client.customerName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        riskBadgeStyles[client.riskScore as keyof typeof riskBadgeStyles] || 'bg-amber-100 text-amber-800'
                      }`}>
                        {client.riskScore}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs text-slate-300 font-mono pt-1 border-t border-slate-800">
                      <span>Dette : <strong className="text-rose-400 font-bold">{formatCurrency(client.overdueAmount, currency)}</strong></span>
                      <span className="text-slate-400">{client.maxDaysOverdue}j de retard</span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-normal bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                      {client.anomalyReason}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {channelIcons[client.recommendedChannel] || <Mail className="w-3.5 h-3.5" />}
                      <span>Action recommandée :</span>
                    </div>
                    <p className="text-[11px] text-emerald-300 font-medium">
                      {client.recommendedAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Plan */}
          <div className="p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-800/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Plan d'action prioritaire suggéré</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {analysis.recommendedActionPlan.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-indigo-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
