import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  Building2, Users, CreditCard, Shield, 
  Check, ArrowRight, Zap, RefreshCw, Smartphone, Mail
} from 'lucide-react';
import { PLAN_LIMITS, PLAN_PRICING, formatCurrency } from '../lib/constants';
import { doc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { PlanType, UserRole } from '../types';

export default function SettingsView() {
  const { currentCompany, currentUser, currentRole, refreshCompany } = useAuth();
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'TEAM' | 'BILLING' | 'CHANNELS'>('COMPANY');

  // Company fields
  const [companyName, setCompanyName] = useState(currentCompany?.name || '');
  const [managerName, setManagerName] = useState(currentCompany?.managerName || '');
  const [currency, setCurrency] = useState(currentCompany?.currency || 'FCFA');
  const [country, setCountry] = useState(currentCompany?.country || 'Côte d’Ivoire');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, COLLECTIONS.COMPANIES, currentCompany.id), {
        name: companyName,
        managerName,
        currency,
        country,
      });
      await refreshCompany();
      setFeedback('Paramètres de l’entreprise enregistrés.');
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitchPlan(plan: PlanType) {
    if (!currentCompany?.id) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.COMPANIES, currentCompany.id), { plan });
      await refreshCompany();
      setFeedback(`Formule modifiée avec succès : ${plan}`);
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Paramètres de l’Organisation</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurez votre entreprise multi-tenant, vos forfaits, vos intégrations et votre équipe.
          </p>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Tabs */}
      <div className="flex border-b border-slate-200 gap-4 sm:gap-6 text-xs font-semibold overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'COMPANY', label: 'Entreprise', icon: Building2 },
          { id: 'TEAM', label: 'Équipe & Permissions', icon: Users },
          { id: 'BILLING', label: 'Abonnement & Limites', icon: CreditCard },
          { id: 'CHANNELS', label: 'Intégrations', icon: Smartphone },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2.5 sm:pb-3 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          {feedback}
        </div>
      )}

      {/* Tab: Company */}
      {activeTab === 'COMPANY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 max-w-2xl">
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Raison sociale
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Devise principale
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="FCFA">FCFA (Franc CFA)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nom du Responsable Financier / DAF
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Team / RBAC */}
      {activeTab === 'TEAM' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Membres et Rôles de l'entreprise</h2>
            <p className="text-xs text-slate-500">
              Gestion des accès : OWNER (Dirigeant), ADMIN, ACCOUNTANT (Comptable), SALES (Commercial), VIEWER.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Rôle & Permissions</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">{currentUser?.name || 'Administrateur'}</td>
                  <td className="p-3 text-slate-600">{currentUser?.email}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                      {currentRole || 'OWNER'} (Accès Total)
                    </span>
                  </td>
                  <td className="p-3 text-emerald-600 font-semibold">Actif</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">Mireille Kouadio</td>
                  <td className="p-3 text-slate-600">m.kouadio@votre-entreprise.com</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                      ACCOUNTANT (Factures & Relances)
                    </span>
                  </td>
                  <td className="p-3 text-emerald-600 font-semibold">Actif</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Billing & Plans */}
      {activeTab === 'BILLING' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Formule actuelle : {currentCompany?.plan || 'PRO'}
            </h2>
            <p className="text-xs text-slate-500">
              Changez de formule en fonction du volume de factures et d'utilisateurs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {(['FREE', 'STARTER', 'PRO', 'BUSINESS'] as const).map((planKey) => {
                const isCurrent = currentCompany?.plan === planKey;
                const p = PLAN_PRICING[planKey];
                const limits = PLAN_LIMITS[planKey];

                return (
                  <div
                    key={planKey}
                    className={`rounded-2xl p-4 sm:p-5 border text-xs flex flex-col justify-between ${
                      isCurrent
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                            Actif
                          </span>
                        )}
                      </div>
                      <div className="font-extrabold text-base text-slate-900">
                        {p.priceEur === 0 ? 'Gratuit' : `${p.priceEur} €/mois`}
                      </div>

                      <ul className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
                        <li>• Jusqu'à {limits.maxInvoices.toLocaleString()} factures</li>
                        <li>• {limits.maxUsers} utilisateurs</li>
                        <li>• WhatsApp : {limits.whatsappEnabled ? 'Inclus' : 'Non'}</li>
                        <li>• Rapports DSO : {limits.reportsEnabled ? 'Inclus' : 'Non'}</li>
                      </ul>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleSwitchPlan(planKey)}
                        className="mt-4 w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Basculer vers {p.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Channels */}
      {activeTab === 'CHANNELS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Canaux d'envoi & Fournisseurs</h2>
            <p className="text-xs text-slate-500">
              Abstraction configurable pour les prestataires transactionnels.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Fournisseur Transactionnel Email</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Connecté
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Garantit un taux de délivrabilité maximal avec suivi des ouvertures et clics sur les liens de paiement.
              </p>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Fournisseur WhatsApp Business Cloud API</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  API Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Envoi de rappels instantanés avec liens de paiement intégrés directement sur le WhatsApp du client.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
