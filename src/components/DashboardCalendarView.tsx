import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Send, AlertCircle, Clock, CheckCircle2, ArrowRight, 
  Sparkles, CalendarClock, MessageSquare, Mail, Phone,
  Filter, Eye, Layers
} from 'lucide-react';
import { Invoice, PaymentPromise } from '../types';
import { formatCurrency, calculateDaysOverdue } from '../lib/constants';

interface DashboardCalendarViewProps {
  invoices: Invoice[];
  promises: PaymentPromise[];
  currency: string;
  onNavigate: (tab: string, filter?: string) => void;
}

type CalendarItemType = 'DUE_DATE' | 'SCHEDULED_REMINDER' | 'PAYMENT_PROMISE';

interface CalendarEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  type: CalendarItemType;
  title: string;
  customerName: string;
  amount: number;
  invoiceNumber: string;
  invoiceId: string;
  status?: string;
  channel?: 'EMAIL' | 'WHATSAPP';
  isOverdue?: boolean;
}

export default function DashboardCalendarView({
  invoices,
  promises,
  currency,
  onNavigate,
}: DashboardCalendarViewProps) {
  // Calendar month navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filterType, setFilterType] = useState<'ALL' | 'DUE_DATE' | 'REMINDER' | 'PROMISE'>('ALL');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Navigate month
  function handlePrevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }
  function handleNextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }
  function handleToday() {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.toISOString().split('T')[0]);
  }

  // 1. Build calendar events list
  const events: CalendarEvent[] = [];

  // A. Facture Échéances (Due Dates)
  invoices.forEach((inv) => {
    if (inv.status === 'CANCELLED' || !inv.dueDate) return;
    const isPastDue = calculateDaysOverdue(inv.dueDate) > 0 && inv.remainingAmount > 0;
    events.push({
      id: `due_${inv.id}`,
      dateStr: inv.dueDate,
      type: 'DUE_DATE',
      title: `Échéance Facture #${inv.invoiceNumber}`,
      customerName: inv.customerName || 'Client',
      amount: inv.remainingAmount,
      invoiceNumber: inv.invoiceNumber,
      invoiceId: inv.id,
      status: inv.status,
      isOverdue: isPastDue,
    });
  });

  // B. Relances Programmées (Scheduled Reminders)
  // Compute next estimated reminder dates based on due dates & sequence logic (e.g. J0, J+3, J+7, J+15)
  invoices.forEach((inv) => {
    if (inv.remainingAmount <= 0 || inv.status === 'CANCELLED' || inv.status === 'DISPUTED') return;
    const due = new Date(inv.dueDate);
    if (isNaN(due.getTime())) return;

    // Follow standard scheduled cadences
    const scheduleOffsets = [
      { offset: -3, label: 'Pré-relance préventive J-3', channel: 'EMAIL' as const },
      { offset: 0, label: 'Rappel d’échéance J0', channel: 'WHATSAPP' as const },
      { offset: 3, label: 'Relance amiable J+3', channel: 'WHATSAPP' as const },
      { offset: 7, label: 'Deuxième relance J+7', channel: 'EMAIL' as const },
      { offset: 15, label: 'Mise en demeure J+15', channel: 'WHATSAPP' as const },
    ];

    scheduleOffsets.forEach((item) => {
      const scheduledDate = new Date(due);
      scheduledDate.setDate(due.getDate() + item.offset);
      const dateStr = scheduledDate.toISOString().split('T')[0];

      events.push({
        id: `rem_${inv.id}_${item.offset}`,
        dateStr,
        type: 'SCHEDULED_REMINDER',
        title: item.label,
        customerName: inv.customerName || 'Client',
        amount: inv.remainingAmount,
        invoiceNumber: inv.invoiceNumber,
        invoiceId: inv.id,
        channel: item.channel,
      });
    });
  });

  // C. Promesses de Paiement
  promises.forEach((p) => {
    if (!p.promisedDate || p.status === 'CANCELLED') return;
    const inv = invoices.find((i) => i.id === p.invoiceId);
    events.push({
      id: `promise_${p.id}`,
      dateStr: p.promisedDate,
      type: 'PAYMENT_PROMISE',
      title: `Promesse de règlement ${p.status === 'FULFILLED' ? '(Honorée)' : '(En attente)'}`,
      customerName: inv?.customerName || 'Client',
      amount: p.amount,
      invoiceNumber: inv?.invoiceNumber || '',
      invoiceId: p.invoiceId,
      status: p.status,
    });
  });

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterType === 'DUE_DATE') return e.type === 'DUE_DATE';
    if (filterType === 'REMINDER') return e.type === 'SCHEDULED_REMINDER';
    if (filterType === 'PROMISE') return e.type === 'PAYMENT_PROMISE';
    return true;
  });

  // Index events by Date string (YYYY-MM-DD)
  const eventsByDate = new Map<string, CalendarEvent[]>();
  filteredEvents.forEach((e) => {
    const list = eventsByDate.get(e.dateStr) || [];
    list.push(e);
    eventsByDate.set(e.dateStr, list);
  });

  // Calendar Grid Math (Month view)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Day of week for 1st day (0 = Sunday, 1 = Monday). Convert to Monday-first (0 = Mon, 6 = Sun)
  const startDay = (firstDayOfMonth.getDay() + 6) % 7;

  // Previous month trailing days
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  const daysGrid: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const prevMonthDate = new Date(currentYear, currentMonth - 1, d);
    daysGrid.push({
      dayNumber: d,
      dateStr: prevMonthDate.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    // Format YYYY-MM-DD locally to avoid timezone offsets
    const yearStr = dateObj.getFullYear();
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    daysGrid.push({
      dayNumber: d,
      dateStr: `${yearStr}-${monthStr}-${dayStr}`,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete row grid (multiples of 7)
  const remainingSlots = 7 - (daysGrid.length % 7);
  if (remainingSlots < 7) {
    for (let d = 1; d <= remainingSlots; d++) {
      const nextMonthDate = new Date(currentYear, currentMonth + 1, d);
      daysGrid.push({
        dayNumber: d,
        dateStr: nextMonthDate.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const selectedDayEvents = eventsByDate.get(selectedDate) || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Calendar Header with Navigation & Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Calendrier des Échéances & Relances Programmées
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Visualisez vos dates d'échéances clients, relances prévues et promesses de règlement.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation & View Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DUE_DATE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'DUE_DATE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>Échéances</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('REMINDER')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'REMINDER' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Relances</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PROMISE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'PROMISE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Promesses</span>
            </button>
          </div>

          {/* Month Navigator Controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Mois précédent"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[110px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Mois suivant"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-xs"
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns (Calendar Month Grid 8 Cols + Selected Day Detail 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        
        {/* Left Side: Interactive Calendar Matrix (8 Cols) */}
        <div className="lg:col-span-8 p-3 sm:p-5">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-2">
            {dayNames.map((day, idx) => (
              <div key={idx} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {daysGrid.map((cell, idx) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayStr;

              const hasDue = dayEvents.some((e) => e.type === 'DUE_DATE');
              const hasReminder = dayEvents.some((e) => e.type === 'SCHEDULED_REMINDER');
              const hasPromise = dayEvents.some((e) => e.type === 'PAYMENT_PROMISE');

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                      : isToday
                      ? 'border-blue-200 bg-blue-50/20'
                      : cell.isCurrentMonth
                      ? 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      : 'border-slate-50 bg-slate-50/40 opacity-40'
                  }`}
                >
                  {/* Date number & Today dot */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-extrabold text-slate-500 font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Indicator Pills for events */}
                  <div className="space-y-1 mt-1">
                    {hasDue && (
                      <div className="truncate text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                        <span className="truncate">Échéance</span>
                      </div>
                    )}
                    {hasReminder && (
                      <div className="truncate text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">Relance</span>
                      </div>
                    )}
                    {hasPromise && (
                      <div className="truncate text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                        <span className="truncate">Promesse</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Selected Day Activity Detail (4 Cols) */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-slate-50/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Jour Sélectionné
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {selectedDayEvents.length} événement(s)
              </span>
            </div>

            {/* List of items for selected date */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 text-xs">
              {selectedDayEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <Clock className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="font-medium text-xs">Aucune échéance ni relance programmée à cette date.</p>
                  <p className="text-[11px] text-slate-400">Cliquez sur un jour avec indicateur pour voir les détails.</p>
                </div>
              ) : (
                selectedDayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-xl border transition-all ${
                      evt.type === 'DUE_DATE'
                        ? evt.isOverdue
                          ? 'border-rose-200 bg-rose-50/50'
                          : 'border-blue-200 bg-blue-50/40'
                        : evt.type === 'SCHEDULED_REMINDER'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-emerald-200 bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {evt.type === 'DUE_DATE' && (
                          <span className={`w-2 h-2 rounded-full ${evt.isOverdue ? 'bg-rose-500' : 'bg-blue-600'}`} />
                        )}
                        {evt.type === 'SCHEDULED_REMINDER' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        {evt.type === 'PAYMENT_PROMISE' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        <span className="truncate">{evt.title}</span>
                      </div>

                      <span className="font-extrabold text-slate-900 shrink-0">
                        {formatCurrency(evt.amount, currency)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                      <span className="font-medium truncate">{evt.customerName}</span>
                      {evt.channel && (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {evt.channel === 'WHATSAPP' ? (
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Mail className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{evt.channel}</span>
                        </span>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">
                        Facture #{evt.invoiceNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigate('invoices')}
                        className="text-blue-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        Consulter <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick legend & navigation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600" /> Échéance
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Relance
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Promesse
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
