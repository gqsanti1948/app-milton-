import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfWeek, addDays, isToday, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, TrendingUp, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { usePatients } from '../hooks/usePatients';
import { useSessions } from '../hooks/useSessions';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  cancelled: 'bg-gray-100 text-gray-600',
  'no-show': 'bg-red-100 text-red-700',
};

export function Dashboard() {
  const { patients } = usePatients();
  const { sessions } = useSessions();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const today = format(currentTime, 'yyyy-MM-dd');
  const todaySessions = sessions.filter((s) => s.date === today);

  const monthStart = startOfMonth(currentTime);
  const monthEnd = endOfMonth(currentTime);
  const monthSessions = sessions.filter((s) => {
    const d = parseISO(s.date);
    return d >= monthStart && d <= monthEnd;
  });

  const completedThisMonth = monthSessions.filter((s) => s.status === 'completed');
  const cancelledOrNoShow = monthSessions.filter(
    (s) => s.status === 'cancelled' || s.status === 'no-show'
  );
  const receivedRevenue = completedThisMonth
    .filter((s) => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.price, 0);
  const pendingRevenue = completedThisMonth
    .filter((s) => s.paymentStatus === 'pending')
    .reduce((sum, s) => sum + s.price, 0);

  // Weekly bar chart data
  const weekStart = startOfWeek(currentTime, { weekStartsOn: 1 });
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const count = sessions.filter((s) => s.date === dateStr && s.status !== 'cancelled').length;
    return {
      name: format(day, 'EEE', { locale: ptBR }),
      sessoes: count,
      isToday: isToday(day),
    };
  });

  // Upcoming sessions (next 3 scheduled)
  const upcoming = sessions
    .filter((s) => s.status === 'scheduled' && s.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 3);

  // Recent activity (last 5 paid or completed)
  const recentActivity = sessions
    .filter((s) => s.status === 'completed' || s.paymentStatus === 'paid')
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
    .slice(0, 5);

  const todayExpected = todaySessions
    .filter((s) => s.status === 'scheduled' || s.status === 'completed')
    .reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Visão geral da clínica" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Date/Time + Today's Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {/* Current Time */}
          <div
            className="lg:col-span-1 rounded-xl p-5 text-white flex flex-col justify-between"
            style={{ backgroundColor: '#112233' }}
          >
            <div className="flex items-center gap-2 opacity-70">
              <Clock size={14} />
              <span className="text-xs uppercase tracking-wide">Agora</span>
            </div>
            <div>
              <p className="text-3xl font-bold mt-2">{format(currentTime, 'HH:mm')}</p>
              <p className="text-sm opacity-60 mt-1 capitalize">
                {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-3">
              <Calendar size={14} />
              <span className="text-xs uppercase tracking-wide">Hoje</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{todaySessions.length}</p>
            <p className="text-sm text-gray-500">sessões agendadas</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-3">
              <Users size={14} />
              <span className="text-xs uppercase tracking-wide">Pacientes Ativos</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{patients.length}</p>
            <p className="text-sm text-gray-500">cadastrados</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-3">
              <TrendingUp size={14} />
              <span className="text-xs uppercase tracking-wide">Receita Hoje</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(todayExpected)}</p>
            <p className="text-sm text-gray-500">previsto</p>
          </div>
        </div>

        {/* Monthly Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{completedThisMonth.length}</p>
            <p className="text-xs text-gray-400">este mês</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={16} className="text-red-500" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Faltas/Cancel.</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{cancelledOrNoShow.length}</p>
            <p className="text-xs text-gray-400">este mês</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#c8784a22' }}
              >
                <TrendingUp size={16} style={{ color: '#c8784a' }} />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Recebido</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(receivedRevenue)}</p>
            <p className="text-xs text-gray-400">este mês</p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={16} className="text-amber-500" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Pendente</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(pendingRevenue)}</p>
            <p className="text-xs text-gray-400">a receber</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Sessões por Dia — Esta Semana
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f0f4f7' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-100 text-sm">
                          <p className="font-medium text-gray-700">
                            {payload[0].value} sessão(ões)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="sessoes"
                  fill="#4a90a4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Próximas Sessões
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma sessão agendada</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((session) => {
                  const patient = patients.find((p) => p.id === session.patientId);
                  return (
                    <div
                      key={session.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#4a90a4' }}
                      >
                        {patient?.name.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {patient?.name ?? 'Paciente'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.date)} às {session.startTime}
                        </p>
                        <p className="text-xs font-medium" style={{ color: '#c8784a' }}>
                          {formatCurrency(session.price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-xl p-6 border border-gray-100">
          <h2
            className="text-lg font-semibold text-gray-700 mb-4"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
          >
            Atividade Recente
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((session) => {
                const patient = patients.find((p) => p.id === session.patientId);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          session.paymentStatus === 'paid'
                            ? 'bg-green-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {patient?.name ?? 'Paciente'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(session.date)} às {session.startTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status]}`}
                      >
                        {statusLabels[session.status]}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(session.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
