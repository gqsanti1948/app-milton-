import { useState } from 'react';
import { Download, DollarSign, FileText } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { useReceipts } from '../hooks/useReceipts';
import { useClinicConfig } from '../hooks/useClinicConfig';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generateReceiptPDF } from '../utils/pdf';
import { Session } from '../types';

const statusLabels: Record<Session['status'], string> = {
  scheduled: 'Agendada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  'no-show': 'Não compareceu',
};

const statusColors: Record<Session['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  'no-show': 'bg-red-100 text-red-600',
};

const paymentStatusColors: Record<Session['paymentStatus'], string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  waived: 'bg-gray-100 text-gray-500',
};

const paymentStatusLabels: Record<Session['paymentStatus'], string> = {
  paid: 'Pago',
  pending: 'Pendente',
  waived: 'Isento',
};

type SortKey = 'date' | 'patient' | 'price';
type SortDir = 'asc' | 'desc';

export function Sessions() {
  const { patients } = usePatients();
  const { sessions, updateSession } = useSessions();
  const { receipts, addReceipt, getNextReceiptNumber } = useReceipts();
  const { config } = useClinicConfig();
  const { addToast } = useToast();

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(today, 'yyyy-MM'));
  const [filterPatient, setFilterPatient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sessionToPay, setSessionToPay] = useState<Session | null>(null);
  const [payMethod, setPayMethod] = useState<Session['paymentMethod']>('pix');

  const filtered = sessions.filter((s) => {
    if (selectedMonth && !s.date.startsWith(selectedMonth)) return false;
    if (filterPatient && s.patientId !== filterPatient) return false;
    if (filterStatus && s.status !== filterStatus) return false;
    if (filterPayment && s.paymentStatus !== filterPayment) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date') {
      cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
    } else if (sortKey === 'patient') {
      const pa = patients.find((p) => p.id === a.patientId)?.name ?? '';
      const pb = patients.find((p) => p.id === b.patientId)?.name ?? '';
      cmp = pa.localeCompare(pb);
    } else if (sortKey === 'price') {
      cmp = a.price - b.price;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  // Metrics
  const monthStart = parseISO(selectedMonth + '-01');
  const monthEnd = endOfMonth(monthStart);
  const prevMonthStart = startOfMonth(subMonths(monthStart, 1));
  const prevMonthEnd = endOfMonth(subMonths(monthStart, 1));

  const currentMonthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= monthStart && d <= monthEnd;
  });
  const prevMonthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const completedCurrent = currentMonthSessions.filter((s) => s.status === 'completed');
  const noShowCurrent = currentMonthSessions.filter((s) => s.status === 'no-show');
  const prevTotal = prevMonthSessions.filter((s) => s.status === 'completed').reduce(
    (sum, s) => sum + s.price,
    0
  );
  const currentTotal = completedCurrent
    .filter((s) => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.price, 0);

  const noShowRate =
    currentMonthSessions.length > 0
      ? Math.round((noShowCurrent.length / currentMonthSessions.length) * 100)
      : 0;

  const daysInMonth = monthEnd.getDate();
  const dailyAvg = completedCurrent.length > 0 ? (completedCurrent.length / daysInMonth).toFixed(1) : '0';

  const handleMarkPaid = (session: Session) => {
    setSessionToPay(session);
    setPayMethod('pix');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!sessionToPay) return;
    updateSession({
      ...sessionToPay,
      paymentStatus: 'paid',
      paymentMethod: payMethod,
    });
    addToast('Pagamento registrado', 'success');
    setShowPaymentModal(false);
    setSessionToPay(null);
  };

  const handleIssueReceipt = (session: Session) => {
    const patient = patients.find((p) => p.id === session.patientId);
    if (!patient) return;

    const receiptNumber = getNextReceiptNumber();
    const receipt = {
      id: `rec-${Date.now()}`,
      sessionId: session.id,
      patientId: session.patientId,
      amount: session.price,
      issuedAt: new Date().toISOString(),
      description: `Consulta psiquiátrica - ${formatDate(session.date)}`,
      receiptNumber,
    };

    addReceipt(receipt);
    updateSession({ ...session, receiptIssued: true });

    const doc = generateReceiptPDF(receipt, patient, session, config);
    doc.save(`recibo-${receiptNumber}.pdf`);
    addToast(`Recibo ${receiptNumber} emitido`, 'success');
  };

  const handleExportCSV = () => {
    const BOM = '﻿';
    const headers = ['Data', 'Horário', 'Paciente', 'Status', 'Valor', 'Pagamento', 'Método'];
    const rows = sorted.map((s) => {
      const patient = patients.find((p) => p.id === s.patientId);
      const methodLabels: Record<string, string> = {
        pix: 'PIX',
        cash: 'Dinheiro',
        card: 'Cartão',
        insurance: 'Plano de Saúde',
      };
      return [
        formatDate(s.date),
        s.startTime,
        patient?.name ?? '',
        statusLabels[s.status],
        s.price.toString().replace('.', ','),
        paymentStatusLabels[s.paymentStatus],
        s.paymentMethod ? methodLabels[s.paymentMethod] : '',
      ];
    });

    const csv =
      BOM +
      [headers, ...rows]
        .map((r) => r.map((v) => `"${v}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessoes-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('CSV exportado com sucesso', 'success');
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Sessões" subtitle="Histórico e gestão de sessões" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
          />
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos os pacientes</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos os status</option>
            <option value="scheduled">Agendada</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
            <option value="no-show">Não compareceu</option>
          </select>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
          >
            <option value="">Todos os pagamentos</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
            <option value="waived">Isento</option>
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors ml-auto"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Média Diária</p>
            <p className="text-2xl font-bold text-gray-800">{dailyAvg}</p>
            <p className="text-xs text-gray-400">sessões/dia</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Total do Mês</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(currentTotal)}</p>
            <p className="text-xs text-gray-400">recebido</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Mês Anterior</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(prevTotal)}</p>
            <p className="text-xs text-gray-400">recebido</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">Taxa de Faltas</p>
            <p className="text-2xl font-bold text-gray-800">{noShowRate}%</p>
            <p className="text-xs text-gray-400">no-shows</p>
          </div>
        </div>

        {/* Table */}
        {sorted.length === 0 ? (
          <EmptyState
            title="Nenhuma sessão encontrada"
            description="Nenhuma sessão corresponde aos filtros selecionados."
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('date')}
                    >
                      Data {sortIcon('date')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Horário
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('patient')}
                    >
                      Paciente {sortIcon('patient')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Status
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => handleSort('price')}
                    >
                      Valor {sortIcon('price')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Pagamento
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((session) => {
                    const patient = patients.find((p) => p.id === session.patientId);
                    const hasReceipt = receipts.some((r) => r.sessionId === session.id);
                    return (
                      <tr key={session.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {formatDate(session.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{session.startTime}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {patient?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}
                          >
                            {statusLabels[session.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-right text-gray-700">
                          {formatCurrency(session.price)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatusColors[session.paymentStatus]}`}
                          >
                            {paymentStatusLabels[session.paymentStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {session.status === 'completed' &&
                              session.paymentStatus === 'pending' && (
                                <button
                                  onClick={() => handleMarkPaid(session)}
                                  className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                                >
                                  <DollarSign size={12} />
                                  Pagar
                                </button>
                              )}
                            {session.status === 'completed' &&
                              session.paymentStatus === 'paid' &&
                              !hasReceipt && (
                                <button
                                  onClick={() => handleIssueReceipt(session)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                >
                                  <FileText size={12} />
                                  Recibo
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Pagamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {sessionToPay ? formatDate(sessionToPay.date) : ''} —{' '}
            {sessionToPay ? formatCurrency(sessionToPay.price) : ''}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(['pix', 'cash', 'card', 'insurance'] as const).map((method) => {
              const labels = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão', insurance: 'Plano' };
              return (
                <button
                  key={method}
                  onClick={() => setPayMethod(method)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    payMethod === method ? '' : 'border-gray-200 text-gray-600'
                  }`}
                  style={payMethod === method ? { borderColor: '#4a90a4', color: '#4a90a4' } : {}}
                >
                  {labels[method]}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmPayment}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#4a90a4' }}
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
