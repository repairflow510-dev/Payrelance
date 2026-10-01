import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  Building2, Users, CreditCard, Shield, 
  Check, ArrowRight, Zap, RefreshCw, Smartphone, Mail,
  UserPlus, Trash2, Edit2, ShieldAlert, Phone, UserCheck, X, AlertCircle
} from 'lucide-react';
import { PLAN_LIMITS, PLAN_PRICING, formatCurrency } from '../lib/constants';
import { doc, updateDoc, collection, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { PlanType, UserRole, Membership } from '../types';

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

  // Admin Team Management State
  const [members, setMembers] = useState<Membership[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('ACCOUNTANT');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Real-time Firestore sync for Memberships of the current company
  useEffect(() => {
    if (!currentCompany?.id) return;
    const q = query(
      collection(db, COLLECTIONS.MEMBERSHIPS),
      where('companyId', '==', currentCompany.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Membership);
      // Ensure at least the current user or owner is visible if collection is bootstrapping
      if (list.length === 0 && currentUser) {
        setMembers([
          {
            id: 'mem_default_owner',
            userId: currentUser.id,
            companyId: currentCompany.id,
            role: currentRole || 'OWNER',
            userName: currentUser.name,
            userEmail: currentUser.email,
            userPhone: currentUser.phone || '+225 07 00 00 00 00',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        setMembers(list);
      }
    });

    return () => unsubscribe();
  }, [currentCompany?.id, currentUser?.id]);

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

  // Admin: Invite / Add new User
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany?.id) return;
    setInviteError(null);

    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Veuillez renseigner au moins le nom et l’email.');
      return;
    }

    setInviteLoading(true);
    try {
      const newMemId = 'mem_' + Math.random().toString(36).substring(2, 10);
      const newMember: Membership = {
        id: newMemId,
        userId: 'usr_' + Math.random().toString(36).substring(2, 10),
        companyId: currentCompany.id,
        role: inviteRole,
        userName: inviteName.trim(),
        userEmail: inviteEmail.trim(),
        userPhone: invitePhone.trim() || undefined,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, COLLECTIONS.MEMBERSHIPS, newMemId), newMember);
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      setFeedback(`Utilisateur ${newMember.userName} ajouté avec succès !`);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error(err);
      setInviteError(err.message || "Erreur lors de l'ajout de l'utilisateur.");
    } finally {
      setInviteLoading(false);
    }
  }

  // Admin: Update user role
  async function handleUpdateRole(memberId: string, newRole: UserRole) {
    try {
      await updateDoc(doc(db, COLLECTIONS.MEMBERSHIPS, memberId), {
        role: newRole,
      });
      setFeedback('Rôle mis à jour.');
      setTimeout(() => setFeedback(null), 2000);
    } catch (e) {
      console.error('Error updating role:', e);
    }
  }

  // Admin: Delete / Remove user from company
  async function handleDeleteMember(member: Membership) {
    if (member.role === 'OWNER') {
      alert("Impossible de supprimer le dirigeant propriétaire principal de l'entreprise.");
      return;
    }
    if (!confirm(`Supprimer l'accès de l'utilisateur ${member.userName} ?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, COLLECTIONS.MEMBERSHIPS, member.id));
      setFeedback(`Utilisateur ${member.userName} retiré de l'équipe.`);
      setTimeout(() => setFeedback(null), 2500);
    } catch (e) {
      console.error('Error deleting member:', e);
    }
  }

  const isAdminOrOwner = currentRole === 'OWNER' || currentRole === 'ADMIN';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
          Paramètres & Organisation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configuration de votre entreprise, gestion des utilisateurs, canaux de relance et abonnement.
        </p>

        {feedback && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('COMPANY')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'COMPANY'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Profil Entreprise
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TEAM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TEAM'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Utilisateurs & Équipe ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BILLING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'BILLING'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Abonnement & Forfaits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CHANNELS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CHANNELS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Canaux & Intégrations
          </button>
        </div>
      </div>

      {/* Tab: Company Profile */}
      {activeTab === 'COMPANY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 max-w-2xl">
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Raison Sociale de l'Entreprise
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Pays d'Implantation
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
                  Devise Comptable
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Team / RBAC - Admin Users Management */}
      {activeTab === 'TEAM' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Gestion des Utilisateurs & Rôles</h2>
              <p className="text-xs text-slate-500">
                Gérez les permissions de votre équipe pour le suivi des factures et l'envoi des relances.
              </p>
            </div>

            {isAdminOrOwner && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ajouter un utilisateur</span>
              </button>
            )}
          </div>

          {/* Members Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Email & Téléphone</th>
                  <th className="p-3">Rôle Attribué</th>
                  <th className="p-3">Statut</th>
                  {isAdminOrOwner && <th className="p-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((mem) => {
                  const isCurrent = mem.userId === currentUser?.id || mem.userEmail === currentUser?.email;
                  return (
                    <tr key={mem.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                            {mem.userName ? mem.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{mem.userName || 'Sans nom'}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-bold rounded">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Inscrit le {new Date(mem.createdAt).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-slate-700 font-medium">{mem.userEmail}</div>
                        {mem.userPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{mem.userPhone}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {isAdminOrOwner && mem.role !== 'OWNER' ? (
                          <select
                            value={mem.role}
                            onChange={(e) => handleUpdateRole(mem.id, e.target.value as UserRole)}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          >
                            <option value="ADMIN">ADMIN (Administrateur)</option>
                            <option value="ACCOUNTANT">ACCOUNTANT (Comptable)</option>
                            <option value="SALES">SALES (Commercial)</option>
                            <option value="VIEWER">VIEWER (Lecteur seul)</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            mem.role === 'OWNER' 
                              ? 'bg-blue-100 text-blue-800' 
                              : mem.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {mem.role} {mem.role === 'OWNER' && '(Propriétaire)'}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {mem.status || 'Actif'}
                        </span>
                      </td>

                      {isAdminOrOwner && (
                        <td className="p-3 text-right">
                          {mem.role !== 'OWNER' ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(mem)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Supprimer l'accès"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Protégé</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Billing & Plans */}
      {activeTab === 'BILLING' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-3xl">
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

      {/* Modal: Invite / Add Team Member */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Ajouter un collaborateur</h3>
                  <p className="text-[11px] text-slate-400">Attribuez un rôle et des droits d'accès</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-4 sm:p-6 space-y-3.5">
              {inviteError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nom et Prénom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Kouame Koffi"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Professionnel <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="koffi@votre-entreprise.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Téléphone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+225 05 00 00 00 00"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Rôle dans l'entreprise
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white font-medium"
                >
                  <option value="ACCOUNTANT">ACCOUNTANT (Comptable / Gestion des relances)</option>
                  <option value="ADMIN">ADMIN (Administrateur / Gestion des utilisateurs & paramètres)</option>
                  <option value="SALES">SALES (Commercial / Consultation & Encaissement)</option>
                  <option value="VIEWER">VIEWER (Lecture seule)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {inviteLoading ? 'Ajout en cours...' : 'Ajouter le collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
