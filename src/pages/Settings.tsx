import { useState, useRef } from 'react';
import { Download, Upload, Save } from 'lucide-react';
import { Header } from '../components/Header';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useClinicConfig } from '../hooks/useClinicConfig';
import { useToast } from '../hooks/useToast';
import { exportAllData, importAllData } from '../utils/storage';
import { ClinicConfig } from '../types';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Settings() {
  const { config, saveConfig } = useClinicConfig();
  const { addToast } = useToast();

  const [form, setForm] = useState<ClinicConfig>({ ...config });
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof ClinicConfig, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleWorkingDayToggle = (day: number) => {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter((d) => d !== day)
      : [...form.workingDays, day].sort();
    handleChange('workingDays', days);
  };

  const handleSave = () => {
    if (!form.psychiatristName.trim()) {
      addToast('Nome do psiquiatra é obrigatório', 'error');
      return;
    }
    if (!form.crm.trim()) {
      addToast('CRM é obrigatório', 'error');
      return;
    }
    saveConfig(form);
    addToast('Configurações salvas com sucesso', 'success');
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psimanager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Dados exportados com sucesso', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setPendingImport(content);
      setShowImportConfirm(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    try {
      importAllData(pendingImport);
      addToast('Dados importados com sucesso. Recarregue a página.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      addToast('Erro ao importar dados. Verifique o arquivo.', 'error');
    }
    setPendingImport(null);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configurações"
        subtitle="Dados da clínica e preferências"
        actionButton={{
          label: 'Salvar',
          onClick: handleSave,
          icon: Save,
        }}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Clinic Info */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Dados do Profissional
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Nome do Psiquiatra *
                  </label>
                  <input
                    type="text"
                    value={form.psychiatristName}
                    onChange={(e) => handleChange('psychiatristName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">CRM *</label>
                  <input
                    type="text"
                    value={form.crm}
                    onChange={(e) => handleChange('crm', e.target.value)}
                    placeholder="CRM/SP 123456"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">CFM</label>
                  <input
                    type="text"
                    value={form.cfm ?? ''}
                    onChange={(e) => handleChange('cfm', e.target.value || undefined)}
                    placeholder="CFM 123456"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={form.cnpj ?? ''}
                    onChange={(e) => handleChange('cnpj', e.target.value || undefined)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Schedule Settings */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Agenda
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Dias de Atendimento
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_NAMES.map((name, day) => (
                    <button
                      key={day}
                      onClick={() => handleWorkingDayToggle(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.workingDays.includes(day)
                          ? 'text-white border-transparent'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      style={
                        form.workingDays.includes(day)
                          ? { backgroundColor: '#0f2a2a' }
                          : {}
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Início do Expediente
                  </label>
                  <input
                    type="time"
                    value={form.workingHours.start}
                    onChange={(e) =>
                      handleChange('workingHours', {
                        ...form.workingHours,
                        start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Fim do Expediente
                  </label>
                  <input
                    type="time"
                    value={form.workingHours.end}
                    onChange={(e) =>
                      handleChange('workingHours', {
                        ...form.workingHours,
                        end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Financial Settings */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Financeiro
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Valor Padrão da Sessão (R$)
                </label>
                <input
                  type="number"
                  value={form.defaultSessionPrice}
                  onChange={(e) =>
                    handleChange('defaultSessionPrice', Number(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Meta Mensal (R$)
                </label>
                <input
                  type="number"
                  value={form.monthlyGoal ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'monthlyGoal',
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="Ex: 8000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="bg-white rounded-xl border border-gray-100 p-6">
            <h2
              className="text-lg font-semibold text-gray-700 mb-4"
              style={{ fontFamily: '"Cormorant Garamond", Georgia, serif' }}
            >
              Dados
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Exporte todos os dados como JSON para backup ou importe um arquivo de backup.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={16} />
                Exportar Dados (JSON)
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Upload size={16} />
                Importar Dados (JSON)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </section>

          {/* Save button (bottom) */}
          <div className="flex justify-end pb-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium transition-colors"
              style={{ backgroundColor: '#3d7a6e' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2d5e55';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3d7a6e';
              }}
            >
              <Save size={16} />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => {
          setShowImportConfirm(false);
          setPendingImport(null);
        }}
        onConfirm={handleConfirmImport}
        title="Importar Dados"
        message="Atenção: importar dados irá SUBSTITUIR todos os dados atuais (pacientes, sessões, recibos e configurações). Esta ação não pode ser desfeita. Deseja continuar?"
      />
    </div>
  );
}
