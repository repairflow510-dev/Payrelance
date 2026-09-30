import { Channel, MessageTemplate, ReminderSequence } from '../types';

export interface SendMessageParams {
  channel: Channel;
  recipient: string; // email address or phone number
  subject: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  error?: string;
}

// Notification Provider Interface (abstracting Email, WhatsApp, etc.)
export interface INotificationProvider {
  send(params: SendMessageParams): Promise<SendMessageResult>;
}

export class EmailProvider implements INotificationProvider {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    // In production: connects to Resend, Postmark, or Sendgrid
    console.log(`[EmailProvider] Sending to ${params.recipient}:`, params.subject);
    // Simulate real transactional delivery
    await new Promise(r => setTimeout(r, 400));
    return {
      success: true,
      messageId: 'email_' + Math.random().toString(36).substring(2, 9),
      status: 'SENT',
    };
  }
}

export class WhatsAppProvider implements INotificationProvider {
  async send(params: SendMessageParams): Promise<SendMessageResult> {
    // In production: connects to Meta WhatsApp Business API Cloud API
    console.log(`[WhatsAppProvider] Sending WA to ${params.recipient}:`, params.content.substring(0, 40));
    await new Promise(r => setTimeout(r, 450));
    return {
      success: true,
      messageId: 'wa_' + Math.random().toString(36).substring(2, 9),
      status: 'SENT',
    };
  }
}

export const emailProvider = new EmailProvider();
export const whatsAppProvider = new WhatsAppProvider();

export const DEFAULT_TEMPLATES: Omit<MessageTemplate, 'id' | 'companyId'>[] = [
  {
    name: 'Rappel pré-échéance (J-7)',
    channel: 'EMAIL',
    subject: 'Rappel courtois : facture {{invoice_number}} à échéance proche',
    content: `Bonjour {{client_name}},

Nous vous rappelons que la facture n° {{invoice_number}} d'un montant de {{remaining_amount}} {{currency}} arrive à échéance le {{due_date}}.

Vous pouvez consulter et régler votre facture directement en ligne en cliquant ici :
{{payment_link}}

Si votre règlement a déjà été effectué entre temps, merci de ne pas tenir compte de ce message.

Cordialement,
{{account_manager}} — {{company_name}}`,
    isDefault: true,
  },
  {
    name: "Jour de l'échéance (J0)",
    channel: 'EMAIL',
    subject: 'Échéance aujourd’hui : facture {{invoice_number}} - {{company_name}}',
    content: `Bonjour {{client_name}},

Votre facture n° {{invoice_number}} d'un montant restant de {{remaining_amount}} {{currency}} arrive à échéance aujourd'hui le {{due_date}}.

Merci de bien vouloir procéder à son règlement :
{{payment_link}}

Pour toute question ou contestation, n'hésitez pas à répondre directement à cet email.

Bien cordialement,
{{account_manager}} — {{company_name}}`,
    isDefault: true,
  },
  {
    name: '1ère relance de retard (J+3)',
    channel: 'EMAIL',
    subject: 'Relance : facture {{invoice_number}} en retard de paiement ({{days_overdue}} jours)',
    content: `Bonjour {{client_name}},

Sauf erreur ou retard d'enregistrement bancaire, nous constatons que la facture n° {{invoice_number}} échue depuis {{days_overdue}} jours (le {{due_date}}) pour un montant de {{remaining_amount}} {{currency}} reste impayée.

Merci de régulariser cette situation au plus vite via ce lien sécurisé :
{{payment_link}}

Si un virement a déjà été émis, merci de nous transmettre l'avis d'opéré bancaire.

Cordialement,
Le service comptabilité — {{company_name}}`,
    isDefault: true,
  },
  {
    name: 'Rappel WhatsApp direct (J+7)',
    channel: 'WHATSAPP',
    subject: 'Rappel WhatsApp Facture {{invoice_number}}',
    content: `Bonjour {{client_name}}, c'est {{company_name}}. Nous constatons un retard de {{days_overdue}} jours sur la facture {{invoice_number}} pour {{remaining_amount}} {{currency}}. Vous pouvez la consulter et la régler rapidement ici : {{payment_link}}. Merci pour votre prompt retour !`,
    isDefault: true,
  },
  {
    name: 'Mise en demeure / Relance administrative (J+15)',
    channel: 'EMAIL',
    subject: 'URGENT : 2ème rappel - facture {{invoice_number}} impayée depuis {{days_overdue}} jours',
    content: `Monsieur / Madame,

Malgré nos précédentes relances, nous n'avons toujours pas reçu le paiement de la facture n° {{invoice_number}} d'un solde de {{remaining_amount}} {{currency}}, échue le {{due_date}}.

Ce retard anormal de {{days_overdue}} jours pénalise notre trésorerie.

Nous vous demandons de procéder immédiatement au règlement :
{{payment_link}}

Sans régularisation sous 48 heures, ce dossier sera transmis à notre service contentieux.

Le service recouvrement — {{company_name}}`,
    isDefault: true,
  },
];
