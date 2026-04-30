import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Mail, Calendar } from 'lucide-react';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Patient } from '../types';

interface PatientFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  dateOfBirth: string;
  sessionPrice: string;
  healthInsurance: string;
  notes: string;
}

const initialForm: PatientFormData = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  dateOfBirth: '',
  sessionPrice: '',
  healthInsurance: '',
  notes: '',
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

export function Patients() {
  const navigate = useNavigate();
  const { patients, addPatient } = usePatients();
  const { sessions } = useSessions();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<PatientFormData>>({});

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<PatientFormData> = {};
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.phone.trim()) newErrors.phone = 'Telefone é obrigatório';
    if (!formData.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (formData.cpf.replace(/\D/g, '').length !== 11) newErrors.cpf = 'CPF deve ter 11 dígitos';
    if (!formData.sessionPrice || Number(formData.sessionPrice) <= 0) {
      newErrors.sessionPrice = 'Valor da sessão é obrigatório';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const patient: Patient = {
      id: `pat-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      cpf: formData.cpf.trim(),
      dateOfBirth: formData.dateOfBirth,
      sessionPrice: Number(formData.sessionPrice),
      healthInsurance: formData.healthInsurance.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addPatient(patient);
    addToast(`Paciente ${patient.name} cadastrado com sucesso`, 'success');
    setShowModal(false);
    setFormData(initialForm);
    setErrors({});
  };

  const getPatientStats = (patientId: string) => {
    const patientSessions = sessions.filter((s) => s.patientId === patientId);
    const nextSession = patientSessions
      .filter((s) => s.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const pending = patientSessions
      .filter((s) => s.paymentStatus === 'pending' && s.status === 'completed')
      .reduce((sum, s) => sum + s.price, 0);

    return { count: patientSessions.length, nextSession, pending };
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Pacientes"
        subtitle="Gerencie seus pacientes"
        actionButton={{
          label: 'Novo Paciente',
          onClick: () => {
            setFormData(initialForm);
            setErrors({});
            setShowModal(true);
          },
          icon: Plus,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:outline-none"
            style={{ maxWidth: '320px' }}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhum paciente encontrado"
            description={
              search
                ? 'Tente buscar por outro nome'
                : 'Cadastre seu primeiro paciente para começar'
            }
            actionLabel={search ? undefined : 'Cadastrar Paciente'}
            onAction={
              search
                ? undefined
                : () => {
                    setFormData(initialForm);
                    setErrors({});
                    setShowModal(true);
                  }
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((patient) => {
              const { count, nextSession, pending } = getPatientStats(patient.id);
              return (
                <div
                  key={patient.id}
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                  className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: '#4a90a4' }}
                    >
                      {patient.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 truncate">{patient.name}</h3>
                      {patient.healthInsurance && (
                        <span className="text-xs text-gray-400">{patient.healthInsurance}</span>
                      )}
                    </div>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: '#c8784a' }}
                    >
                      {formatCurrency(patient.sessionPrice)}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    {patient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gray-400 flex-shrink-0" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{patient.email}</span>
                      </div>
                    )}
                    {nextSession && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                        <span>Próxima: {formatDate(nextSession.date)} {nextSession.startTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{count} sessão(ões)</span>
                    {pending > 0 && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {formatCurrency(pending)} pendente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Patient Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Paciente"
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
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ana Clara Ferreira"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cpf: formatCPFInput(e.target.value) }))
                }
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dateOfBirth: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    phone: formatPhoneInput(e.target.value),
                  }))
                }
                placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="paciente@email.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor da Sessão (R$) *
              </label>
              <input
                type="number"
                value={formData.sessionPrice}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sessionPrice: e.target.value }))
                }
                placeholder="250"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {errors.sessionPrice && (
                <p className="text-xs text-red-500 mt-1">{errors.sessionPrice}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plano de Saúde
              </label>
              <input
                type="text"
                value={formData.healthInsurance}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, healthInsurance: e.target.value }))
                }
                placeholder="Amil, Unimed..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                placeholder="Observações relevantes sobre o paciente..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#4a90a4' }}
            >
              Cadastrar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
