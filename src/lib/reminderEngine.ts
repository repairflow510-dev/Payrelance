import { 
  collection, query, where, getDocs, doc, setDoc, updateDoc, 
  deleteDoc, addDoc, getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './db';
import { 
  Invoice, Customer, ReminderSequence, ReminderStep, 
  MessageTemplate, MessageLog, AuditLog, AppNotification, Channel 
} from '../types';
import { calculateDaysOverdue, renderTemplate } from './constants';
import { emailProvider, whatsAppProvider } from './notifications';

export interface ReminderJobResult {
  invoicesEvaluated: number;
  remindersTriggered: number;
  remindersSent: number;
  details: {
    invoiceNumber: string;
    customerName: string;
    stepTitle: string;
    channel: Channel;
    status: string;
  }[];
}

/**
 * Core Reminder Automation Engine:
 * Evaluates active sequences, calculates overdue delays, applies strict condition guards:
 * - Invoice must NOT be PAID (remainingAmount > 0)
 * - Invoice must NOT be CANCELLED or DISPUTED
 * - Customer must have a valid destination for the given channel
 * - Step must not have already been sent for this invoice (idempotency check)
 */
export async function runReminderEngine(companyId: string, companyName: string, managerName: string): Promise<ReminderJobResult> {
  const result: ReminderJobResult = {
    invoicesEvaluated: 0,
    remindersTriggered: 0,
    remindersSent: 0,
    details: [],
  };

  // 1. Fetch active sequences for company
  const seqsSnap = await getDocs(query(
    collection(db, COLLECTIONS.SEQUENCES),
    where('companyId', '==', companyId),
    where('isActive', '==', true)
  ));

  if (seqsSnap.empty) {
    return result;
  }

  const sequences = seqsSnap.docs.map(d => d.data() as ReminderSequence);
  const defaultSeq = sequences.find(s => s.isDefault) || sequences[0];

  // 2. Fetch templates mapping
  const tplsSnap = await getDocs(query(
    collection(db, COLLECTIONS.TEMPLATES),
    where('companyId', '==', companyId)
  ));
  const templateMap = new Map<string, MessageTemplate>();
  tplsSnap.forEach(d => {
    const t = d.data() as MessageTemplate;
    templateMap.set(t.id, t);
  });

  // 3. Fetch all active invoices (unpaid, not cancelled, not disputed)
  const invoicesSnap = await getDocs(query(
    collection(db, COLLECTIONS.INVOICES),
    where('companyId', '==', companyId)
  ));

  // 4. Fetch customers mapping
  const customersSnap = await getDocs(query(
    collection(db, COLLECTIONS.CUSTOMERS),
    where('companyId', '==', companyId)
  ));
  const customerMap = new Map<string, Customer>();
  customersSnap.forEach(d => {
    const c = d.data() as Customer;
    customerMap.set(c.id, c);
  });

  // 5. Fetch previous message logs to guarantee idempotency
  const logsSnap = await getDocs(query(
    collection(db, COLLECTIONS.MESSAGES),
    where('companyId', '==', companyId)
  ));
  const sentStepKeySet = new Set<string>(); // `${invoiceId}_${stepOffset}`
  logsSnap.forEach(d => {
    const l = d.data() as MessageLog;
    if (l.stepOffset !== undefined) {
      sentStepKeySet.add(`${l.invoiceId}_${l.stepOffset}`);
    }
  });

  // Evaluate each invoice
  for (const invDoc of invoicesSnap.docs) {
    const inv = invDoc.data() as Invoice;
    result.invoicesEvaluated++;

    // Strict Business Conditions Check:
    if (inv.status === 'PAID' || inv.remainingAmount <= 0) continue;
    if (inv.status === 'CANCELLED' || inv.status === 'DISPUTED') continue;

    const daysOverdue = calculateDaysOverdue(inv.dueDate);
    const customer = customerMap.get(inv.customerId);
    if (!customer) continue;

    // Use specific invoice sequence if defined, else company default sequence
    const seq = inv.sequenceId ? sequences.find(s => s.id === inv.sequenceId) || defaultSeq : defaultSeq;
    if (!seq || !seq.steps) continue;

    // Check which step qualifies:
    // A step qualifies if daysOverdue >= step.dayOffset and hasn't been sent yet
    for (const step of seq.steps) {
      const stepKey = `${inv.id}_${step.dayOffset}`;
      if (daysOverdue >= step.dayOffset && !sentStepKeySet.has(stepKey)) {
        // Find corresponding template
        const tpl = templateMap.get(step.templateId);
        if (!tpl) continue;

        const recipient = step.channel === 'WHATSAPP' 
          ? (customer.whatsapp || customer.phone || '') 
          : customer.email;

        if (!recipient) {
          result.details.push({
            invoiceNumber: inv.invoiceNumber,
            customerName: customer.name,
            stepTitle: step.actionTitle,
            channel: step.channel,
            status: 'Échec : Coordonnées manquantes',
          });
          continue;
        }

        result.remindersTriggered++;

        // Render template variables
        const paymentLink = `${window.location.origin}/#/pay/${inv.publicToken}`;
        const renderedSubject = renderTemplate(tpl.subject, {
          client_name: customer.name,
          company_name: companyName,
          invoice_number: inv.invoiceNumber,
          amount: inv.amount,
          currency: inv.currency,
          due_date: inv.dueDate,
          days_overdue: Math.max(0, daysOverdue),
          remaining_amount: inv.remainingAmount,
          payment_link: paymentLink,
          account_manager: managerName,
        });

        const renderedContent = renderTemplate(tpl.content, {
          client_name: customer.name,
          company_name: companyName,
          invoice_number: inv.invoiceNumber,
          amount: inv.amount,
          currency: inv.currency,
          due_date: inv.dueDate,
          days_overdue: Math.max(0, daysOverdue),
          remaining_amount: inv.remainingAmount,
          payment_link: paymentLink,
          account_manager: managerName,
        });

        // Dispatch through Notification Provider
        let sendResult;
        if (step.channel === 'WHATSAPP') {
          sendResult = await whatsAppProvider.send({
            channel: 'WHATSAPP',
            recipient,
            subject: renderedSubject,
            content: renderedContent,
          });
        } else {
          sendResult = await emailProvider.send({
            channel: 'EMAIL',
            recipient,
            subject: renderedSubject,
            content: renderedContent,
          });
        }

        // Record message log
        const logRef = doc(collection(db, COLLECTIONS.MESSAGES));
        const newLog: MessageLog = {
          id: logRef.id,
          companyId,
          invoiceId: inv.id,
          customerId: customer.id,
          channel: step.channel,
          recipient,
          subject: renderedSubject,
          content: renderedContent,
          status: sendResult.success ? 'DELIVERED' : 'FAILED',
          error: sendResult.error,
          sentAt: new Date().toISOString(),
          stepOffset: step.dayOffset,
        };
        await setDoc(logRef, newLog);
        sentStepKeySet.add(stepKey);

        // Update invoice's last reminder timestamp and ensure status is OVERDUE if overdue
        const updates: Partial<Invoice> = {
          lastReminderSentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (daysOverdue > 0 && inv.status === 'SENT') {
          updates.status = 'OVERDUE';
        }
        await updateDoc(doc(db, COLLECTIONS.INVOICES, inv.id), updates);

        result.remindersSent++;
        result.details.push({
          invoiceNumber: inv.invoiceNumber,
          customerName: customer.name,
          stepTitle: step.actionTitle,
          channel: step.channel,
          status: 'Succès',
        });

        // Only fire the earliest unsent step in one run to avoid spamming the client
        break;
      }
    }
  }

  // Create an internal system audit and notification if reminders were sent
  if (result.remindersSent > 0) {
    const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
    await setDoc(notifRef, {
      id: notifRef.id,
      companyId,
      title: 'Relances automatiques exécutées',
      message: `${result.remindersSent} relance(s) ont été envoyées aux clients débiteurs.`,
      type: 'REMINDER',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  return result;
}
