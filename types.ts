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
  password?: string;
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
  action: string;
  details: string;
}

// ==================== CLIENTES ====================

export interface ClienteInteresado {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  fechaContacto: string;
  notas?: string;
  estado: 'activo' | 'convertido' | 'descartado';
  createdAt: string;
}

export interface ClienteActual {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  numeroLote: string;
  valorLote: number;
  depositoInicial: number;
  saldoRestante: number;
  numeroCuotas: number;
  valorCuota: number;
  saldoFinal: number;
  formaPagoInicial?: string;
  formaPagoCuotas?: string;
  documentoCompraventa?: string;
  estado: 'activo' | 'pagado' | 'mora';
  createdAt: string;
}

export interface PagoCliente {
  id: string;
  clienteId: string;
  fechaPago: string;
  monto: number;
  tipoPago: 'cuota' | 'deposito_inicial' | 'pago_extra';
  formaPago?: string;
  documentoAdjunto?: string;
  notas?: string;
  createdAt: string;
}

// ==================== EGRESOS FUTUROS ====================

export interface EgresoFuturo {
  id: string;
  fecha: string;
  tipo: 'planificado' | 'recurrente' | 'extraordinario';
  categoria: string;
  descripcion?: string;
  monto: number;
  usuario?: string;
  adjuntos?: Attachment[];
  estado: 'pendiente' | 'pagado' | 'cancelado';
  createdAt: string;
}
