/**
 * ============================================================
 * TYPES COMPLETOS — Molino Campestre Rio Bravo
 * Sistema de Gestión de Ventas y Proyectos
 * ============================================================
 */

// ============================================================
// USUARIO
// ============================================================

export type UserRole = 'admin' | 'vendedor' | 'contador' | 'visor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  telefono?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// CLIENTES INTERESADOS (PROSPECTOS)
// ============================================================

export type EstadoInteresado = 'activo' | 'inactivo' | 'convertido' | 'descartado';

export interface ClienteInteresado {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  direccion?: string;
  notas?: string;
  fechaContacto: string;
  estado: EstadoInteresado;
  fuenteContacto?: string;   // Ej: 'referido', 'redes sociales', 'visita directa'
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// CUOTAS PERSONALIZADAS (promesa de compraventa)
// ============================================================

export interface CuotaPersonalizada {
  numero: number;
  descripcion: string;       // Ej: "Primera cuota - Arras confirmatorias"
  monto: number;
  fechaPago: string;         // ISO date string o descripción libre
  condicion?: string;        // Ej: "Al momento de firma de escritura pública"
  pagada?: boolean;
}

// ============================================================
// CLIENTES ACTUALES (CON LOTE ADQUIRIDO)
// ============================================================

export type EstadoCliente = 'activo' | 'pagado' | 'mora' | 'cancelado';
export type TipoPlanPago = 'automatico' | 'personalizado';

export interface ClienteActual {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  cedula?: string;
  numeroLote: string;
  valorLote: number;
  depositoInicial: number;
  saldoRestante: number;
  saldoFinal: number;
  numeroCuotas: number;
  valorCuota: number;
  formaPagoInicial: string;
  formaPagoCuotas: string;
  documentoCompraventa?: string;
  estado: EstadoCliente;
  notasEspeciales?: string;

  // Plan de pago personalizado (promesa de compraventa)
  tipoPlanPago?: TipoPlanPago;
  cuotasPersonalizadas?: CuotaPersonalizada[];

  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// ============================================================
// PAGOS DE CLIENTES
// ============================================================

export type TipoPago =
  | 'cuota'
  | 'deposito_inicial'
  | 'pago_extra'
  | 'abono'
  | 'Depósito de Reserva'
  | 'Cuota Inicial';

export type FormaPago =
  | 'efectivo'
  | 'transferencia'
  | 'cheque'
  | 'debito'
  | 'tarjeta_credito'
  | 'Efectivo'
  | 'Transferencia Bancaria'
  | 'Cheque'
  | 'Débito Automático'
  | 'Tarjeta de Crédito';

export interface PagoCliente {
  id: string;
  clienteId: string;
  fechaPago: string;
  monto: number;
  tipoPago: TipoPago | string;
  formaPago: FormaPago | string;
  documentoAdjunto?: string;
  notas?: string;
  registradoPor?: string;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================
// LOTES
// ============================================================

export type EstadoLote = 'disponible' | 'vendido' | 'reservado' | 'bloqueado';

export interface Lote {
  id: string;
  numeroLote: string;
  estado: EstadoLote;
  area?: number;           // en m²
  precio?: number;
  ubicacion?: string;
  descripcion?: string;
  bloqueadoPor?: string;   // razón del bloqueo
  fila?: number;           // posición en mapa grid
  columna?: number;        // posición en mapa grid
  clienteId?: string;      // referencia al cliente si está vendido/reservado
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// DOCUMENTOS
// ============================================================

export type CategoriaDocumento =
  | 'Recibo de Abono'
  | 'Comprobante de Reserva'
  | 'Comprobante de Venta'
  | 'Documento de Compraventa'
  | 'Contrato'
  | 'Escritura'
  | 'Permiso'
  | 'Plano'
  | 'Factura'
  | 'Otro';

export interface Documento {
  id: string;
  name: string;
  type: string;             // MIME type, ej: 'application/pdf'
  data?: string;            // base64
  url?: string;             // URL de almacenamiento
  uploadedBy: string;
  category: CategoriaDocumento | string;
  uploadedAt: string;
  size?: number;            // bytes
  clienteId?: string;
  loteId?: string;
  obraId?: string;
  createdAt?: string;
}

// ============================================================
// OBRAS (importado también desde obra-types)
// ============================================================

export type EtapaObra =
  | 'planificacion'
  | 'topografia'
  | 'planos'
  | 'curvas_nivel'
  | 'planos_finales'
  | 'documentacion_planeacion'
  | 'remocion_piedras'
  | 'construccion_vias'
  | 'entrega_lotes'
  | 'sucesion_interna'
  | 'sucesion_lotes'
  | 'escrituracion'
  | 'terminada';

export type EstadoObra = 'activa' | 'pausada' | 'completada' | 'cancelada';

export type CategoriaGasto =
  | 'materiales'
  | 'mano_obra'
  | 'maquinaria'
  | 'permisos'
  | 'servicios'
  | 'otros';

export interface Hito {
  id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  completado: boolean;
  responsable?: string;
  fotos?: string[];
  documentos?: string[];
  createdAt: string;
}

export interface FotoObra {
  id: string;
  url: string;
  descripcion: string;
  fecha: string;
  etapa: EtapaObra;
  coordenadas?: { lat: number; lng: number };
  uploadedBy: string;
  createdAt: string;
}

export interface GastoObra {
  id: string;
  fecha: string;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  proveedor?: string;
  factura?: string;
  etapa: EtapaObra;
  aprobadoPor?: string;
  observaciones?: string;
  createdAt: string;
}

export interface Obra {
  id: string;
  nombre: string;
  descripcion?: string;
  etapaActual: EtapaObra | string;
  progreso: number;          // 0–100
  presupuesto: number;
  gastado: number;
  fechaInicio: string;
  fechaEstimadaFin?: string;
  fotos: FotoObra[];
  hitos: Hito[];
  gastos: GastoObra[];
  ubicacion?: string;
  responsable?: string;
  estado: EstadoObra;
  compartidoConClientes?: boolean;
  lotesAsociados?: string[];
  clientesAsociados?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ============================================================
// NOTAS / REUNIONES
// ============================================================

export type CategoriaNota = 'tema' | 'nota' | 'recordatorio';
export type EstadoNota = 'futuro' | 'tratado';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: CategoriaNota;
  status: EstadoNota;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// ============================================================
// CONFIGURACIÓN DE ETAPAS (referencia de UI)
// ============================================================

export interface EtapaConfig {
  id: EtapaObra;
  nombre: string;
  descripcion: string;
  icon: string;
  color: string;
  colorBg: string;
  orden: number;
  duracionEstimadaDias?: number;
}

// ============================================================
// ESTADO GLOBAL DE LA APP (para contexto/store)
// ============================================================

export interface AppState {
  clientesInteresados: ClienteInteresado[];
  clientesActuales: ClienteActual[];
  pagosClientes: PagoCliente[];
  lotes: Lote[];
  obras: Obra[];
  notas: Note[];
  documentos: Documento[];
  currentUser: User | null;
}

// ============================================================
// UTILIDADES DE TIPO
// ============================================================

/** Omite id y campos de auditoría para formularios de creación */
export type CreateDTO<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/** Permite actualización parcial */
export type UpdateDTO<T> = Partial<Omit<T, 'id' | 'createdAt'>>;