# PayRelance — SaaS B2B de Recouvrement & Relance Automatique des Factures Impayées pour PME

> « Automatisez vos relances et récupérez votre argent sans passer vos journées à appeler vos clients. »

---

## 1. Présentation & Architecture

**PayRelance** est une plateforme SaaS conçue pour les PME afin de centraliser leurs factures clients, détecter automatiquement les retards de paiement (DSO) et déclencher des séquences de relance omnicanales (Email et WhatsApp Business).

### Architecture Multi-Tenant Stricte
- **Multi-tenant par conception** : Toutes les entités (`customers`, `invoices`, `payments`, `reminder_sequences`, `message_templates`, `payment_promises`, `disputes`) sont cloisonnées de façon stricte sous un `companyId`.
- **RBAC (Role-Based Access Control)** : Définition des rôles `OWNER`, `ADMIN`, `ACCOUNTANT`, `SALES`, `VIEWER`.
- **Moteur d'automatisation idempotent** : Avant chaque envoi, le moteur vérifie que la facture n'est ni payée, ni en litige, ni annulée, et qu'une même étape n'a jamais été transmise auparavant.
- **Support des devises internationales** : Gestion native du Franc CFA (FCFA / XOF / XAF), de l'Euro (€) et du Dollar ($).

---

## 2. Fonctionnalités Implémentées

1. **Authentification & Multi-Tenancy** : Inscription entreprise, connexion, session isolée par tenant, gestion d'équipe et de rôles.
2. **Onboarding Guidé** : Assistant en 4 étapes pour configurer la devise, le responsable financier et les séquences.
3. **Tableau de Bord & KPIs** :
   - Total facturé, total encaissé, créances en retard, montant récupéré via relances.
   - Boîte « Actions prioritaires requises » : alertes en 1-clic pour les factures échues, promesses imminentes et litiges.
4. **Gestion des Clients (Fiche Client Complète)** :
   - Coordonnées, contacts WhatsApp et email, statut d'impayé en temps réel.
   - Historique des factures associées, promesses et paiements enregistrés.
5. **Gestion des Factures** :
   - Statuts réels : `DRAFT`, `SENT`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `DISPUTED`, `CANCELLED`.
   - Calcul automatique du solde restant : `remainingAmount = amount - paidAmount`.
6. **Import CSV Robuste** :
   - Analyse, validation ligne par ligne, prévisualisation, gestion d'erreurs et création automatique des clients et factures.
7. **Paiements & Paiements Partiels** :
   - Recalcul immédiat du solde restant. Les relances futures s'ajustent uniquement sur le reliquat.
8. **Portail de Paiement Public Sans Compte (`/#/pay/[publicToken]`)** :
   - Chaque facture dispose d'un lien sécurisé permettant au client de consulter son solde et de payer en ligne par Mobile Money (Wave, Orange), Carte Bancaire ou Virement.
9. **Promesses de Paiement & Litiges** :
   - Enregistrement des engagements clients datés.
   - Mise en litige avec motif (`INCORRECT_AMOUNT`, `SERVICE_NOT_DELIVERED`, etc.) entraînant la coupure immédiate et automatique de toutes les relances.
10. **Moteur de Relance Omnicanal** :
    - Séquences configurables (J-7, J0, J+3, J+7, J+15, J+30).
    - Abstraction `NotificationProvider` (Email & WhatsApp Business).
    - Remplacement dynamique des variables : `{{client_name}}`, `{{remaining_amount}}`, `{{payment_link}}`, `{{due_date}}`, `{{days_overdue}}`.
11. **Rapports Financiers & DSO** :
    - Calcul du Days Sales Outstanding, détection des clients à risque persistant, export CSV.
12. **Abonnements & Limites par Plan** :
    - `FREE`, `STARTER`, `PRO`, `BUSINESS` avec vérification des quotas.

---

## 3. Variables d'Environnement

Consultez le fichier `.env.example` pour les variables de production :

\`\`\`env
# Database & Auth
DATABASE_URL=
AUTH_SECRET=

# Providers
EMAIL_PROVIDER=resend
EMAIL_API_KEY=
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_API_TOKEN=

# Public App URL
APP_URL=https://payrelance.app
\`\`\`

---

## 4. Lancement et Commandes

\`\`\`bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement (Port 3000)
npm run dev

# Vérification du typage
npm run lint

# Compilation pour production
npm run build
\`\`\`
