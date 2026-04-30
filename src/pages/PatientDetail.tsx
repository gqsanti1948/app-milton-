import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Session, Patient } from '../types';

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

function formatCPFInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updatePatient, deletePatient, getPatientById } = usePatients();
  const { sessions, updateSession } = useSessions();
  const { addToast } = useToast();

  const patient = getPatientById(id ?? '');

  const [tab, setTab] = useState<'historico' | 'financeiro'>('historico');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Patient, 'id' | 'createdAt'> | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [notes, setNotes] = useState(patient?.notes ?? '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [sessionToPay, setSessionToPay] = useState<Session | null>(null);
  const [payMethod, setPayMethod] = useState<Session['paymentMethod']>('pix');

  useEffect(() => {
    if (patient) {
      setNotes(patient.notes ?? '');
    }
  }, [patient]);

  // Auto-save notes
  useEffect(() => {
    if (!patient) return;
    if (notes === (patient.notes ?? '')) return;
    const timer = setTimeout(() => {
      updatePatient({ ...patient, notes });
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes, patient, updatePatient]);

  if (!patient) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Paciente não encontrado" />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Paciente não encontrado"
            description="O paciente solicitado não existe ou foi removido."
            actionLabel="Voltar para Pacientes"
            onAction={() => navigate('/pacientes')}
          />
        </div>
      </div>
    );
  }

  const patientSessions = sessions
    .filter((s) => s.patientId === patient.id)
    .filter((s) => (statusFilter ? s.status === statusFilter : true))
    .filter((s) => {
      if (!monthFilter) return true;
      return s.date.startsWith(monthFilter);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const allPatientSessions = sessions.filter((s) => s.patientId === patient.id);

  const totalPaid = allPatientSessions
    .filter((s) => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.price, 0);
  const totalPending = allPatientSessions
    .filter((s) => s.paymentStatus === 'pending' && s.status === 'completed')
    .reduce((sum, s) => sum + s.price, 0);

  const paymentMethods = allPatientSessions
    .filter((s) => s.paymentMethod)
    .reduce<Record<string, number>>((acc, s) => {
      const m = s.paymentMethod!;
      acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {});

  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    card: 'Cartão',
    insurance: 'Plano de Saúde',
  };

  const hasSessions = allPatientSessions.length > 0;

  const openEditModal = () => {
    setEditForm({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      cpf: patient.cpf,
      dateOfBirth: patient.dateOfBirth,
      sessionPrice: patient.sessionPrice,
      healthInsurance: patient.healthInsurance ?? '',
      notes: patient.notes ?? '',
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  const handleEditSubmit = () => {
    if (!editForm) return;
    const newErrors: Record<string, string> = {};
    if (!editForm.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!editForm.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (editForm.cpf.replace(/\D/g, '').length !== 11) newErrors.cpf = 'CPF deve ter 11 dígitos';
    if (!editForm.sessionPrice || editForm.sessionPrice <= 0)
      newErrors.sessionPrice = 'Valor inválido';
    setEditErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    updatePatient({
      ...patient,
      ...editForm,
      healthInsurance: (editForm.healthInsurance as string) || undefined,
    });
    addToast('Paciente atualizado com sucesso', 'success');
    setShowEditModal(false);
  };

  const handleDelete = () => {
    deletePatient(patient.id);
    addToast('Paciente removido', 'info');
    navigate('/pacientes');
  };

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

  // Month options for filter
  const monthOptions = Array.from(
    new Set(allPatientSessions.map((s) => s.date.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col h-full">
      <Header
        title={patient.name}
        subtitle={`${patient.cpf} • ${patient.phone}`}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Action bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/pacientes')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={openEditModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit size={14} />
              Editar
            </button>
            {!hasSessions && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Excluir
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Patient info card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">E-mail</p>
              <p className="text-sm text-gray-700">{patient.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Data de Nascimento</p>
              <p className="text-sm text-gray-700">
                {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Plano de Saúde</p>
              <p className="text-sm text-gray-700">{patient.healthInsurance || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Valor da Sessão</p>
              <p className="text-sm font-semibold" style={{ color: '#c8784a' }}>
                {formatCurrency(patient.sessionPrice)}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Observações (salva automaticamente)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anotações sobre o paciente..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-100 p-1 w-fit">
            <button
              onClick={() => setTab('historico')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'historico' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={tab === 'historico' ? { backgroundColor: '#112233' } : {}}
            >
              Histórico
            </button>
            <button
              onClick={() => setTab('financeiro')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'financeiro' ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              style={tab === 'financeiro' ? { backgroundColor: '#112233' } : {}}
            >
              Financeiro
            </button>
          </div>

          {tab === 'historico' && (
            <div>
              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
                >
                  <option value="">Todos os status</option>
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Concluída</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="no-show">Não compareceu</option>
                </select>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700"
                >
                  <option value="">Todos os meses</option>
                  {monthOptions.map((m) => {
                    const [y, mo] = m.split('-');
                    const date = new Date(Number(y), Number(mo) - 1, 1);
                    return (
                      <option key={m} value={m}>
                        {format(date, 'MMMM/yyyy', { locale: ptBR })}
                      </option>
                    );
                  })}
                </select>
              </div>

              {patientSessions.length === 0 ? (
                <EmptyState
                  title="Nenhuma sessão encontrada"
                  description="Nenhuma sessão corresponde aos filtros selecionados."
                />
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Data
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Horário
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Pagamento
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Valor
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {patientSessions.map((session) => (
                        <tr key={session.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(session.date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {session.startTime}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}
                            >
                              {statusLabels[session.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatusColors[session.paymentStatus]}`}
                            >
                              {paymentStatusLabels[session.paymentStatus]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-right text-gray-700">
                            {formatCurrency(session.price)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {session.status === 'completed' &&
                              session.paymentStatus === 'pending' && (
                                <button
                                  onClick={() => handleMarkPaid(session)}
                                  className="text-xs text-green-600 hover:underline flex items-center gap-1"
                                >
                                  <DollarSign size={12} />
                                  Marcar Pago
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'financeiro' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">Total Recebido</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">Total Pendente</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <p className="text-xs text-gray-400 mb-1">Total de Sessões</p>
                  <p className="text-2xl font-bold text-gray-700">{allPatientSessions.length}</p>
                </div>
              </div>

              {Object.keys(paymentMethods).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3
                    className="text-base font-semibold text-gray-700 mb-4"
                    style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
                  >
                    Formas de Pagamento
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(paymentMethods).map(([method, count]) => (
                      <div key={method} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-28">
                          {methodLabels[method] ?? method}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              backgroundColor: '#4a90a4',
                              width: `${(count / allPatientSessions.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-8 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editForm && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Paciente"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {editErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                <input
                  type="text"
                  value={editForm.cpf}
                  onChange={(e) =>
                    setEditForm((f) => f && { ...f, cpf: formatCPFInput(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {editErrors.cpf && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.cpf}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) =>
                    setEditForm((f) => f && { ...f, dateOfBirth: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f && { ...f, phone: formatPhoneInput(e.target.value) }
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {editErrors.phone && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => f && { ...f, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {editErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Sessão (R$) *
                </label>
                <input
                  type="number"
                  value={editForm.sessionPrice}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f && { ...f, sessionPrice: Number(e.target.value) }
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                {editErrors.sessionPrice && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.sessionPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plano de Saúde
                </label>
                <input
                  type="text"
                  value={editForm.healthInsurance as string}
                  onChange={(e) =>
                    setEditForm((f) => f && { ...f, healthInsurance: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: '#4a90a4' }}
              >
                Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Registrar Pagamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sessão de {sessionToPay ? formatDate(sessionToPay.date) : ''} —{' '}
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
                    payMethod === method
                      ? 'border-accent text-accent'
                      : 'border-gray-200 text-gray-600'
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

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Excluir Paciente"
        message={`Deseja realmente excluir o paciente "${patient.name}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
}
