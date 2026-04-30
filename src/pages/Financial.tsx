import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { Header } from '../components/Header';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { useClinicConfig } from '../hooks/useClinicConfig';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../utils/formatters';

const PIE_COLORS = ['#3d7a6e', '#c9a84c', '#0f2a2a', '#6b9e95'];

const methodLabels: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  card: 'Cartão',
  insurance: 'Plano de Saúde',
};

export function Financial() {
  const { patients } = usePatients();
  const { sessions } = useSessions();
  const { config, saveConfig } = useClinicConfig();
  const { addToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(config.monthlyGoal?.toString() ?? '');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const monthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= monthStart && d <= monthEnd;
  });

  const received = monthSessions
    .filter((s) => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.price, 0);

  const pending = monthSessions
    .filter((s) => s.paymentStatus === 'pending' && s.status === 'completed')
    .reduce((sum, s) => sum + s.price, 0);

  const goal = config.monthlyGoal ?? 0;
  const goalPercent = goal > 0 ? Math.min(Math.round((received / goal) * 100), 100) : 0;

  // Last 6 months line chart
  const lineData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(currentDate, 5 - i);
    const ms = startOfMonth(m);
    const me = endOfMonth(m);
    const mSessions = sessions.filter((s) => {
      const d = parseISO(s.date);
      return d >= ms && d <= me;
    });
    const rec = mSessions.filter((s) => s.paymentStatus === 'paid').reduce((sum, s) => sum + s.price, 0);
    const exp = mSessions
      .filter((s) => s.status === 'completed' || s.status === 'scheduled')
      .reduce((sum, s) => sum + s.price, 0);
    return {
      name: format(m, 'MMM', { locale: ptBR }),
      recebido: rec,
      esperado: exp,
    };
  });

  // Pie chart by payment method
  const paymentMethodCounts = sessions
    .filter((s) => s.paymentMethod && s.paymentStatus === 'paid')
    .reduce<Record<string, number>>((acc, s) => {
      const m = s.paymentMethod!;
      acc[m] = (acc[m] ?? 0) + s.price;
      return acc;
    }, {});

  const pieData = Object.entries(paymentMethodCounts).map(([method, value]) => ({
    name: methodLabels[method] ?? method,
    value,
  }));

  // Month transactions
  const transactions = monthSessions
    .filter((s) => s.paymentStatus === 'paid')
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSaveGoal = () => {
    const g = Number(goalInput);
    if (isNaN(g) || g < 0) {
      addToast('Meta inválida', 'error');
      return;
    }
    saveConfig({ ...config, monthlyGoal: g });
    addToast('Meta atualizada', 'success');
    setEditingGoal(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Financeiro" subtitle="Análise financeira da clínica" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Month nav */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-600 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-base font-semibold text-gray-700 capitalize min-w-48 text-center">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-gray-600 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Receita do Mês</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(received)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Pendente</p>
            <p className="text-2xl font-bold text-amber-500">{formatCurrency(pending)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">Meta Mensal</p>
              <button
                onClick={() => {
                  setGoalInput(config.monthlyGoal?.toString() ?? '');
                  setEditingGoal(true);
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                <Target size={12} />
              </button>
            </div>
            {editingGoal ? (
              <div className="flex gap-1">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveGoal();
                    if (e.key === 'Escape') setEditingGoal(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveGoal}
                  className="px-2 py-1 text-xs text-white rounded"
                  style={{ backgroundColor: '#3d7a6e' }}
                >
                  OK
                </button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-700">
                {goal > 0 ? formatCurrency(goal) : '—'}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">% da Meta</p>
            <p
              className="text-2xl font-bold"
              style={{ color: goalPercent >= 100 ? '#3d7a6e' : '#c9a84c' }}
            >
              {goal > 0 ? `${goalPercent}%` : '—'}
            </p>
            {goal > 0 && (
              <div className="mt-2 bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${goalPercent}%`,
                    backgroundColor: goalPercent >= 100 ? '#3d7a6e' : '#c9a84c',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Receita — Últimos 6 Meses
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val)), '']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recebido"
                  stroke="#3d7a6e"
                  strokeWidth={2.5}
                  dot={{ fill: '#3d7a6e', r: 4 }}
                  name="Recebido"
                />
                <Line
                  type="monotone"
                  dataKey="esperado"
                  stroke="#c9a84c"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Esperado"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Por Forma de Pagamento
            </h2>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2
              className="text-lg font-semibold text-gray-700"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Transações do Mês
            </h2>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Nenhuma transação neste mês
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Método
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Recibo
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((session) => {
                  const patient = patients.find((p) => p.id === session.patientId);
                  return (
                    <tr key={session.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(session.date)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {patient?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {session.paymentMethod
                          ? methodLabels[session.paymentMethod]
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-700">
                        {formatCurrency(session.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {session.receiptIssued ? (
                          <span className="text-xs text-green-600 font-medium">Emitido</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
