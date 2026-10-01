import React, { useState } from 'react';
import { 
  Bell, Check, CheckCheck, Trash2, Archive, ExternalLink, 
  AlertTriangle, DollarSign, CalendarClock, Send, Info, X, ChevronRight
} from 'lucide-react';
import { AppNotification } from '../types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/db';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate?: (tab: string, filter?: string) => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onNavigate,
}: NotificationPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = filter === 'UNREAD' 
    ? notifications.filter((n) => !n.read) 
    : notifications;

  async function handleMarkAsRead(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      setLoadingAction(id);
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), {
        read: true,
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleMarkAllAsRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      setLoadingAction('all');
      await Promise.all(
        unread.map((n) =>
          updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), {
            read: true,
          })
        )
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleArchive(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    try {
      setLoadingAction(id);
      await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id));
    } catch (err) {
      console.error('Error archiving notification:', err);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleArchiveAll() {
    if (notifications.length === 0) return;
    if (!confirm('Voulez-vous archiver et supprimer toutes les alertes affichées ?')) return;
    try {
      setLoadingAction('archive-all');
      await Promise.all(
        notifications.map((n) => deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id)))
      );
    } catch (err) {
      console.error('Error archiving all notifications:', err);
    } finally {
      setLoadingAction(null);
    }
  }

  function getNotificationIcon(type: AppNotification['type']) {
    switch (type) {
      case 'REMINDER':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'PAYMENT':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'PROMISE':
        return <CalendarClock className="w-4 h-4 text-indigo-500" />;
      case 'DISPUTE':
      case 'ALERT':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  }

  function handleNotificationClick(notif: AppNotification) {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (onNavigate) {
      if (notif.type === 'REMINDER') onNavigate('reminders');
      else if (notif.type === 'PAYMENT') onNavigate('payments');
      else if (notif.type === 'PROMISE') onNavigate('reminders');
      else if (notif.type === 'DISPUTE') onNavigate('invoices', 'DISPUTED');
      else onNavigate('invoices');
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Centre de notifications et alertes"
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 md:w-[420px] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
      >
        {/* Panel Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Alertes & Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Suivi des relances et encaissements</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fermer le volet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Global Actions bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loadingAction === 'all'}
                className="px-2 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Tout marquer comme lu"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tout lire</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleArchiveAll}
                disabled={loadingAction === 'archive-all'}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                title="Archiver toutes les alertes"
                aria-label="Archiver toutes les alertes"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {displayedNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-slate-600">Aucune alerte à afficher</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {filter === 'UNREAD'
                  ? 'Toutes vos notifications sont déjà marquées comme lues.'
                  : 'Votre centre de relance est parfaitement à jour.'}
              </p>
            </div>
          ) : (
            displayedNotifications.map((notif) => {
              const formattedDate = notif.createdAt
                ? new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Récemment';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 sm:p-4 hover:bg-slate-50 transition-colors cursor-pointer relative group flex gap-3 ${
                    notif.read ? 'bg-white opacity-85' : 'bg-blue-50/40'
                  }`}
                >
                  {/* Unread indicator bullet */}
                  {!notif.read && (
                    <div className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
                  )}

                  {/* Icon */}
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className={`text-xs font-bold truncate ${notif.read ? 'text-slate-800' : 'text-slate-900 font-extrabold'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono shrink-0">
                        {formattedDate}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Actions row */}
                    <div className="pt-1.5 flex items-center justify-between text-[11px]">
                      <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:underline">
                        Consulter <ChevronRight className="w-3 h-3" />
                      </span>

                      <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Marquer comme lu"
                            aria-label="Marquer comme lu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleArchive(notif.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Archiver"
                          aria-label="Archiver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Les alertes sont synchronisées en direct avec votre base de données.
        </div>
      </div>
    </>
  );
}
