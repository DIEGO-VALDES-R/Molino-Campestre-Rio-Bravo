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

/**
 * Interface para Clientes Actuales
 * Adaptada al esquema real de Supabase
 */
export interface ClienteActual {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  numeroLote: string; // Relación con lote por número (no por ID)
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

/**
 * Interface para Pagos de Clientes
 * Adaptada al esquema real de Supabase: pagos_clientes
 * 
 * Campos en BD:
 * - id: uuid
 * - cliente_id: uuid (FK a clientes_actuales)
 * - fecha_pago: timestamp
 * - monto: numeric
 * - tipo_pago: text (ej: 'Cuota Mensual', 'Depósito de Reserva', 'Cuota Inicial')
 * - forma_pago: text (ej: 'Efectivo', 'Transferencia', 'Cheque')
 * - documento_adjunto: text
 * - notas: text
 * - created_at: timestamp
 */
export interface PagoCliente {
  id: string;
  clienteId: string; // Referencia a ClienteActual
  fechaPago: string;
  monto: number;
  tipoPago?: string; // 'Cuota Mensual', 'Depósito de Reserva', 'Cuota Inicial', etc.
  formaPago?: string; // 'Efectivo', 'Transferencia Bancaria', 'Cheque', 'Tarjeta', etc.
  documentoAdjunto?: string | null;
  notas?: string | null;
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

// ==================== LOTES ====================

/**
 * Estados posibles de un lote
 * 🟢 disponible: Lote sin asignar
 * 🔵 vendido: Lote asignado a un cliente
 * 🟡 reservado: Lote en espera/pendiente
 * ⚫ bloqueado: Lote no disponible por alguna razón
 */
export type LoteEstado = 'disponible' | 'vendido' | 'reservado' | 'bloqueado';

/**
 * Interface para Lotes del proyecto
 * Adaptada al esquema real de Supabase
 * 
 * Campos en BD:
 * - id: uuid
 * - numero_lote: varchar (único)
 * - estado: varchar (check: disponible, reservado, vendido, bloqueado)
 * - area: numeric (metros cuadrados)
 * - ubicacion: varchar
 * - precio: numeric
 * - cliente_id: uuid (FK a clientes_actuales, nullable)
 * - descripcion: text
 * - bloqueado_por: varchar
 * - fila: integer
 * - columna: integer
 * - created_at: timestamp
 * - updated_at: timestamp
 */
export interface Lote {
  id: string;
  numeroLote: string;
  estado: LoteEstado;
  area?: number; // en metros cuadrados
  ubicacion?: string; // Ej: "Manzana A, Sector 1"
  precio?: number; // Precio del lote
  clienteId?: string; // ID del cliente si está vendido/reservado
  descripcion?: string; // Descripción adicional del lote
  bloqueadoPor?: string; // Razón del bloqueo (si aplica)
  fila?: number; // Para visualización en grid (opcional)
  columna?: number; // Para visualización en grid (opcional)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface extendida de Lote con información del cliente
 * Útil para mostrar información completa en vistas
 */
export interface LoteConCliente extends Lote {
  cliente?: ClienteActual; // Cliente asignado si existe
  progresoPago?: number; // Porcentaje de pago (0-100)
}

/**
 * Interface extendida de ClienteActual con información del lote
 * Útil para mostrar información completa del cliente
 */
export interface ClienteActualConLote extends ClienteActual {
  lotePrincipal?: Lote;
}