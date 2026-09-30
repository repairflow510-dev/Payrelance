import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  Building2, Users, FileText, CheckCircle2, ArrowRight, 
  Sparkles, DollarSign, ShieldAlert, UploadCloud
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OnboardingProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingProps) {
  const { currentCompany, refreshCompany } = useAuth();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState(currentCompany?.name || 'Cabinet Conseil & Ingénierie');
  const [country, setCountry] = useState(currentCompany?.country || 'Côte d’Ivoire');
  const [currency, setCurrency] = useState(currentCompany?.currency || 'FCFA');
  const [managerName, setManagerName] = useState(currentCompany?.managerName || 'Responsable Administratif & Financier');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!currentCompany) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'companies', currentCompany.id), {
        name: companyName,
        country,
        currency,
        managerName,
      });
      await refreshCompany();
      onComplete();
    } catch (e) {
      console.error(e);
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-auto">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              Assistant de Démarrage PayRelance
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Configurez votre entreprise</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">
            Étape {step} sur 4 — Démarrez le recouvrement en moins de 2 minutes.
          </p>
          {/* Progress bar */}
          <div className="w-full bg-blue-950/40 h-1.5 rounded-full mt-3 sm:mt-4 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {step === 1 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Identité de l'entreprise</h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Ces informations apparaîtront sur vos rappels clients, courriels de relance et liens de paiement.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Raison sociale / Nom commercial
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  placeholder="Ex: Entreprise de BTP & Services SARL"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pays d'établissement
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Côte d’Ivoire">Côte d’Ivoire</option>
                  <option value="Sénégal">Sénégal</option>
                  <option value="Cameroun">Cameroun</option>
                  <option value="France">France</option>
                  <option value="Bénin">Bénin</option>
                  <option value="Mali">Mali</option>
                  <option value="Togo">Togo</option>
                  <option value="Gabon">Gabon</option>
                  <option value="Belgique">Belgique</option>
                  <option value="Suisse">Suisse</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Devise et responsable</h3>
              <p className="text-xs sm:text-sm text-slate-600">
                La devise est utilisée pour tous les calculs de créances et les liens de paiement publics.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Devise principale
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { code: 'FCFA', label: 'Franc CFA (XOF/XAF)' },
                    { code: 'EUR', label: 'Euro (€)' },
                    { code: 'USD', label: 'Dollar ($)' },
                  ].map((cur) => (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => setCurrency(cur.code)}
                      className={`p-2.5 sm:p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        currency === cur.code
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-semibold">{cur.code}</div>
                      <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{cur.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Responsable Recouvrement / DAF
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  placeholder="Ex: Fatouma Traoré (Responsable Facturation)"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 sm:w-6 h-5 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Séquence de relance standard</h3>
              <p className="text-xs sm:text-sm text-slate-600">
                La séquence PME standard s'adaptera au cycle de vie de chaque facture :
              </p>
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-8 py-0.5 text-center bg-blue-100 text-blue-800 rounded font-semibold">J-7</span>
                  <span>Courriel pré-échéance aimable</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-8 py-0.5 text-center bg-blue-100 text-blue-800 rounded font-semibold">J0</span>
                  <span>Avis le jour de l'échéance</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-8 py-0.5 text-center bg-amber-100 text-amber-800 rounded font-semibold">J+3</span>
                  <span>1ère relance de retard par Email</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-8 py-0.5 text-center bg-emerald-100 text-emerald-800 rounded font-semibold">J+7</span>
                  <span>Relance directe WhatsApp Business</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <span className="w-8 py-0.5 text-center bg-rose-100 text-rose-800 rounded font-semibold">J+15</span>
                  <span>Relance administrative & pré-contentieux</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-3 sm:space-y-4 py-2 sm:py-4">
              <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 sm:w-10 h-8 sm:h-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Configuration terminée !</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Des données de démonstration concrètes (clients, factures en retard, séquences) sont préchargées. Vous pouvez immédiatement tester l'envoi de relances ou importer votre propre fichier CSV.
              </p>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Retour
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-4 sm:px-5 py-2.5 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              className="px-5 sm:px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {saving ? 'Finalisation...' : 'Accéder au Dashboard'} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
