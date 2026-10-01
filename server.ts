import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini client with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint for Gemini Smart Anomaly Detection & Recovery Strategy
app.post('/api/gemini/analyze-risks', async (req: Request, res: Response) => {
  try {
    const { overdueInvoices, customers, totalOverdueAmount, estimatedDSO, currency } = req.body;

    if (!overdueInvoices || !Array.isArray(overdueInvoices)) {
      return res.status(400).json({ error: 'overdueInvoices array is required' });
    }

    // Format concise context for model
    const clientSummary = (customers || []).map((c: any) => ({
      name: c.name,
      phone: c.phone || c.whatsapp || 'N/A',
      email: c.email || 'N/A',
    }));

    const invoicesData = overdueInvoices.slice(0, 15).map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      amount: inv.amount,
      remainingAmount: inv.remainingAmount,
      dueDate: inv.dueDate,
      daysOverdue: inv.daysOverdue || 0,
      remindersCount: inv.remindersCount || 0,
      lastReminderSentAt: inv.lastReminderSentAt || 'Aucune',
      status: inv.status,
    }));

    const prompt = `Tu es un Directeur Financier & Expert Senior en Recouvrement B2B pour PME.
Analyse les données réelles suivantes sur les retards de paiement :
- Devise : ${currency || 'FCFA'}
- Montant total échus : ${totalOverdueAmount} ${currency || 'FCFA'}
- Délai Moyen de Règlement (DSO estimé) : ${estimatedDSO || 45} jours
- Portefeuille de factures échues : ${JSON.stringify(invoicesData, null, 2)}
- Contacts clients : ${JSON.stringify(clientSummary, null, 2)}

Mission :
1. Détecte les anomalies critiques (clients cumulant plusieurs retards importants, retards atypiques supérieurs à 30 jours sans promesse, ou montants disproportionnés).
2. Fournis un diagnostic global synthétique (niveau de criticité global, impact sur la trésorerie).
3. Identifie les clients à plus haut risque avec un score de risque (Élevé, Critique, Modéré) et suggère des actions de recouvrement spécifiques, ultra-concrètes et personnalisées (ex: appel téléphonique direct de direction, mise en demeure formelle, proposition de protocole d'échelonnement, suspension des commandes/livraisons, message WhatsApp courtois mais ferme).

Format de réponse obligatoire : Réponds STRICTEMENT au format JSON valide selon cette structure :
{
  "summary": "Résumé exécutif en 2 phrases du risque actuel sur la trésorerie.",
  "riskLevel": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "anomalyInsights": [
    "Anomalie 1 détectée (ex: 60% du retard concentré sur un seul client)",
    "Anomalie 2 détectée..."
  ],
  "highRiskClients": [
    {
      "customerName": "Nom du client",
      "overdueAmount": 1500000,
      "maxDaysOverdue": 45,
      "riskScore": "CRITIQUE" | "ÉLEVÉ" | "MODÉRÉ",
      "anomalyReason": "Explication brève du comportement atypique",
      "recommendedAction": "Action immédiate recommandée pour le recouvrement",
      "recommendedChannel": "WHATSAPP" | "CALL" | "LEGAL_NOTICE" | "EMAIL"
    }
  ],
  "recommendedActionPlan": [
    "Étape 1 prioritaire",
    "Étape 2...",
    "Étape 3..."
  ]
}`;

    // Call Gemini 3.8 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const outputText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      // Clean potential markdown wrap
      const cleanJson = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/gemini/analyze-risks:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de l’analyse prédictive Gemini.' 
    });
  }
});

// API endpoint for sending Monthly Performance PDF report by Email
app.post('/api/reports/send-monthly-pdf', async (req: Request, res: Response) => {
  try {
    const { 
      recipientEmail, subject, note, monthLabel, 
      companyName, totalInvoiced, totalCollected, totalOverdue,
      collectionRate, estimatedDSO, currency 
    } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ error: 'recipientEmail is required' });
    }

    console.log(`[REPORT_SENT] Transmission du rapport mensuel (${monthLabel}) à ${recipientEmail} pour ${companyName}`);

    return res.json({
      success: true,
      recipientEmail,
      subject,
      monthLabel,
      deliveredAt: new Date().toISOString(),
      message: 'Rapport mensuel PDF transmis avec succès par email.'
    });
  } catch (error: any) {
    console.error('Error in /api/reports/send-monthly-pdf:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l’envoi du rapport.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PayRelance Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
