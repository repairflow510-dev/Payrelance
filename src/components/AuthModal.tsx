import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  Building2, ArrowRight, ShieldCheck, Mail, Lock, User, 
  Sparkles, CheckCircle2, Phone, X, KeyRound, MessageSquare, 
  Send, RefreshCw, AlertCircle, ArrowLeft, Eye, EyeOff
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

type AuthView = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'VERIFY_OTP' | 'RESET_SUCCESS';

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const { login, register, resetPasswordWithOtp, verifyOtpAndChangePassword, loginDemo } = useAuth();
  const [view, setView] = useState<AuthView>(defaultMode === 'login' ? 'LOGIN' : 'REGISTER');

  // Registration Form State
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('FCFA');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password / OTP State
  const [forgotTarget, setForgotTarget] = useState('');
  const [otpChannel, setOtpChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtpDisplay, setGeneratedOtpDisplay] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [otpSentNotice, setOtpSentNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Login submission
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Veuillez renseigner votre email et votre mot de passe.');
      }
      await login(email.trim(), password);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect.');
      } else {
        setError(err.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle Register submission
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation des champs demandés par l'utilisateur
    if (!lastName.trim()) {
      setError('Veuillez saisir votre nom de famille.');
      return;
    }
    if (!firstName.trim()) {
      setError('Veuillez saisir votre prénom.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!phone.trim()) {
      setError('Veuillez saisir votre numéro de téléphone (WhatsApp).');
      return;
    }
    if (!password || password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (!companyName.trim()) {
      setError('Veuillez renseigner le nom de votre entreprise.');
      return;
    }

    setLoading(true);
    try {
      await register(
        lastName.trim(),
        firstName.trim(),
        email.trim(),
        phone.trim(),
        password,
        companyName.trim(),
        currency
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Cette adresse email est déjà associée à un compte. Veuillez vous connecter.');
      } else {
        setError(err.message || 'Erreur lors de la création de votre compte.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Send OTP (Email or WhatsApp)
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOtpSentNotice(null);

    if (!forgotTarget.trim()) {
      setError(
        otpChannel === 'EMAIL'
          ? 'Veuillez saisir votre adresse email.'
          : 'Veuillez saisir votre numéro WhatsApp.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordWithOtp(forgotTarget.trim(), otpChannel);
      setGeneratedOtpDisplay(res.otpCode);
      setOtpSentNotice(
        otpChannel === 'EMAIL'
          ? `Code OTP envoyé par Email à ${res.destination}`
          : `Code OTP envoyé sur WhatsApp au ${res.destination}`
      );
      setView('VERIFY_OTP');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'envoi de l'OTP.");
    } finally {
      setLoading(false);
    }
  }

  // Verify OTP and set new password
  async function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!enteredOtp.trim() || enteredOtp.trim().length !== 6) {
      setError('Veuillez saisir le code OTP à 6 chiffres.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtpAndChangePassword(forgotTarget.trim(), enteredOtp.trim(), newPassword);
      setSuccessMsg('Votre mot de passe a été réinitialisé avec succès !');
      setView('RESET_SUCCESS');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Code OTP invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoFast() {
    setLoading(true);
    try {
      await loginDemo('Cabinet Expertise & Travaux SARL');
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white relative">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow">
                PR
              </div>
              <span className="font-extrabold tracking-tight text-xl">PayRelance</span>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-md bg-slate-800 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-bold">
            {view === 'LOGIN' && 'Connexion à votre espace B2B'}
            {view === 'REGISTER' && 'Créer votre compte entreprise'}
            {view === 'FORGOT_PASSWORD' && 'Mot de passe oublié (OTP)'}
            {view === 'VERIFY_OTP' && 'Vérification du code de sécurité'}
            {view === 'RESET_SUCCESS' && 'Mot de passe réinitialisé'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {view === 'LOGIN' && 'Accédez à votre portefeuille de factures et vos relances.'}
            {view === 'REGISTER' && 'Renseignez vos coordonnées complètes pour activer votre espace.'}
            {view === 'FORGOT_PASSWORD' && 'Recevez un code OTP temporaire par Email ou sur WhatsApp.'}
            {view === 'VERIFY_OTP' && 'Saisissez le code reçu et définissez votre nouveau mot de passe.'}
            {view === 'RESET_SUCCESS' && 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'}
          </p>
        </div>

        {/* Demo Fast Access Pill (only visible on login/register) */}
        {(view === 'LOGIN' || view === 'REGISTER') && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-amber-900 truncate">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Tester immédiatement sans inscription ?</span>
            </div>
            <button
              type="button"
              onClick={handleDemoFast}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
            >
              Accès Démo 1-clic
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ==================== VIEW 1: LOGIN ==================== */}
          {view === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Adresse Email Professionnelle
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@votre-entreprise.com"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('FORGOT_PASSWORD');
                      setError(null);
                      if (email) setForgotTarget(email);
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Afficher ou masquer mot de passe"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setView('REGISTER');
                    setError(null);
                  }}
                  className="text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors cursor-pointer"
                >
                  Pas encore de compte ? <span className="text-blue-600 font-bold">Inscrivez-vous gratuitement</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================== VIEW 2: REGISTER ==================== */}
          {view === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-3.5">
              {/* Nom & Prénom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nom <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ex: Diallo"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Prénom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: Ousmane"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Pro <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@societe.ci"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Téléphone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Nom Entreprise & Devise */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nom de l'Entreprise <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Société Générale d'Ingénierie"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Devise
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Mot de passe & Confirmer mot de passe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 caractères"
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmer mot de passe <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répéter mot de passe"
                      className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                {loading ? 'Création de votre entreprise...' : 'Créer mon compte entreprise'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setError(null);
                  }}
                  className="text-xs text-slate-600 hover:text-blue-600 font-medium transition-colors cursor-pointer"
                >
                  Déjà un compte ? <span className="text-blue-600 font-bold">Connectez-vous</span>
                </button>
              </div>
            </form>
          )}

          {/* ==================== VIEW 3: FORGOT PASSWORD (CHOICE EMAIL OR WHATSAPP) ==================== */}
          {view === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Choisissez le canal de réception de votre code OTP :
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('EMAIL');
                      setError(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      otpChannel === 'EMAIL'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>Par Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpChannel('WHATSAPP');
                      setError(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      otpChannel === 'WHATSAPP'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <span>Par WhatsApp</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {otpChannel === 'EMAIL' ? 'Adresse Email de votre compte' : 'Numéro de Téléphone WhatsApp'}
                </label>
                <div className="relative">
                  {otpChannel === 'EMAIL' ? (
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  ) : (
                    <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  )}
                  <input
                    type={otpChannel === 'EMAIL' ? 'email' : 'tel'}
                    required
                    value={forgotTarget}
                    onChange={(e) => setForgotTarget(e.target.value)}
                    placeholder={otpChannel === 'EMAIL' ? 'direction@votre-entreprise.com' : '+225 07 12 34 56 78'}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Un code sécurisé à 6 chiffres valable 15 minutes vous sera envoyé.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('LOGIN');
                    setError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Génération de l’OTP...' : 'Envoyer le code OTP'}
                  {!loading && <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}

          {/* ==================== VIEW 4: VERIFY OTP & RESET PASSWORD ==================== */}
          {view === 'VERIFY_OTP' && (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* Notification banner showing the generated OTP simulation */}
              {otpSentNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{otpSentNotice}</span>
                  </div>
                  {generatedOtpDisplay && (
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">Code de validation (Simulateur / Réception) :</span>
                      <span className="font-mono font-black text-emerald-700 text-sm tracking-widest bg-emerald-100/60 px-2 py-0.5 rounded">
                        {generatedOtpDisplay}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Code OTP à 6 chiffres reçu
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 849201"
                    className="w-full pl-9 pr-3 py-2 font-mono text-center tracking-widest text-base font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 caractères"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Confirmer mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Répéter mot de passe"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('FORGOT_PASSWORD');
                    setError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Validation du code...' : 'Valider et réinitialiser'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== VIEW 5: RESET SUCCESS ==================== */}
          {view === 'RESET_SUCCESS' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mot de passe mis à jour !</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                  Votre identité a été vérifiée via OTP. Vous pouvez à présent vous connecter en toute sécurité.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setView('LOGIN');
                  setPassword('');
                  setError(null);
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
              >
                Se connecter maintenant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
