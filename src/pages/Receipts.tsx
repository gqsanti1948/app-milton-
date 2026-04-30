import { useState } from 'react';
import { FileText, Download, Eye, Plus } from 'lucide-react';
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

export function Receipts() {
  const { patients } = usePatients();
  const { sessions, updateSession } = useSessions();
  const { receipts, addReceipt, getNextReceiptNumber } = useReceipts();
  const { config } = useClinicConfig();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const filtered = receipts.filter((r) => {
    const patient = patients.find((p) => p.id === r.patientId);
    const patientName = patient?.name.toLowerCase() ?? '';
    const receiptNum = r.receiptNumber.toLowerCase();
    const q = search.toLowerCase();
    return patientName.includes(q) || receiptNum.includes(q);
  });

  const sortedReceipts = [...filtered].sort((a, b) =>
    b.issuedAt.localeCompare(a.issuedAt)
  );

  // Paid sessions without receipt
  const sessionsWithoutReceipt = sessions.filter(
    (s) =>
      s.status === 'completed' &&
      s.paymentStatus === 'paid' &&
      !s.receiptIssued &&
      !receipts.some((r) => r.sessionId === s.id)
  );

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  const handleIssueReceipt = () => {
    if (!selectedSessionId) {
      addToast('Selecione uma sessão', 'warning');
      return;
    }

    const session = sessions.find((s) => s.id === selectedSessionId);
    if (!session) return;

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
    setShowIssueModal(false);
    setSelectedSessionId('');
  };

  const handleViewPDF = (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;
    const patient = patients.find((p) => p.id === receipt.patientId);
    const session = sessions.find((s) => s.id === receipt.sessionId);
    if (!patient || !session) return;

    const doc = generateReceiptPDF(receipt, patient, session, config);
    const url = doc.output('bloburl') as unknown as string;
    window.open(url, '_blank');
  };

  const handleDownloadPDF = (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;
    const patient = patients.find((p) => p.id === receipt.patientId);
    const session = sessions.find((s) => s.id === receipt.sessionId);
    if (!patient || !session) return;

    const doc = generateReceiptPDF(receipt, patient, session, config);
    doc.save(`recibo-${receipt.receiptNumber}.pdf`);
    addToast('PDF baixado', 'success');
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Recibos"
        subtitle="Gerencie e emita recibos de consulta"
        actionButton={{
          label: 'Emitir Recibo',
          onClick: () => {
            setSelectedSessionId('');
            setShowIssueModal(true);
          },
          icon: Plus,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#3d7a6e22' }}
            >
              <FileText size={18} style={{ color: '#3d7a6e' }} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total de Recibos</p>
              <p className="text-2xl font-bold text-gray-800">{receipts.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#c9a84c22' }}
            >
              <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>R$</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">Valor Total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por paciente ou número do recibo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400"
          />
        </div>

        {sortedReceipts.length === 0 ? (
          <EmptyState
            title="Nenhum recibo encontrado"
            description={
              search ? 'Tente buscar por outro termo' : 'Nenhum recibo foi emitido ainda'
            }
            actionLabel={search ? undefined : 'Emitir Recibo'}
            onAction={
              search
                ? undefined
                : () => {
                    setSelectedSessionId('');
                    setShowIssueModal(true);
                  }
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Data de Emissão
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Data da Sessão
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedReceipts.map((receipt) => {
                  const patient = patients.find((p) => p.id === receipt.patientId);
                  const session = sessions.find((s) => s.id === receipt.sessionId);
                  return (
                    <tr key={receipt.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-mono font-medium"
                          style={{ color: '#0f2a2a' }}
                        >
                          {receipt.receiptNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {patient?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(receipt.issuedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {session ? formatDate(session.date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewPDF(receipt.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Eye size={12} />
                            Ver
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(receipt.id)}
                            className="flex items-center gap-1 text-xs text-gray-600 hover:underline"
                          >
                            <Download size={12} />
                            Baixar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Receipt Modal */}
      <Modal
        isOpen={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        title="Emitir Recibo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecione uma sessão paga para gerar o recibo:
          </p>

          {sessionsWithoutReceipt.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6">
              Todas as sessões pagas já possuem recibo emitido.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessionsWithoutReceipt
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((session) => {
                  const patient = patients.find((p) => p.id === session.patientId);
                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSessionId === session.id
                          ? 'border-accent bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={
                        selectedSessionId === session.id
                          ? { borderColor: '#3d7a6e', backgroundColor: '#f0faf8' }
                          : {}
                      }
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {patient?.name ?? 'Paciente'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.date)} às {session.startTime}
                        </p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: '#c9a84c' }}>
                        {formatCurrency(session.price)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowIssueModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleIssueReceipt}
              disabled={!selectedSessionId || sessionsWithoutReceipt.length === 0}
              className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#3d7a6e' }}
            >
              Gerar e Baixar PDF
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
