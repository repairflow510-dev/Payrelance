import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, 
  deleteDoc, query, where, orderBy, limit, addDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Company, Customer, Invoice, Payment, PaymentPromise, Dispute, 
  ReminderSequence, MessageTemplate, MessageLog, AuditLog, AppNotification,
  Membership, User
} from '../types';
import { DEFAULT_TEMPLATES } from './notifications';
import { calculateDaysOverdue } from './constants';

export const COLLECTIONS = {
  USERS: 'users',
  COMPANIES: 'companies',
  MEMBERSHIPS: 'memberships',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  PROMISES: 'payment_promises',
  DISPUTES: 'disputes',
  SEQUENCES: 'reminder_sequences',
  TEMPLATES: 'message_templates',
  MESSAGES: 'message_logs',
  AUDIT_LOGS: 'audit_logs',
  NOTIFICATIONS: 'notifications',
};

// Seed initial company data if non-existent
export async function seedCompanyData(companyId: string, companyName: string, currency: string = 'FCFA', managerName: string = 'Admin Recouvrement') {
  const companyRef = doc(db, COLLECTIONS.COMPANIES, companyId);
  const companySnap = await getDoc(companyRef);

  if (!companySnap.exists()) {
    const newCompany: Company = {
      id: companyId,
      name: companyName,
      country: 'Côte d’Ivoire',
      currency: currency,
      managerName: managerName,
      plan: 'PRO',
      createdAt: new Date().toISOString(),
      settings: {
        sendDailyDigest: true,
        autoRemindersEnabled: true,
        replyToEmail: 'comptabilite@payrelance-demo.com',
      },
    };
    await setDoc(companyRef, newCompany);
  }

  // Create default templates
  const templatesSnap = await getDocs(query(collection(db, COLLECTIONS.TEMPLATES), where('companyId', '==', companyId)));
  const createdTemplates: MessageTemplate[] = [];

  if (templatesSnap.empty) {
    for (const tpl of DEFAULT_TEMPLATES) {
      const tplRef = doc(collection(db, COLLECTIONS.TEMPLATES));
      const fullTpl: MessageTemplate = {
        ...tpl,
        id: tplRef.id,
        companyId,
      };
      await setDoc(tplRef, fullTpl);
      createdTemplates.push(fullTpl);
    }
  } else {
    templatesSnap.forEach(d => createdTemplates.push(d.data() as MessageTemplate));
  }

  // Create default sequence
  const sequencesSnap = await getDocs(query(collection(db, COLLECTIONS.SEQUENCES), where('companyId', '==', companyId)));
  if (sequencesSnap.empty && createdTemplates.length > 0) {
    const seqRef = doc(collection(db, COLLECTIONS.SEQUENCES));
    const defaultSeq: ReminderSequence = {
      id: seqRef.id,
      companyId,
      name: 'Séquence PME Standard (J-7 à J+30)',
      isActive: true,
      isDefault: true,
      steps: [
        {
          id: 'step_1',
          dayOffset: -7,
          channel: 'EMAIL',
          templateId: createdTemplates[0]?.id || '',
          actionTitle: 'Rappel préventif courtois',
        },
        {
          id: 'step_2',
          dayOffset: 0,
          channel: 'EMAIL',
          templateId: createdTemplates[1]?.id || '',
          actionTitle: 'Avis du jour d’échéance',
        },
        {
          id: 'step_3',
          dayOffset: 3,
          channel: 'EMAIL',
          templateId: createdTemplates[2]?.id || '',
          actionTitle: 'Première relance de retard',
        },
        {
          id: 'step_4',
          dayOffset: 7,
          channel: 'WHATSAPP',
          templateId: createdTemplates[3]?.id || '',
          actionTitle: 'Rappel direct WhatsApp',
        },
        {
          id: 'step_5',
          dayOffset: 15,
          channel: 'EMAIL',
          templateId: createdTemplates[4]?.id || '',
          actionTitle: 'Mise en demeure / Relance administrative',
        },
      ],
      createdAt: new Date().toISOString(),
    };
    await setDoc(seqRef, defaultSeq);
  }

  // Seed demo customers if none exist
  const customersSnap = await getDocs(query(collection(db, COLLECTIONS.CUSTOMERS), where('companyId', '==', companyId)));
  if (customersSnap.empty) {
    const demoCustomers = [
      {
        name: 'ABC Construction SARL',
        email: 'direction@abc-construction.ci',
        phone: '+225 07 00 11 22 33',
        whatsapp: '+2250700112233',
        city: 'Abidjan',
        country: 'Côte d’Ivoire',
        customerReference: 'CUST-ABC-01',
        notes: 'Client grand compte chantiers BTP.',
      },
      {
        name: 'XYZ Consulting International',
        email: 'finance@xyz-consulting.com',
        phone: '+33 1 42 68 55 00',
        whatsapp: '+33612345678',
        city: 'Paris',
        country: 'France',
        customerReference: 'CUST-XYZ-02',
        notes: 'Prestations de conseil stratégique.',
      },
      {
        name: 'Global Tech Solutions',
        email: 'billing@globaltech-solutions.org',
        phone: '+221 33 820 40 50',
        whatsapp: '+221776543210',
        city: 'Dakar',
        country: 'Sénégal',
        customerReference: 'CUST-GT-03',
        notes: 'Maintenance progiciel trimestrielle.',
      },
      {
        name: 'Omni Distribution SAS',
        email: 'compta@omni-distrib.com',
        phone: '+32 2 555 12 34',
        whatsapp: '+32470123456',
        city: 'Bruxelles',
        country: 'Belgique',
        customerReference: 'CUST-OMN-04',
        notes: 'Commandes récurrentes de consommables.',
      },
    ];

    const customerIds: string[] = [];
    for (const c of demoCustomers) {
      const cRef = doc(collection(db, COLLECTIONS.CUSTOMERS));
      const newCust: Customer = {
        id: cRef.id,
        companyId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
        city: c.city,
        country: c.country,
        customerReference: c.customerReference,
        notes: c.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(cRef, newCust);
      customerIds.push(cRef.id);
    }

    // Seed demo invoices (varying statuses: OVERDUE, PARTIALLY_PAID, PAID, DISPUTED, SENT)
    const today = new Date();
    const dMinus45 = new Date(today.getTime() - 45 * 86400000).toISOString().split('T')[0];
    const dMinus30 = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
    const dMinus15 = new Date(today.getTime() - 15 * 86400000).toISOString().split('T')[0];
    const dMinus5 = new Date(today.getTime() - 5 * 86400000).toISOString().split('T')[0];
    const dPlus7 = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const dPlus20 = new Date(today.getTime() + 20 * 86400000).toISOString().split('T')[0];

    const demoInvoices = [
      {
        customerId: customerIds[0],
        customerName: 'ABC Construction SARL',
        invoiceNumber: 'FAC-2026-0089',
        description: 'Travaux de terrassement Lot B - Étape 2',
        amount: 3200000,
        paidAmount: 1200000,
        remainingAmount: 2000000,
        currency,
        issueDate: dMinus45,
        dueDate: dMinus15,
        status: 'OVERDUE' as const,
        publicToken: 'tok_abc_' + Math.random().toString(36).substring(2, 10),
      },
      {
        customerId: customerIds[1],
        customerName: 'XYZ Consulting International',
        invoiceNumber: 'FAC-2026-0094',
        description: 'Audit organisationnel & feuille de route',
        amount: 1850000,
        paidAmount: 0,
        remainingAmount: 1850000,
        currency,
        issueDate: dMinus30,
        dueDate: dMinus5,
        status: 'OVERDUE' as const,
        publicToken: 'tok_xyz_' + Math.random().toString(36).substring(2, 10),
      },
      {
        customerId: customerIds[2],
        customerName: 'Global Tech Solutions',
        invoiceNumber: 'FAC-2026-0102',
        description: 'Renouvellement licences serveurs et infogérance',
        amount: 950000,
        paidAmount: 950000,
        remainingAmount: 0,
        currency,
        issueDate: dMinus45,
        dueDate: dMinus15,
        status: 'PAID' as const,
        publicToken: 'tok_gt_' + Math.random().toString(36).substring(2, 10),
      },
      {
        customerId: customerIds[3],
        customerName: 'Omni Distribution SAS',
        invoiceNumber: 'FAC-2026-0115',
        description: 'Livraison de fournitures industrielles',
        amount: 1400000,
        paidAmount: 400000,
        remainingAmount: 1000000,
        currency,
        issueDate: dMinus15,
        dueDate: dPlus7,
        status: 'PARTIALLY_PAID' as const,
        publicToken: 'tok_omni_' + Math.random().toString(36).substring(2, 10),
      },
      {
        customerId: customerIds[0],
        customerName: 'ABC Construction SARL',
        invoiceNumber: 'FAC-2026-0120',
        description: 'Fourniture béton armé et poutres préfabriquées',
        amount: 2750000,
        paidAmount: 0,
        remainingAmount: 2750000,
        currency,
        issueDate: dMinus5,
        dueDate: dPlus20,
        status: 'SENT' as const,
        publicToken: 'tok_abc2_' + Math.random().toString(36).substring(2, 10),
      },
    ];

    for (const inv of demoInvoices) {
      const invRef = doc(collection(db, COLLECTIONS.INVOICES));
      const newInvoice: Invoice = {
        ...inv,
        id: invRef.id,
        companyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(invRef, newInvoice);

      // If partial or paid, add payment record
      if (inv.paidAmount > 0) {
        const payRef = doc(collection(db, COLLECTIONS.PAYMENTS));
        const payment: Payment = {
          id: payRef.id,
          companyId,
          invoiceId: invRef.id,
          customerId: inv.customerId,
          amount: inv.paidAmount,
          currency,
          paymentDate: dMinus5,
          method: 'BANK_TRANSFER',
          reference: 'VIR-' + Math.floor(100000 + Math.random() * 900000),
          notes: 'Acompte reçu par virement bancaire.',
          createdBy: 'Système Démo',
          createdAt: new Date().toISOString(),
        };
        await setDoc(payRef, payment);
      }

      // If overdue, add a sample message log to show history
      if (inv.status === 'OVERDUE') {
        const msgRef = doc(collection(db, COLLECTIONS.MESSAGES));
        const msg: MessageLog = {
          id: msgRef.id,
          companyId,
          invoiceId: invRef.id,
          customerId: inv.customerId,
          channel: 'EMAIL',
          recipient: inv.customerId === customerIds[0] ? 'direction@abc-construction.ci' : 'finance@xyz-consulting.com',
          subject: `Relance facture ${inv.invoiceNumber}`,
          content: `Bonjour, nous constatons un retard sur la facture ${inv.invoiceNumber}. Merci de régler votre solde de ${inv.remainingAmount} ${currency}.`,
          status: 'DELIVERED',
          sentAt: new Date(today.getTime() - 2 * 86400000).toISOString(),
          stepOffset: 3,
        };
        await setDoc(msgRef, msg);
      }
    }

    // Seed an initial payment promise for demo
    const promiseRef = doc(collection(db, COLLECTIONS.PROMISES));
    const demoPromise: PaymentPromise = {
      id: promiseRef.id,
      companyId,
      invoiceId: 'demo_inv_1',
      customerId: customerIds[0],
      amount: 1000000,
      promisedDate: new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0],
      status: 'PENDING',
      notes: 'Promesse de virement de 1M confirmée au téléphone par le directeur financier.',
      createdAt: new Date().toISOString(),
    };
    await setDoc(promiseRef, demoPromise);

    // Seed initial notifications
    const notifRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
    const notif: AppNotification = {
      id: notifRef.id,
      companyId,
      title: 'Factures échues détectées',
      message: '2 factures ont dépassé leur date d’échéance et sont éligibles à une relance automatique.',
      type: 'ALERT',
      read: false,
      link: '/reminders',
      createdAt: new Date().toISOString(),
    };
    await setDoc(notifRef, notif);
  }
}
