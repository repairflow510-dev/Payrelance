import React, { useState } from 'react';
import { Plus, X, FileText, UserPlus, RefreshCw, Sparkles } from 'lucide-react';

interface FloatingQuickActionProps {
  onAddInvoice: () => void;
  onCreateCustomer: () => void;
  onRunEngine: () => void;
  engineRunning?: boolean;
}

export default function FloatingQuickAction({
  onAddInvoice,
  onCreateCustomer,
  onRunEngine,
  engineRunning = false,
}: FloatingQuickActionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* Backdrop overlay when open on small screens */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-2xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Floating Action Menu Options */}
      <div
        className={`relative z-40 flex flex-col items-end gap-2.5 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Action 1: Exécuter les relances */}
        <div className="flex items-center gap-2.5">
          <span className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
            Exécuter les relances
          </span>
          <button
            type="button"
            disabled={engineRunning}
            onClick={() => {
              setIsOpen(false);
              onRunEngine();
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white flex items-center justify-center shadow-lg hover:shadow-orange-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Lancer le cycle de relance"
          >
            <RefreshCw className={`w-5 h-5 ${engineRunning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action 2: Créer un client */}
        <div className="flex items-center gap-2.5">
          <span className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
            Nouveau client
          </span>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCreateCustomer();
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center justify-center shadow-lg hover:shadow-purple-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Créer un client"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Action 3: Nouvelle facture */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
            Nouvelle facture
          </span>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAddInvoice();
            }}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            title="Créer une facture"
          >
            <FileText className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Trigger Floating Button (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Actions rapides"
        className={`relative z-40 w-13 sm:w-14 h-13 sm:h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer ${
          isOpen
            ? 'bg-slate-800 rotate-45 shadow-slate-900/40'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-600/40 hover:scale-105'
        }`}
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
