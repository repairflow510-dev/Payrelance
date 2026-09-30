import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Customer, Invoice } from '../types';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, 
  X, Download, RefreshCw, UploadCloud 
} from 'lucide-react';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';
import { calculateDaysOverdue } from '../lib/constants';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedInvoiceRow {
  rowNumber: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  errors: string[];
}

export default function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const { currentCompany } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedInvoiceRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'INPUT' | 'PREVIEW' | 'DONE'>('INPUT');

  if (!isOpen) return null;

  const defaultSampleCSV = `invoice_number,client_name,client_email,client_phone,amount,currency,issue_date,due_date
FAC-2026-0301,SOCIETE IVOIRIENNE AGRO,compta@agro-ci.com,+22505051234,4500000,FCFA,2026-08-10,2026-09-10
FAC-2026-0302,ATELIER TECHNIQUE DU SUD,contact@atelier-sud.fr,+33145890012,1250,EUR,2026-08-15,2026-09-15
FAC-2026-0303,LOGISTIQUE TRANSIT EXPRESS,facturation@lte-dakar.sn,+221778901234,2800000,FCFA,2026-08-20,2026-09-20
FAC-2026-0304,BTP INFRASTRUCTURES SA,direction@btp-infra.ci,+22507078901,6200000,FCFA,2026-09-01,2026-10-01`;

  function handleLoadSample() {
    setCsvText(defaultSampleCSV.trim());
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  }

  function parseCSV() {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return;

    const headerLine = lines[0];
    const sep = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(sep).map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));

    const rows: ParsedInvoiceRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const rowData: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowData[h] = values[idx] || '';
      });

      const invNum = rowData['invoice_number'] || rowData['numero'] || rowData['num'] || '';
      const clientName = rowData['client_name'] || rowData['client'] || rowData['nom'] || '';
      const clientEmail = rowData['client_email'] || rowData['email'] || '';
      const clientPhone = rowData['client_phone'] || rowData['phone'] || rowData['telephone'] || '';
      const rawAmount = (rowData['amount'] || rowData['montant'] || '0').replace(/\s/g, '').replace(',', '.');
      const amount = parseFloat(rawAmount) || 0;
      const currency = rowData['currency'] || rowData['devise'] || currentCompany?.currency || 'FCFA';
      const issueDate = rowData['issue_date'] || rowData['date_emission'] || new Date().toISOString().split('T')[0];
      const dueDate = rowData['due_date'] || rowData['date_echeance'] || rowData['echeance'] || '';

      const errors: string[] = [];
      if (!invNum) errors.push('Numéro de facture manquant');
      if (!clientName) errors.push('Nom du client manquant');
      if (amount <= 0) errors.push('Montant invalide');
      if (!dueDate) errors.push("Date d'échéance requise (YYYY-MM-DD)");

      rows.push({
        rowNumber: i,
        invoice_number: invNum,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        amount,
        currency,
        issue_date: issueDate,
        due_date: dueDate,
        errors,
      });
    }

    setParsedRows(rows);
    setStep('PREVIEW');
  }

  async function handleConfirmImport() {
    if (!currentCompany?.id) return;
    setImporting(true);

    try {
      const custQuery = query(collection(db, COLLECTIONS.CUSTOMERS), where('companyId', '==', currentCompany.id));
      const custSnap = await getDocs(custQuery);
      const customerMap = new Map<string, Customer>();
      custSnap.forEach(d => {
        const c = d.data() as Customer;
        customerMap.set(c.name.toLowerCase().trim(), c);
      });

      const validRows = parsedRows.filter(r => r.errors.length === 0);

      for (const row of validRows) {
        let customer = customerMap.get(row.client_name.toLowerCase().trim());

        if (!customer) {
          const custRef = doc(collection(db, COLLECTIONS.CUSTOMERS));
          const newCustomer: Customer = {
            id: custRef.id,
            companyId: currentCompany.id,
            name: row.client_name,
            email: row.client_email,
            phone: row.client_phone,
            whatsapp: row.client_phone,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(custRef, newCustomer);
          customer = newCustomer;
          customerMap.set(row.client_name.toLowerCase().trim(), newCustomer);
        }

        const daysOverdue = calculateDaysOverdue(row.due_date);
        const status = daysOverdue > 0 ? 'OVERDUE' : 'SENT';

        const invRef = doc(collection(db, COLLECTIONS.INVOICES));
        const newInvoice: Invoice = {
          id: invRef.id,
          companyId: currentCompany.id,
          customerId: customer.id,
          customerName: customer.name,
          invoiceNumber: row.invoice_number,
          description: `Facture importée ${row.invoice_number}`,
          amount: row.amount,
          paidAmount: 0,
          remainingAmount: row.amount,
          currency: row.currency,
          issueDate: row.issue_date,
          dueDate: row.due_date,
          status: status,
          publicToken: 'tok_' + Math.random().toString(36).substring(2, 12),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(invRef, newInvoice);
      }

      setStep('DONE');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (e) {
      console.error('Import error:', e);
      alert('Erreur lors de l’import. Vérifiez votre connexion.');
    } finally {
      setImporting(false);
    }
  }

  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;
  const validCount = parsedRows.filter(r => r.errors.length === 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Import CSV de Factures</h2>
              <p className="text-xs text-slate-300">
                Importez vos factures existantes en bloc avec détection automatique des retards.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'INPUT' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 sm:p-6 text-center transition-all bg-slate-50/50">
                <UploadCloud className="w-8 sm:w-10 h-8 sm:h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Sélectionnez un fichier .csv ou collez son contenu</p>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  Colonnes : invoice_number, client_name, client_email, client_phone, amount, currency, issue_date, due_date
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                  <label className="w-full sm:w-auto cursor-pointer px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 shadow-xs transition-all text-center">
                    Choisir un fichier CSV
                    <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Charger l'exemple de démo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Données CSV brutes
                </label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Collez ici les lignes CSV..."
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 text-center sm:text-left">
                  <div className="text-[10px] sm:text-xs text-slate-500">Lignes</div>
                  <div className="text-base sm:text-lg font-bold text-slate-900">{parsedRows.length}</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center sm:text-left">
                  <div className="text-[10px] sm:text-xs text-emerald-700">Valides</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-800">{validCount}</div>
                </div>
                <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-center sm:text-left">
                  <div className="text-[10px] sm:text-xs text-rose-700">Erreurs</div>
                  <div className="text-base sm:text-lg font-bold text-rose-800">{errorCount}</div>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Facture</th>
                      <th className="p-2.5">Client</th>
                      <th className="p-2.5">Montant</th>
                      <th className="p-2.5">Échéance</th>
                      <th className="p-2.5">État</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r) => (
                      <tr key={r.rowNumber} className={r.errors.length > 0 ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 font-mono font-semibold text-slate-900">{r.invoice_number || '—'}</td>
                        <td className="p-2.5 text-slate-700">
                          <div>{r.client_name}</div>
                          <div className="text-[10px] text-slate-400">{r.client_email}</div>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {r.amount.toLocaleString()} {r.currency}
                        </td>
                        <td className="p-2.5 text-slate-600">{r.due_date}</td>
                        <td className="p-2.5">
                          {r.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Valide
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700" title={r.errors.join(', ')}>
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'DONE' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Importation réussie !</h3>
              <p className="text-sm text-slate-600">
                {validCount} facture(s) et les clients associés ont été importés dans votre espace de travail.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step === 'PREVIEW' ? (
            <button
              type="button"
              onClick={() => setStep('INPUT')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Modifier
            </button>
          ) : (
            <div />
          )}

          {step === 'INPUT' && (
            <button
              type="button"
              disabled={!csvText.trim()}
              onClick={parseCSV}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              Analyser le fichier <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === 'PREVIEW' && (
            <button
              type="button"
              disabled={importing || validCount === 0}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              {importing ? 'Import en cours...' : `Confirmer (${validCount})`}
              {!importing && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
