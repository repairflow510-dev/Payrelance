import React from 'react';
import { 
  BarChart3, Users, FileText, CreditCard, Send, 
  Repeat, Layers, FileSpreadsheet, Settings, LogOut, 
  Building2, ShieldCheck, ChevronRight, Bell, Sparkles, ExternalLink, X
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  unreadCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onOpenNotifications?: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export default function Sidebar({ 
  currentTab, 
  onSelectTab, 
  unreadCount = 0,
  isOpenMobile = false,
  onCloseMobile,
  onOpenNotifications,
  onOpenAuth,
}: SidebarProps) {
  const { currentCompany, currentUser, currentRole, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'invoices', label: 'Factures & Impayés', icon: FileText },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'payments', label: 'Paiements & Encaissements', icon: CreditCard },
    { id: 'reminders', label: 'Moteur de Relance', icon: Send, badge: 'Auto' },
    { id: 'sequences', label: 'Séquences de relance', icon: Repeat },
    { id: 'templates', label: 'Modèles de messages', icon: Layers },
    { id: 'reports', label: 'Rapports & DSO', icon: FileSpreadsheet },
    { id: 'settings', label: 'Paramètres & Équipe', icon: Settings },
  ];

  function handleItemClick(tabId: string) {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  }

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen select-none transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="overflow-y-auto flex-1">
          {/* Workspace Brand / Tenant info */}
          <div className="p-4 sm:p-5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-md shrink-0">
                  PR
                </div>
                <div className="overflow-hidden">
                  <span className="font-extrabold text-white tracking-tight text-base block leading-none">
                    PayRelance
                  </span>
                  <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase mt-1 inline-block">
                    Assistant Recouvrement
                  </span>
                </div>
              </div>

              {/* Close button on mobile screens */}
              <button 
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Company Card with Notification button */}
            <div className="mt-4 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div className="overflow-hidden pr-2">
                <div className="text-xs font-bold text-white truncate">
                  {currentCompany?.name || 'Mon Entreprise'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{currentCompany?.currency || 'FCFA'} • Plan {currentCompany?.plan || 'PRO'}</span>
                </div>
              </div>

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenNotifications();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white relative transition-colors cursor-pointer shrink-0"
                  title="Ouvrir les notifications"
                  aria-label="Ouvrir le volet des notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Navigation list */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 text-[9px] rounded uppercase font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {item.id === 'reminders' && unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout bar */}
        <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-900/90 shrink-0">
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.name || 'Utilisateur'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono capitalize">
                  {currentRole || 'OWNER'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  title="Changer de compte ou se connecter"
                  className="text-slate-400 hover:text-blue-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Connexion ou inscription"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => logout()}
                title="Se déconnecter"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
