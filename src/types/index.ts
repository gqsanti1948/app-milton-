export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  dateOfBirth: string;
  sessionPrice: number;
  healthInsurance?: string;
  notes?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  patientId: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // "HH:mm"
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  price: number;
  paymentStatus: 'pending' | 'paid' | 'waived';
  paymentMethod?: 'pix' | 'cash' | 'card' | 'insurance';
  receiptIssued: boolean;
}

export interface Receipt {
  id: string;
  sessionId: string;
  patientId: string;
  amount: number;
  issuedAt: string;
  description: string;
  receiptNumber: string; // e.g. "REC-2025-001"
}

export interface ClinicConfig {
  psychiatristName: string;
  crm: string;
  cfm?: string;
  address: string;
  phone: string;
  email: string;
  cnpj?: string;
  defaultSessionPrice: number;
  workingHours: { start: string; end: string };
  workingDays: number[]; // 0=Sun ... 6=Sat
  monthlyGoal?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
