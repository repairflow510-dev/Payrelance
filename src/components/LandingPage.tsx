import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  CheckCircle2, ArrowRight, ShieldCheck, Zap, 
  MessageSquare, Clock, Users, BarChart, ChevronDown, 
  Play, DollarSign, RefreshCw, Send, Check
} from 'lucide-react';
import { PLAN_PRICING } from '../lib/constants';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onEnterDemo: () => void;
}

export default function LandingPage({ onOpenAuth, onEnterDemo }: LandingPageProps) {
  const [currencyView, setCurrencyView] = useState<'EUR' | 'FCFA'>('FCFA');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-lg shadow-blue-600/30">
              PR
            </div>
            <span className="font-extrabold text-white tracking-tight text-xl">PayRelance</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#probleme" className="hover:text-white transition-colors">Le Problème</a>
            <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#fonctionnement" className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="text-xs md:text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
            >
              Connexion
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5"
            >
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-semibold shadow-inner">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Assistant de recouvrement intelligent pour PME</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Récupérez vos factures impayées <br className="hidden md:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">
              automatiquement.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base md:text-lg text-slate-300 leading-relaxed">
            PayRelance automatise vos relances clients par email et WhatsApp afin de réduire vos délais de paiement (DSO) et vous faire gagner un temps précieux sans dégrader la relation commerciale.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onEnterDemo}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-300 text-slate-300" />
              Explorer la démo en direct
            </button>
          </div>

          <p className="text-xs text-slate-400 pt-1">
            ✓ Essai gratuit 20 factures • Sans carte bancaire • Prise en main en 2 minutes
          </p>

          {/* Interactive Mock Preview / Dashboard Card */}
          <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-4 md:p-6 text-left max-w-4xl mx-auto backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-slate-400">payrelance.app/dashboard</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                ● Relances automatiques actives
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="text-slate-400">Total facturé</div>
                <div className="text-base font-bold text-white mt-1">48 500 000 FCFA</div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="text-slate-400">Encaissé</div>
                <div className="text-base font-bold text-emerald-400 mt-1">39 200 000 FCFA</div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="text-slate-400">En retard</div>
                <div className="text-base font-bold text-rose-400 mt-1">6 800 000 FCFA</div>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="text-slate-400">À relancer ce jour</div>
                <div className="text-base font-bold text-blue-400 mt-1">17 factures</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Le Problème Section */}
      <section id="probleme" className="py-16 md:py-20 bg-slate-900/60 border-t border-slate-800 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Le problème n°1 qui étouffe la trésorerie des PME
            </h2>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
              Chaque mois, des millions de factures dorment en retard parce que les équipes n'ont ni le temps ni la méthode pour relancer méthodiquement.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Relances manuelles chronophages</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Appels téléphoniques gênants, recherche de qui a payé et emails oubliés : vos équipes perdent jusqu'à 8 heures par semaine sur un suivi manuel.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Tension de trésorerie inutile</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Le travail a été réalisé, le client est satisfait, mais le règlement tarde. Votre trésorerie en pâtit et retarde vos propres investissements.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Emails ignorés ou non lus</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Un simple email part souvent aux spams ou dans la boîte de comptabilité générale. L'absence de canal direct (WhatsApp) rallonge les délais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnement en 3 étapes */}
      <section id="fonctionnement" className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-14">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Simple & Efficace</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Comment fonctionne PayRelance en 3 étapes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-bold text-white">Importez vos factures</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Créez vos factures directement ou importez votre fichier CSV en 1 clic. Le système identifie automatiquement les dates d'échéance et les retards.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-base font-bold text-white">Activez votre séquence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rappel pré-échéance à J-7, relance courtoise à J0, relance WhatsApp à J+7 et notification administrative. Les messages partent automatiquement au bon moment.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-bold text-white">Encaissez et le moteur s'arrête</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dès qu'un virement, Mobile Money ou paiement en ligne est enregistré, le statut bascule et toutes les relances futures sont automatiquement coupées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnalités clés */}
      <section id="fonctionnalites" className="py-16 md:py-20 bg-slate-900/60 border-t border-slate-800 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Tout ce dont une PME a besoin pour être payée à temps
            </h2>
            <p className="text-sm text-slate-400">
              Conçu pour les directeurs financiers, dirigeants et comptables.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {[
              {
                title: 'Multi-canal Email & WhatsApp',
                desc: 'Combinez la solennité de l’email avec l’efficacité instantanée des messages WhatsApp Business.',
              },
              {
                title: 'Page de paiement sécurisée',
                desc: 'Chaque relance contient un lien sécurisé permettant au client de consulter et régler sa facture en 1 clic.',
              },
              {
                title: 'Gestion des paiements partiels',
                desc: 'Un client règle un acompte ? Les relances suivantes se recalculent instantanément sur le solde restant.',
              },
              {
                title: 'Gestion des litiges & promesses',
                desc: 'Suspendez automatiquement les relances en 1 clic lors d’un litige commercial ou enregistrez une promesse datée.',
              },
              {
                title: 'Tableau de bord & calcul DSO',
                desc: 'Visualisez vos créances en retard, vos délais moyens de paiement et le montant récupéré grâce aux relances.',
              },
              {
                title: 'Multi-utilisateurs & Rôles stricts',
                desc: 'Attribuez des droits spécifiques : Dirigeant, Comptable, Commercial ou simple consultation en lecture seule.',
              },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{f.title}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs Section */}
      <section id="tarifs" className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Transparence</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Des forfaits adaptés à la taille de votre PME</h2>
            <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                onClick={() => setCurrencyView('FCFA')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  currencyView === 'FCFA' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tarifs en FCFA
              </button>
              <button
                onClick={() => setCurrencyView('EUR')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  currencyView === 'EUR' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tarifs en Euro (€)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {(['FREE', 'STARTER', 'PRO', 'BUSINESS'] as const).map((planKey) => {
              const p = PLAN_PRICING[planKey];
              const isPopular = planKey === 'PRO';
              const priceText = currencyView === 'FCFA' 
                ? (p.priceFcfa === 0 ? 'Gratuit' : `${p.priceFcfa.toLocaleString()} FCFA/m`)
                : (p.priceEur === 0 ? 'Gratuit' : `${p.priceEur} €/mois`);

              return (
                <div
                  key={planKey}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                    isPopular
                      ? 'bg-gradient-to-b from-blue-900/60 to-slate-900 border-2 border-blue-500 shadow-xl shadow-blue-500/10 relative'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">
                      Recommandé
                    </span>
                  )}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{p.name}</h3>
                      <div className="text-xl md:text-2xl font-extrabold text-white mt-1">{priceText}</div>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{p.desc}</p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
                      {planKey === 'FREE' && (
                        <>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Jusqu'à 20 factures</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> 1 utilisateur</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Relances Email</li>
                        </>
                      )}
                      {planKey === 'STARTER' && (
                        <>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Jusqu'à 200 factures</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> 3 utilisateurs</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Email + WhatsApp</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Automatisations standard</li>
                        </>
                      )}
                      {planKey === 'PRO' && (
                        <>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Jusqu'à 1 000 factures</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> 10 utilisateurs</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Relances avancées WhatsApp</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Rapports de trésorerie & DSO</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Support prioritaire</li>
                        </>
                      )}
                      {planKey === 'BUSINESS' && (
                        <>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Factures illimitées</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Utilisateurs illimités</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> API & Webhooks</li>
                          <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-400" /> Gestionnaire de compte dédié</li>
                        </>
                      )}
                    </ul>
                  </div>

                  <button
                    onClick={() => onOpenAuth('register')}
                    className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    Choisir cette formule
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-20 bg-slate-900/40 border-t border-slate-800 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Questions fréquentes</h2>
            <p className="text-xs text-slate-400">Tout ce que vous devez savoir avant de démarrer.</p>
          </div>

          {[
            {
              q: "Les relances risquent-elles de braquer mes clients ?",
              a: "Non, absolument pas. Les premières étapes (J-7 et J0) sont formulées avec une grande courtoisie en rappel d'échéance. Le ton se durcit uniquement après plusieurs jours de silence, évitant les maladresses tout en préservant la trésorerie.",
            },
            {
              q: "Que se passe-t-il si un client effectue un virement entre-temps ?",
              a: "Dès que vous enregistrez le règlement (total ou partiel) sur PayRelance, toutes les relances programmées sur cette facture s'interrompent immédiatement grâce à notre vérification d'idempotence.",
            },
            {
              q: "Puis-je utiliser PayRelance en zone FCFA ?",
              a: "Oui, PayRelance a été spécialement conçu pour gérer nativement le Franc CFA (XOF / XAF) ainsi que l'Euro et le Dollar, avec intégration des moyens de paiement courants (virement, carte et Mobile Money).",
            },
            {
              q: "Comment importer mes factures existantes ?",
              a: "Vous pouvez importer un fichier CSV en quelques clics via notre module d'import intégré avec validation et prévisualisation automatique des colonnes.",
            },
          ].map((item, idx) => (
            <div key={idx} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-white hover:text-blue-400 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-blue-400' : 'text-slate-500'}`} />
              </button>
              {openFaq === idx && (
                <div className="p-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/40">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-6 text-center bg-gradient-to-b from-slate-950 to-blue-950/60 border-t border-slate-800">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            Prêt à accélérer vos encaissements dès aujourd'hui ?
          </h2>
          <p className="text-sm md:text-base text-slate-300">
            Rejoignez les PME qui automatisent leur suivi financier et récupèrent leur argent sans friction.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center gap-2"
            >
              Créer mon compte gratuit <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onEnterDemo}
              className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700"
            >
              Tester la démo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              PR
            </div>
            <span className="font-bold text-slate-300">PayRelance SaaS</span>
          </div>
          <div>© {new Date().getFullYear()} PayRelance. Tous droits réservés. Plateforme B2B de recouvrement.</div>
        </div>
      </footer>
    </div>
  );
}
