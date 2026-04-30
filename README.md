# PsiManager

Sistema de gestão para consultório psiquiátrico. Aplicação web client-side completa para controle de pacientes, agenda, sessões, financeiro e emissão de recibos — sem nenhum backend ou servidor necessário.

---

## Visão Geral

O PsiManager foi desenvolvido para que psiquiatras e terapeutas possam gerenciar seu consultório de forma independente, sem depender de assinaturas de plataformas externas ou conexão com servidores. Todos os dados ficam armazenados localmente no navegador via `localStorage`, com opção de exportação em JSON para backup.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework UI | React 18 + TypeScript |
| Roteamento | React Router DOM v7 |
| Estilização | Tailwind CSS v3 |
| Gráficos | Recharts |
| Manipulação de datas | date-fns (locale pt-BR) |
| Ícones | lucide-react |
| Geração de PDF | jsPDF + html2canvas |
| Build tool | Vite |
| Persistência | localStorage (100% client-side) |

---

## Pré-requisitos

- Node.js 18+ 
- npm 9+

---

## Instalação e Execução

```bash
# Clone o repositório
git clone <url-do-repo>
cd app-milton-

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:5173` no navegador.

```bash
# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis globais
│   ├── Sidebar.tsx         # Navegação lateral fixa
│   ├── Header.tsx          # Cabeçalho de cada página
│   ├── Modal.tsx           # Modal reutilizável com backdrop
│   ├── ConfirmDialog.tsx   # Diálogo de confirmação para exclusões
│   ├── Toast.tsx           # Componente de notificação individual
│   ├── ToastProvider.tsx   # Context provider para toasts globais
│   ├── EmptyState.tsx      # Placeholder para listas vazias
│   └── LoadingSpinner.tsx  # Indicador de carregamento
│
├── pages/              # Páginas da aplicação (uma por rota)
│   ├── Dashboard.tsx       # Visão geral do dia e do mês
│   ├── Agenda.tsx          # Calendário e agendamento de sessões
│   ├── Patients.tsx        # Lista e cadastro de pacientes
│   ├── PatientDetail.tsx   # Perfil detalhado de um paciente
│   ├── Sessions.tsx        # Controle e filtragem de sessões
│   ├── Financial.tsx       # Fluxo de caixa e gráficos financeiros
│   ├── Receipts.tsx        # Emissão e download de recibos em PDF
│   └── Settings.tsx        # Configurações do consultório
│
├── hooks/              # Hooks customizados com lógica de negócio
│   ├── usePatients.ts      # CRUD de pacientes + persistência
│   ├── useSessions.ts      # CRUD de sessões + verificação de conflito
│   ├── useReceipts.ts      # CRUD de recibos + numeração sequencial
│   ├── useClinicConfig.ts  # Leitura e escrita das configurações
│   └── useToast.ts         # Gerenciamento de notificações toast
│
├── utils/              # Funções utilitárias puras
│   ├── formatters.ts       # Formatação de moeda, datas e número por extenso
│   ├── storage.ts          # Abstração de leitura/escrita no localStorage
│   └── pdf.ts              # Geração de recibos em PDF via jsPDF
│
├── types/
│   └── index.ts            # Interfaces TypeScript de todos os modelos
│
├── data/
│   └── seed.ts             # Dados iniciais para popular o app na primeira execução
│
├── App.tsx             # Roteamento principal e layout base
├── main.tsx            # Entry point da aplicação
└── index.css           # Estilos globais, variáveis CSS e animações
```

---

## Modelos de Dados

Todos os dados são tipados com TypeScript e persistidos em `localStorage` com chaves separadas.

### Patient
```typescript
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  dateOfBirth: string;
  sessionPrice: number;      // valor padrão por sessão deste paciente
  healthInsurance?: string;
  notes?: string;
  createdAt: string;
}
```
Chave no localStorage: `psimanager_patients`

### Session
```typescript
interface Session {
  id: string;
  patientId: string;
  date: string;              // YYYY-MM-DD
  startTime: string;         // "HH:mm"
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'waived';
  paymentMethod?: 'pix' | 'cash' | 'card' | 'insurance';
  receiptIssued: boolean;
}
```
Chave no localStorage: `psimanager_sessions`

### Receipt
```typescript
interface Receipt {
  id: string;
  sessionId: string;
  patientId: string;
  amount: number;
  issuedAt: string;
  description: string;
  receiptNumber: string;     // formato: "REC-YYYY-NNN"
}
```
Chave no localStorage: `psimanager_receipts`

### ClinicConfig
```typescript
interface ClinicConfig {
  psychiatristName: string;
  crm: string;
  cfm?: string;
  address: string;
  phone: string;
  email: string;
  cnpj?: string;
  defaultSessionPrice: number;
  workingHours: { start: string; end: string };
  workingDays: number[];     // 0=Dom, 1=Seg, ..., 6=Sáb
  monthlyGoal?: number;
}
```
Chave no localStorage: `psimanager_config`

---

## Páginas e Funcionalidades

### Dashboard `/`
Painel com visão imediata do dia e do mês corrente:
- Data e hora atuais (atualiza a cada minuto)
- Sessões do dia: quantidade, horários e receita esperada
- Cards com métricas do mês: sessões realizadas, canceladas/no-show, receita recebida e pendente
- Próximas 3 sessões agendadas
- Gráfico de barras (Recharts) com sessões por dia na semana atual
- Lista das últimas atividades (pagamentos e sessões concluídas)

### Agenda `/agenda`
Duas visualizações alternáveis:

**Visão Mensal:**
- Grid de calendário com navegação por mês
- Dias com sessões agendadas são destacados visualmente
- Clique em um dia para ver o painel lateral com as sessões daquele dia

**Visão Diária:**
- Linha do tempo das 07h às 22h em blocos de 1 hora
- Sessões renderizadas como cards no horário correto
- Slots vazios clicáveis para abertura direta do modal de agendamento

**Modal de Nova Sessão:**
- Seleção de paciente com dropdown pesquisável
- Data, horário de início e fim
- Preço pré-preenchido com o valor padrão do paciente
- Verificação automática de conflito de horário

**Ações por sessão:**
- Marcar como Realizada → abre modal de registro de pagamento
- Marcar como Cancelada
- Marcar como No-show
- Filtro de visualização por paciente

### Pacientes `/pacientes`
- Busca por nome em tempo real
- Cards com: nome, telefone, próxima sessão, total de sessões e valor em aberto
- Formulário de cadastro com validação inline: nome, e-mail, telefone (com máscara), CPF, data de nascimento, valor de sessão, convênio, observações
- Navegação para a página de detalhe ao clicar no card

### Detalhe do Paciente `/pacientes/:id`
- Dados cadastrais com botão de edição
- Aba **Histórico**: tabela completa de sessões com filtro por status e mês, ações rápidas por linha
- Aba **Financeiro**: resumo de total pago, pendente e número de sessões; breakdown por forma de pagamento
- Campo de anotações gerais com salvamento automático (debounce de 1 segundo)
- Exclusão do paciente com modal de confirmação (apenas se não houver sessões vinculadas)

### Sessões `/sessoes`
- Tabela filtrável com: mês, paciente, status e status de pagamento
- Métricas no topo: média diária, total do mês atual vs anterior, taxa de no-show
- Ações por linha: marcar pago, emitir recibo, ver detalhes
- Exportação da lista filtrada como CSV (com BOM UTF-8 para compatibilidade com Excel)

### Financeiro `/financeiro`
- Navegação por mês com setas
- Cards de resumo: Receita do Mês, Pendente, Meta Mensal (editável), % da Meta
- Gráfico de linha (Recharts): receita recebida vs esperada nos últimos 6 meses
- Gráfico de pizza (Recharts): distribuição por forma de pagamento (Pix, Dinheiro, Cartão, Convênio)
- Tabela de lançamentos do mês selecionado

### Recibos `/recibos`
- Busca por nome do paciente ou número do recibo
- Tabela com: número, paciente, data de emissão, valor, data da sessão
- Botões por linha: Visualizar PDF (abre em nova aba) e Baixar PDF
- Modal "Emitir Recibo" para sessões pagas sem recibo

**Formato do PDF gerado:**
- Cabeçalho com nome do médico, CRM, endereço e telefone
- Número sequencial no formato `REC-YYYY-NNN`
- Nome e CPF do paciente
- Descrição: "Consulta psiquiátrica — [data da sessão]"
- Valor em algarismos e por extenso em português
- Linha para assinatura e data de emissão
- Layout A4 com margens e tipografia profissional

### Configurações `/configuracoes`
- Formulário completo dos dados do consultório (todos os campos de `ClinicConfig`)
- Seleção de dias úteis de atendimento (checkboxes Seg–Dom)
- Horário de funcionamento (início/fim)
- Valor padrão de sessão e meta mensal
- **Exportar backup:** baixa todos os dados como `psimanager-backup.json`
- **Importar backup:** carrega um JSON de backup com confirmação antes de sobrescrever

---

## Regras de Negócio

1. **Conflito de horário** — ao tentar agendar uma sessão em horário já ocupado, o sistema alerta e impede o salvamento.
2. **Registro de pagamento** — ao marcar uma sessão como "Realizada", um modal solicita imediatamente o registro do pagamento (forma e valor).
3. **Emissão de recibo** — só é possível para sessões com `paymentStatus === 'paid'`. Uma sessão só pode ter um recibo.
4. **Numeração de recibos** — sequencial global por ano: `REC-2026-001`, `REC-2026-002`, etc.
5. **No-show** — pode ter valor cobrado (paymentStatus = `pending`) ou dispensado (`waived`).
6. **Exclusão de paciente** — bloqueada se existirem sessões vinculadas ao paciente.
7. **Backup/importação** — a importação de JSON sobrescreve todos os dados; o sistema exige confirmação explícita.

---

## Identidade Visual

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#112233` | Sidebar, backgrounds escuros |
| `primary-light` | `#1c3352` | Hover na sidebar |
| `accent` | `#4a90a4` | Botões, links ativos, acentos |
| `gold` | `#c8784a` | Destaques, estado ativo, badges |
| `background` | `#f0f4f7` | Fundo geral das páginas |

**Tipografia:**
- Títulos (`h1`–`h4`): *Cormorant Garamond* (Google Fonts)
- Corpo e UI: *DM Sans* (Google Fonts)

---

## Dados de Exemplo (Seed)

Na primeira execução com `localStorage` vazio, o app popula automaticamente:

- **3 pacientes:** Ana Clara Ferreira, Bruno Mendes Costa, Carla Duarte Santos
- **12 sessões** nos últimos 30 dias com mix de status (`completed`, `scheduled`, `cancelled`, `no-show`)
- **3 recibos** já emitidos para sessões pagas
- **Configuração padrão:** Dr. Milton, CRM/SP 123456, endereço e telefone de exemplo

Para reiniciar com os dados de seed, abra o DevTools → Application → Local Storage → selecione a origem e clique em "Clear All", depois recarregue a página.

---

## Deploy na Vercel

Crie um arquivo `vercel.json` na raiz para garantir que o React Router funcione corretamente em produção:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Em seguida:

```bash
# Via CLI
npm install -g vercel
vercel --prod
```

Ou importe o repositório diretamente em [vercel.com](https://vercel.com). O Vite é detectado automaticamente — as configurações de build (`npm run build` / output `dist`) já estão corretas.

---

## Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento em `localhost:5173` |
| `npm run build` | Gera o build de produção na pasta `dist/` |
| `npm run preview` | Serve o build de produção localmente para inspeção |
| `npm run lint` | Executa o ESLint com regras TypeScript estritas |

---

## Limitações Conhecidas

- **Sem autenticação** — não há login ou controle de acesso. O app é projetado para uso local/privado.
- **Capacidade do localStorage** — o limite típico é de 5–10 MB por origem. Para consultórios com histórico longo, recomenda-se exportar backups periodicamente.
- **Largura mínima de 768px** — a interface não é otimizada para smartphones; funciona bem em tablets e desktops.
- **PDF gerado client-side** — o layout do recibo é funcional mas não permite customização avançada de template sem alterar o código em `src/utils/pdf.ts`.

---

## Licença

Projeto de uso privado — desenvolvido para o consultório de Dr. Milton.
