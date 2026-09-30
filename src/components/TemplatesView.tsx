import React, { useState } from 'react';
import { MessageTemplate, Channel } from '../types';
import { 
  Layers, Plus, Mail, MessageSquare, Eye, Edit3, 
  Check, Sparkles, X, ArrowRight, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { renderTemplate } from '../lib/constants';

interface TemplatesViewProps {
  templates: MessageTemplate[];
  currency: string;
  onRefresh: () => void;
}

export default function TemplatesView({ templates, currency, onRefresh }: TemplatesViewProps) {
  const { currentCompany } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(templates[0] || null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // Variables preview sample
  const sampleVariables = {
    client_name: 'ABC Construction SARL',
    company_name: currentCompany?.name || 'PayRelance Demo',
    invoice_number: 'FAC-2026-0089',
    amount: '3 200 000',
    currency: currency,
    due_date: '2026-09-15',
    days_overdue: '15',
    remaining_amount: '2 000 000',
    payment_link: 'https://payrelance.app/pay/tok_demo_sample',
    account_manager: currentCompany?.managerName || 'Directeur Financier',
  };

  const previewSubject = selectedTemplate
    ? renderTemplate(selectedTemplate.subject, sampleVariables)
    : '';
  const previewContent = selectedTemplate
    ? renderTemplate(selectedTemplate.content, sampleVariables)
    : '';

  function handleSelectTemplate(tpl: MessageTemplate) {
    setSelectedTemplate(tpl);
    setMobilePreviewOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Modèles de Messages & Relances</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Variables dynamiques : {'{{client_name}}'}, {'{{remaining_amount}}'}, {'{{due_date}}'}, {'{{payment_link}}'}...
          </p>
        </div>
      </div>

      {/* Main 2-columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Templates list (hidden on small mobile if preview is open) */}
        <div className={`lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 ${
          mobilePreviewOpen ? 'hidden lg:block' : 'block'
        }`}>
          <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 uppercase tracking-wider">
            Modèles d'emails & WhatsApp ({templates.length})
          </div>
          {templates.map((tpl) => {
            const isSelected = selectedTemplate?.id === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className={`w-full text-left p-3.5 sm:p-4 transition-all flex items-start justify-between cursor-pointer ${
                  isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {tpl.channel === 'WHATSAPP' ? (
                      <span className="p-1 rounded bg-emerald-100 text-emerald-800 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-blue-100 text-blue-800 text-xs">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="font-semibold text-xs text-slate-900">{tpl.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{tpl.subject}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Preview card */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4 ${
          !mobilePreviewOpen ? 'hidden lg:block' : 'block'
        }`}>
          {/* Back button for mobile */}
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(false)}
            className="lg:hidden text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline cursor-pointer mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux modèles
          </button>

          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Aperçu avec données réelles (Simulation)
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {selectedTemplate?.channel}
            </span>
          </div>

          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.channel === 'EMAIL' ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">De : </span>
                      <span className="font-semibold text-slate-900">{currentCompany?.name} &lt;compta@payrelance.app&gt;</span>
                    </div>
                    <div>
                      <span className="text-slate-500">À : </span>
                      <span className="font-semibold text-slate-900">direction@abc-construction.ci</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Objet : </span>
                      <span className="font-bold text-slate-900 break-words">{previewSubject}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap break-words">
                    {previewContent}
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-emerald-950 p-4 rounded-3xl shadow-xl text-white">
                  <div className="text-center text-xs font-semibold text-emerald-300 pb-2 border-b border-emerald-800/80 mb-3 flex items-center justify-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> WhatsApp Business Notification
                  </div>
                  <div className="bg-emerald-900/60 p-3.5 rounded-2xl text-xs text-emerald-50 leading-relaxed whitespace-pre-wrap border border-emerald-700/60 break-words">
                    {previewContent}
                  </div>
                </div>
              )}

              {/* Dynamic Variables list */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Variables de personnalisation :
                </span>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                  {Object.keys(sampleVariables).map((v) => (
                    <span key={v} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                      {'{{' + v + '}}'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
