export type TransactionType = 'ingreso' | 'egreso';

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  data: string; // Base64
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  user: string;
  attachments?: Attachment[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  status: 'futuro' | 'tratado';
  category: 'General' | 'Operativo' | 'Financiero' | 'Urgente';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'viewer';
  password?: string; // In a real app, this should be hashed
  email?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  data: string;
  uploadedBy: string;
  uploadedAt: string;
  category: string;
}

export interface AuditLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string; // e.g., "Creó transacción", "Eliminó usuario"
  details: string;
}
