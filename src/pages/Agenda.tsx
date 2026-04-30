import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { useToast } from '../hooks/useToast';
import { formatCurrency } from '../utils/formatters';
import { Session } from '../types';

const statusColors: Record<Session['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  'no-show': 'bg-red-100 text-red-600 border-red-200',
};

const statusLabels: Record<Session['status'], string> = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  'no-show': 'Não compareceu',
};

const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${h.toString().padStart(2, '0')}:${m}`;
});

interface SessionFormData {
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: string;
  notes: string;
}

interface PaymentFormData {
  paymentMethod: Session['paymentMethod'];
}

export function Agenda() {
  const { patients } = usePatients();
  const { sessions, addSession, updateSession, checkConflict } = useSessions();
  const { addToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [view, setView] = useState<'month' | 'day'>('month');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');
  const [sessionToComplete, setSessionToComplete] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [formData, setFormData] = useState<SessionFormData>({
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    price: '',
    notes: '',
  });

  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    paymentMethod: 'pix',
  });

  const [errors, setErrors] = useState<Partial<SessionFormData>>({});

  const openNewSession = (date?: Date, time?: string) => {
    const d = date ?? selectedDate ?? new Date();
    setFormData({
      patientId: '',
      date: format(d, 'yyyy-MM-dd'),
      startTime: time ?? '09:00',
      endTime: time
        ? `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00`
        : '10:00',
      price: '',
      notes: '',
    });
    setEditingSession(null);
    setErrors({});
    setShowSessionModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SessionFormData> = {};
    if (!formData.patientId) newErrors.patientId = 'Selecione um paciente';
    if (!formData.date) newErrors.date = 'Informe a data';
    if (!formData.startTime) newErrors.startTime = 'Informe o horário de início';
    if (!formData.endTime) newErrors.endTime = 'Informe o horário de fim';
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'Informe um valor válido';
    }
    if (formData.startTime >= formData.endTime) {
      newErrors.endTime = 'Horário de fim deve ser após o início';
    }

    if (formData.date && formData.startTime && formData.endTime && formData.startTime < formData.endTime) {
      const hasConflict = checkConflict(
        formData.date,
        formData.startTime,
        formData.endTime,
        editingSession?.id
      );
      if (hasConflict) {
        newErrors.startTime = 'Conflito de horário com outra sessão';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitSession = () => {
    if (!validateForm()) return;

    const patient = patients.find((p) => p.id === formData.patientId);
    const session: Session = {
      id: editingSession?.id ?? `ses-${Date.now()}`,
      patientId: formData.patientId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: 'scheduled',
      price: Number(formData.price),
      paymentStatus: 'pending',
      receiptIssued: false,
      notes: formData.notes || undefined,
    };

    if (editingSession) {
      updateSession({ ...editingSession, ...session });
      addToast('Sessão atualizada com sucesso', 'success');
    } else {
      addSession(session);
      addToast(`Sessão agendada para ${patient?.name ?? ''}`, 'success');
    }

    setShowSessionModal(false);
  };

  const handleMarkStatus = (session: Session, status: Session['status']) => {
    if (status === 'completed') {
      setSessionToComplete(session);
      setPaymentData({ paymentMethod: 'pix' });
      setShowPaymentModal(true);
    } else {
      updateSession({ ...session, status });
      addToast(
        `Sessão marcada como ${statusLabels[status].toLowerCase()}`,
        status === 'cancelled' ? 'info' : 'warning'
      );
    }
  };

  const handleCompleteWithPayment = () => {
    if (!sessionToComplete) return;
    updateSession({
      ...sessionToComplete,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: paymentData.paymentMethod,
    });
    addToast('Sessão concluída e pagamento registrado', 'success');
    setShowPaymentModal(false);
    setSessionToComplete(null);
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter(
      (s) =>
        s.date === dateStr &&
        (filterPatient === '' || s.patientId === filterPatient)
    );
  };

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];

  // Calendar rendering
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    calDays.push(d);
    d = addDays(d, 1);
  }

  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Agenda"
        subtitle="Gerencie seus atendimentos"
        actionButton={{
          label: 'Nova Sessão',
          onClick: () => openNewSession(),
          icon: Plus,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={view === 'month' ? { backgroundColor: '#3d7a6e' } : {}}
            >
              <LayoutGrid size={14} />
              Mês
            </button>
            <button
              onClick={() => setView('day')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === 'day'
                  ? 'text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={view === 'day' ? { backgroundColor: '#3d7a6e' } : {}}
            >
              <List size={14} />
              Dia
            </button>
          </div>

          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white"
          >
            <option value="">Todos os pacientes</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-700 capitalize min-w-36 text-center">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-600 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {view === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {calDays.map((day, idx) => {
                  const daySessions = getSessionsForDate(day);
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const todayDate = isSameDay(day, new Date());

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day);
                        setCurrentDate(day);
                      }}
                      className={`min-h-[80px] p-2 border-b border-r border-gray-50 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-light'
                          : isCurrentMonth
                          ? 'hover:bg-gray-50'
                          : 'bg-gray-50/50'
                      }`}
                    >
                      <span
                        className={`text-sm font-medium inline-flex w-6 h-6 items-center justify-center rounded-full ${
                          todayDate
                            ? 'text-white'
                            : isCurrentMonth
                            ? isSelected
                              ? 'text-white'
                              : 'text-gray-700'
                            : 'text-gray-300'
                        }`}
                        style={
                          todayDate
                            ? { backgroundColor: '#c9a84c' }
                            : isSelected
                            ? { backgroundColor: '#0f2a2a', color: 'white' }
                            : {}
                        }
                      >
                        {format(day, 'd')}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {daySessions.slice(0, 2).map((s) => (
                          <div
                            key={s.id}
                            className={`text-xs px-1 rounded truncate ${statusColors[s.status]}`}
                          >
                            {s.startTime} {patients.find((p) => p.id === s.patientId)?.name.split(' ')[0]}
                          </div>
                        ))}
                        {daySessions.length > 2 && (
                          <div className="text-xs text-gray-400">
                            +{daySessions.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side panel */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-base font-semibold text-gray-700"
                  style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                >
                  {selectedDate
                    ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                    : 'Selecione um dia'}
                </h3>
                {selectedDate && (
                  <button
                    onClick={() => openNewSession(selectedDate)}
                    className="p-1.5 rounded-lg text-white"
                    style={{ backgroundColor: '#3d7a6e' }}
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {selectedDateSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Nenhuma sessão neste dia
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateSessions
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((session) => {
                      const patient = patients.find((p) => p.id === session.patientId);
                      return (
                        <SessionCard
                          key={session.id}
                          session={session}
                          patientName={patient?.name ?? 'Paciente'}
                          onMarkStatus={handleMarkStatus}
                        />
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Day View */
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3
                className="text-base font-semibold text-gray-700"
                style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
              >
                {selectedDate
                  ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Selecione um dia no calendário'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setSelectedDate((prev) =>
                      prev ? addDays(prev, -1) : new Date()
                    )
                  }
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() =>
                    setSelectedDate((prev) =>
                      prev ? addDays(prev, 1) : new Date()
                    )
                  }
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[600px]">
              {TIME_SLOTS.map((time) => {
                const slotSession = selectedDate
                  ? selectedDateSessions.find((s) => s.startTime === time)
                  : null;

                return (
                  <div
                    key={time}
                    className="flex border-b border-gray-50 last:border-0 min-h-[56px]"
                  >
                    <div className="w-16 flex-shrink-0 flex items-start justify-end pr-4 pt-3">
                      <span className="text-xs text-gray-400">{time}</span>
                    </div>
                    <div className="flex-1 px-3 py-2">
                      {slotSession ? (
                        <SessionCard
                          session={slotSession}
                          patientName={
                            patients.find((p) => p.id === slotSession.patientId)?.name ?? 'Paciente'
                          }
                          onMarkStatus={handleMarkStatus}
                          compact
                        />
                      ) : (
                        <div
                          className="h-full rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() =>
                            selectedDate && openNewSession(selectedDate, time)
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Session Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title="Nova Sessão"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
            <select
              value={formData.patientId}
              onChange={(e) => {
                const patient = patients.find((p) => p.id === e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  patientId: e.target.value,
                  price: patient ? patient.sessionPrice.toString() : prev.price,
                }));
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent"
            >
              <option value="">Selecione...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="text-xs text-red-500 mt-1">{errors.patientId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.startTime && (
                <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="250"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Observações da sessão..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowSessionModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitSession}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: '#3d7a6e' }}
            >
              Agendar
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Pagamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Forma de pagamento para{' '}
            <span className="font-medium">
              {patients.find((p) => p.id === sessionToComplete?.patientId)?.name}
            </span>
            {sessionToComplete && (
              <span> — {formatCurrency(sessionToComplete.price)}</span>
            )}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['pix', 'cash', 'card', 'insurance'] as const).map((method) => {
                const labels = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão', insurance: 'Plano' };
                return (
                  <button
                    key={method}
                    onClick={() => setPaymentData({ paymentMethod: method })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      paymentData.paymentMethod === method
                        ? 'border-accent text-accent bg-green-50'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                    style={
                      paymentData.paymentMethod === method
                        ? { borderColor: '#3d7a6e', color: '#3d7a6e' }
                        : {}
                    }
                  >
                    {labels[method]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCompleteWithPayment}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#3d7a6e' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  patientName: string;
  onMarkStatus: (session: Session, status: Session['status']) => void;
  compact?: boolean;
}

function SessionCard({ session, patientName, onMarkStatus, compact }: SessionCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${statusColors[session.status]} ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{patientName}</p>
          <p className="opacity-70">
            {session.startTime} – {session.endTime}
          </p>
          {!compact && (
            <p className="font-medium mt-1" style={{ color: '#c9a84c' }}>
              {formatCurrency(session.price)}
            </p>
          )}
        </div>

        {session.status === 'scheduled' && (
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={() => onMarkStatus(session, 'completed')}
              title="Concluída"
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              <CheckCircle size={14} className="text-green-600" />
            </button>
            <button
              onClick={() => onMarkStatus(session, 'cancelled')}
              title="Cancelada"
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              <XCircle size={14} className="text-gray-500" />
            </button>
            <button
              onClick={() => onMarkStatus(session, 'no-show')}
              title="Não compareceu"
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              <AlertCircle size={14} className="text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
