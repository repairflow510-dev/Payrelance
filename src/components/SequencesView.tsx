import React, { useState } from 'react';
import { ReminderSequence, MessageTemplate, Channel } from '../types';
import { 
  Repeat, Plus, Check, Clock, Mail, MessageSquare, 
  ChevronRight, Sparkles, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface SequencesViewProps {
  sequences: ReminderSequence[];
  templates: MessageTemplate[];
  onRefresh: () => void;
}

export default function SequencesView({ sequences, templates, onRefresh }: SequencesViewProps) {
  const { currentCompany } = useAuth();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Séquences de Relance</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurez le calendrier de rappel automatique : J-7, J0, J+3, J+7, J+15, J+30.
          </p>
        </div>
      </div>

      {/* Sequences list */}
      <div className="space-y-4">
        {sequences.map((seq) => (
          <div key={seq.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{seq.name}</h2>
                {seq.isDefault && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Défaut
                  </span>
                )}
              </div>
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <Check className="w-3.5 h-3.5" /> Active
              </span>
            </div>

            {/* Stepper responsive grid (1 col mobile, 2 col tablet, 5 col desktop) */}
            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {seq.steps.map((step, idx) => {
                  const tpl = templates.find((t) => t.id === step.templateId);
                  const isOverdueStep = step.dayOffset > 0;
                  const isDayZero = step.dayOffset === 0;

                  return (
                    <div
                      key={step.id || idx}
                      className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 transition-all space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                          isOverdueStep 
                            ? 'bg-rose-100 text-rose-800' 
                            : isDayZero 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {step.dayOffset < 0 ? `J${step.dayOffset}` : step.dayOffset === 0 ? 'J0' : `J+${step.dayOffset}`}
                        </span>

                        <span className={`p-1 rounded-md text-xs ${
                          step.channel === 'WHATSAPP' ? 'text-emerald-700 bg-emerald-100' : 'text-blue-700 bg-blue-100'
                        }`}>
                          {step.channel === 'WHATSAPP' ? <MessageSquare className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                        </span>
                      </div>

                      <div className="font-semibold text-xs text-slate-900">{step.actionTitle}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Modèle : {tpl?.name || 'Standard'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px] sm:text-xs">Cette séquence s'applique automatiquement à toute nouvelle facture créée ou importée.</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
