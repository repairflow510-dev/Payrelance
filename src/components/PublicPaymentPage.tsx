import React, { useEffect, useState } from 'react';
import { Invoice, Company } from '../types';
import { doc, getDoc, updateDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { formatCurrency } from '../lib/constants';
import { 
  ShieldCheck, CreditCard, CheckCircle2, Building, 
  Calendar, FileText, ArrowRight, Smartphone, AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublicPaymentPageProps {
  token: string;
  onNavigateHome: () => void;
}

export default function PublicPaymentPage({ token, onNavigateHome }: PublicPaymentPageProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER'>('MOBILE_MONEY');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  useEffect(() => {
    async function loadPublicInvoice() {
      setLoading(true);
      try {
        const { getDocs, query, where } = await import('firebase/firestore');
        const q = query(collection(db, COLLECTIONS.INVOICES), where('publicToken', '==', token));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const invData = snap.docs[0].data() as Invoice;
          setInvoice(invData);
          setPaymentAmount(invData.remainingAmount);

          const compSnap = await getDoc(doc(db, COLLECTIONS.COMPANIES, invData.companyId));
          if (compSnap.exists()) {
            setCompany(compSnap.data() as Company);
          }
        }
      } catch (err) {
        console.error('Failed to load invoice by token:', err);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      loadPublicInvoice();
    }
  }, [token]);

  async function handleCompletePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !company) return;
    setProcessing(true);

    try {
      await new Promise((r) => setTimeout(r, 1200));

      const payRef = doc(collection(db, COLLECTIONS.PAYMENTS));
      const newPaidTotal = invoice.paidAmount + Number(paymentAmount);
      const newRemaining = Math.max(0, invoice.amount - newPaidTotal);
      const newStatus = newRemaining === 0 ? 'PAID' : 'PARTIALLY_PAID';

      await setDoc(payRef, {
        id: payRef.id,
        companyId: company.id,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: Number(paymentAmount),
        currency: invoice.currency,
        paymentDate: new Date().toISOString().split('T')[0],
        method: paymentMethod,
        reference: 'ONLINE-' + Math.floor(100000 + Math.random() * 900000),
        notes: `Règlement direct en ligne par ${payerName || 'Client'} (${payerPhone})`,
        createdBy: 'Portail Client Public',
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, COLLECTIONS.INVOICES, invoice.id), {
        paidAmount: newPaidTotal,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
      await setDoc(notifRef, {
        id: notifRef.id,
        companyId: company.id,
        title: 'Encaissement en ligne direct !',
        message: `${formatCurrency(paymentAmount, invoice.currency)} a été réglé en ligne pour la facture ${invoice.invoiceNumber}. Nouveau solde : ${formatCurrency(newRemaining, invoice.currency)}.`,
        type: 'PAYMENT',
        read: false,
        createdAt: new Date().toISOString(),
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setPaidSuccess(true);
      setInvoice({
        ...invoice,
        paidAmount: newPaidTotal,
        remainingAmount: newRemaining,
        status: newStatus,
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors du traitement du paiement en ligne.');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Chargement sécurisé de la facture...</span>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Facture introuvable ou expirée</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Le lien de paiement utilisé est invalide ou ne correspond à aucune facture active.
          </p>
          <button
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Brand Banner */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shrink-0">
              PR
            </div>
            <span className="font-bold text-white tracking-tight text-base sm:text-lg">PayRelance Direct</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 sm:px-3 py-1 rounded-full">
            <ShieldCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Paiement Sécurisé SSL 256-bit</span>
            <span className="sm:hidden">Sécurisé SSL</span>
          </div>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-3 sm:p-6 md:p-8 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden w-full">
          
          {paidSuccess ? (
            <div className="p-6 sm:p-12 text-center space-y-4">
              <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 sm:w-12 h-10 sm:h-12" />
              </div>
              <h2 className="text-xl sm:text-3xl font-bold text-white">Règlement validé avec succès !</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Votre paiement a été transmis instantanément à <strong className="text-white">{company?.name}</strong>. Une quittance de règlement a été émise et les relances ont été désactivées.
              </p>
              <div className="pt-2 sm:pt-4">
                <button
                  onClick={() => setPaidSuccess(false)}
                  className="px-5 sm:px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Consulter les détails de la facture
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              
              {/* Left Column: Invoice recap */}
              <div className="p-4 sm:p-6 md:p-8 md:col-span-2 bg-slate-900/50 space-y-4 sm:space-y-6">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Émetteur</span>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{company?.name}</div>
                  <div className="text-xs text-slate-400">{company?.country}</div>
                </div>

                <div className="space-y-2 py-3 border-y border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">N° facture :</span>
                    <span className="font-mono font-semibold text-white">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Émission :</span>
                    <span className="text-white">{invoice.issueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Échéance :</span>
                    <span className="font-semibold text-rose-400">{invoice.dueDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client :</span>
                    <span className="text-white truncate max-w-[130px]">{invoice.customerName}</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 rounded-2xl p-3.5 sm:p-4 border border-slate-700/50">
                  <div className="text-[11px] sm:text-xs text-slate-400">Montant total facture</div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-300">{formatCurrency(invoice.amount, invoice.currency)}</div>
                  
                  {invoice.paidAmount > 0 && (
                    <div className="text-xs text-emerald-400 mt-1">
                      Déjà réglé : {formatCurrency(invoice.paidAmount, invoice.currency)}
                    </div>
                  )}

                  <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-700/60">
                    <div className="text-[10px] sm:text-xs font-semibold text-rose-300 uppercase">Reste à payer</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-white mt-0.5 truncate">
                      {formatCurrency(invoice.remainingAmount, invoice.currency)}
                    </div>
                  </div>
                </div>

                {invoice.status === 'PAID' && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Cette facture est déjà intégralement payée.</span>
                  </div>
                )}
              </div>

              {/* Right Column: Checkout form */}
              <div className="p-4 sm:p-6 md:p-8 md:col-span-3">
                {invoice.remainingAmount <= 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    <h3 className="text-lg font-bold text-white">Facture soldée</h3>
                    <p className="text-xs text-slate-400">Aucun règlement supplémentaire n'est requis sur cette facture.</p>
                  </div>
                ) : (
                  <form onSubmit={handleCompletePayment} className="space-y-3 sm:space-y-4">
                    <h3 className="text-sm sm:text-base font-bold text-white">Mode de règlement</h3>

                    {/* Method selector responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'MOBILE_MONEY', name: 'Mobile Money', icon: Smartphone, desc: 'Wave, Orange, MTN' },
                        { id: 'CARD', name: 'Carte bancaire', icon: CreditCard, desc: 'Visa, Mastercard' },
                        { id: 'BANK_TRANSFER', name: 'Virement', icon: Building, desc: 'RIB direct' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPaymentMethod(item.id as any)}
                          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            paymentMethod === item.id
                              ? 'border-blue-500 bg-blue-600/10 text-white shadow-xs'
                              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <item.icon className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 mb-1" />
                          <div className="text-xs font-semibold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>

                    {/* Amount to pay */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <label className="font-semibold text-slate-300">Montant ({invoice.currency})</label>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(invoice.remainingAmount)}
                          className="text-blue-400 hover:underline cursor-pointer"
                        >
                          Tout régler
                        </button>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={invoice.remainingAmount}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-mono text-base sm:text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Contact fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Votre Nom / Société</label>
                        <input
                          type="text"
                          required
                          value={payerName}
                          onChange={(e) => setPayerName(e.target.value)}
                          placeholder="Ex: Jean Dupont"
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Numéro Mobile / Reçu</label>
                        <input
                          type="tel"
                          required
                          value={payerPhone}
                          onChange={(e) => setPayerPhone(e.target.value)}
                          placeholder="+225 07..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={processing || paymentAmount <= 0}
                      className="w-full py-3 sm:py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {processing ? 'Validation...' : `Régler ${formatCurrency(paymentAmount, invoice.currency)}`}
                      {!processing && <ArrowRight className="w-4 h-4" />}
                    </button>

                    <p className="text-[10px] sm:text-[11px] text-center text-slate-500 mt-2">
                      Transaction chiffrée de bout en bout • Aucune coordonnée bancaire n'est stockée en clair.
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-3 sm:py-4 text-[11px] sm:text-xs text-slate-600 border-t border-slate-900">
        Propulsé par <strong className="text-slate-400">PayRelance</strong> — SaaS de recouvrement et relances clients B2B.
      </footer>
    </div>
  );
}
