import { Patient, Session, Receipt, ClinicConfig } from '../types';
import { seedPatients, seedSessions, seedReceipts, seedClinicConfig } from '../data/seed';

const KEYS = {
  patients: 'psimanager_patients',
  sessions: 'psimanager_sessions',
  receipts: 'psimanager_receipts',
  config: 'psimanager_config',
  initialized: 'psimanager_initialized',
};

export function getPatients(): Patient[] {
  try {
    const data = localStorage.getItem(KEYS.patients);
    return data ? (JSON.parse(data) as Patient[]) : [];
  } catch {
    return [];
  }
}

export function savePatients(patients: Patient[]): void {
  localStorage.setItem(KEYS.patients, JSON.stringify(patients));
}

export function getSessions(): Session[] {
  try {
    const data = localStorage.getItem(KEYS.sessions);
    return data ? (JSON.parse(data) as Session[]) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
}

export function getReceipts(): Receipt[] {
  try {
    const data = localStorage.getItem(KEYS.receipts);
    return data ? (JSON.parse(data) as Receipt[]) : [];
  } catch {
    return [];
  }
}

export function saveReceipts(receipts: Receipt[]): void {
  localStorage.setItem(KEYS.receipts, JSON.stringify(receipts));
}

export function getClinicConfig(): ClinicConfig | null {
  try {
    const data = localStorage.getItem(KEYS.config);
    return data ? (JSON.parse(data) as ClinicConfig) : null;
  } catch {
    return null;
  }
}

export function saveClinicConfig(config: ClinicConfig): void {
  localStorage.setItem(KEYS.config, JSON.stringify(config));
}

export function initializeData(): void {
  const initialized = localStorage.getItem(KEYS.initialized);
  if (initialized) return;

  savePatients(seedPatients);
  saveSessions(seedSessions);
  saveReceipts(seedReceipts);
  saveClinicConfig(seedClinicConfig);
  localStorage.setItem(KEYS.initialized, 'true');
}

export function exportAllData(): string {
  return JSON.stringify(
    {
      patients: getPatients(),
      sessions: getSessions(),
      receipts: getReceipts(),
      config: getClinicConfig(),
    },
    null,
    2
  );
}

export function importAllData(jsonString: string): void {
  const data = JSON.parse(jsonString) as {
    patients?: Patient[];
    sessions?: Session[];
    receipts?: Receipt[];
    config?: ClinicConfig;
  };

  if (data.patients) savePatients(data.patients);
  if (data.sessions) saveSessions(data.sessions);
  if (data.receipts) saveReceipts(data.receipts);
  if (data.config) saveClinicConfig(data.config);
}
