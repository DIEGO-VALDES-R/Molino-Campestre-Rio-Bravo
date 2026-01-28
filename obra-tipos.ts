/**
 * ============================================================
 * SISTEMA DE GESTIÓN DE OBRAS - TIPOS Y CONFIGURACIÓN
 * Molino Campestre Rio Bravo
 * ============================================================
 */

// ==================== ETAPAS DE CONSTRUCCIÓN ====================

/**
 * Etapas completas del proyecto inmobiliario
 * Flujo desde planificación hasta escrituración
 */
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

/**
 * Información detallada de cada etapa
 */
export interface EtapaInfo {
  key: EtapaObra;
  label: string;
  descripcion: string;
  icon: string;
  color: string;
  colorBg: string;
  orden: number;
  diasEstimados?: number;
}

/**
 * Configuración completa de todas las etapas
 */
export const ETAPAS_CONFIG: Record<EtapaObra, EtapaInfo> = {
  planificacion: {
    key: 'planificacion',
    label: 'Planificación',
    descripcion: 'Diseño inicial y planificación del proyecto inmobiliario',
    icon: '📋',
    color: '#3b82f6',
    colorBg: '#eff6ff',
    orden: 1,
    diasEstimados: 30
  },
  topografia: {
    key: 'topografia',
    label: 'Topografía',
    descripcion: 'Levantamiento topográfico del terreno completo',
    icon: '🗺️',
    color: '#8b5cf6',
    colorBg: '#f5f3ff',
    orden: 2,
    diasEstimados: 15
  },
  planos: {
    key: 'planos',
    label: 'Planos Iniciales',
    descripcion: 'Diseño de planos arquitectónicos preliminares',
    icon: '📐',
    color: '#06b6d4',
    colorBg: '#ecfeff',
    orden: 3,
    diasEstimados: 20
  },
  curvas_nivel: {
    key: 'curvas_nivel',
    label: 'Curvas de Nivel',
    descripcion: 'Determinación y análisis de curvas de nivel del terreno',
    icon: '📊',
    color: '#10b981',
    colorBg: '#ecfdf5',
    orden: 4,
    diasEstimados: 10
  },
  planos_finales: {
    key: 'planos_finales',
    label: 'Planos Finales',
    descripcion: 'Aprobación y finalización de planos técnicos definitivos',
    icon: '✅',
    color: '#059669',
    colorBg: '#d1fae5',
    orden: 5,
    diasEstimados: 15
  },
  documentacion_planeacion: {
    key: 'documentacion_planeacion',
    label: 'Documentación y Planeación',
    descripcion: 'Gestión de permisos, licencias y documentación legal',
    icon: '📄',
    color: '#f59e0b',
    colorBg: '#fef3c7',
    orden: 6,
    diasEstimados: 45
  },
  remocion_piedras: {
    key: 'remocion_piedras',
    label: 'Remoción de Piedras',
    descripcion: 'Limpieza y preparación del terreno, remoción de obstáculos',
    icon: '⛏️',
    color: '#78716c',
    colorBg: '#f5f5f4',
    orden: 7,
    diasEstimados: 20
  },
  construccion_vias: {
    key: 'construccion_vias',
    label: 'Construcción de Vías',
    descripcion: 'Pavimentación y construcción de vías internas de acceso',
    icon: '🛣️',
    color: '#64748b',
    colorBg: '#f1f5f9',
    orden: 8,
    diasEstimados: 60
  },
  entrega_lotes: {
    key: 'entrega_lotes',
    label: 'Entrega de Lotes',
    descripcion: 'Delimitación y entrega física de lotes a propietarios',
    icon: '🏘️',
    color: '#14b8a6',
    colorBg: '#ccfbf1',
    orden: 9,
    diasEstimados: 30
  },
  sucesion_interna: {
    key: 'sucesion_interna',
    label: 'Sucesión Interna Familiar',
    descripcion: 'Procesos de sucesión y traspaso familiar interno',
    icon: '👨‍👩‍👧‍👦',
    color: '#ec4899',
    colorBg: '#fce7f3',
    orden: 10,
    diasEstimados: 90
  },
  sucesion_lotes: {
    key: 'sucesion_lotes',
    label: 'Sucesión por Lotes',
    descripcion: 'Gestión de sucesión individualizada por cada lote',
    icon: '📜',
    color: '#a855f7',
    colorBg: '#f3e8ff',
    orden: 11,
    diasEstimados: 120
  },
  escrituracion: {
    key: 'escrituracion',
    label: 'Escrituración',
    descripcion: 'Proceso de escrituración y registro legal de propiedades',
    icon: '⚖️',
    color: '#ef4444',
    colorBg: '#fee2e2',
    orden: 12,
    diasEstimados: 60
  },
  terminada: {
    key: 'terminada',
    label: 'Terminada',
    descripcion: 'Proyecto finalizado y entregado exitosamente',
    icon: '🎉',
    color: '#22c55e',
    colorBg: '#dcfce7',
    orden: 13,
    diasEstimados: 0
  }
};

// ==================== HITOS ====================

/**
 * Hito importante dentro del proyecto
 */
export interface Hito {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaCompletado?: string;
  completado: boolean;
  porcentajeCompletado: number;
  responsable?: string;
  notas?: string;
  etapaAsociada?: EtapaObra;
  createdAt: string;
}

// ==================== FOTOS DE AVANCE ====================

/**
 * Foto de avance de construcción
 */
export interface FotoObra {
  id: string;
  url: string; // Base64 o URL externa
  thumbnail?: string;
  descripcion?: string;
  etapa: EtapaObra;
  fecha: string;
  ubicacion?: string;
  uploadedBy: string;
  createdAt: string;
}

// ==================== GASTOS ====================

/**
 * Categorías de gastos en construcción
 */
export type CategoriaGasto = 
  | 'materiales'
  | 'mano_obra'
  | 'maquinaria'
  | 'permisos'
  | 'servicios'
  | 'transporte'
  | 'otros';

/**
 * Gasto registrado en la obra
 */
export interface GastoObra {
  id: string;
  obraId: string;
  fecha: string;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  proveedor?: string;
  factura?: string;
  notas?: string;
  aprobadoPor?: string;
  etapa?: EtapaObra;
  createdAt: string;
}

// ==================== OBRA PRINCIPAL ====================

/**
 * Estado de la obra
 */
export type EstadoObra = 'activa' | 'pausada' | 'completada' | 'cancelada';

/**
 * Interface principal para proyectos de construcción
 */
export interface Obra {
  id: string;
  nombre: string;
  descripcion?: string;
  etapa: EtapaObra;
  progreso: number; // 0-100
  presupuesto: number;
  gastado: number;
  fechaInicio: string;
  fechaFinEstimada?: string;
  fechaFinReal?: string;
  fotos: FotoObra[];
  hitos: Hito[];
  gastos: GastoObra[];
  ubicacion?: string;
  responsable?: string;
  estado: EstadoObra;
  compartidoConClientes: boolean;
  lotesAsociados?: string[]; // IDs de lotes relacionados
  clientesAsociados?: string[]; // IDs de clientes que pueden ver esta obra
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// ==================== REPORTES Y ESTADÍSTICAS ====================

/**
 * Estadísticas generales de obras
 */
export interface EstadisticasObras {
  totalObras: number;
  obrasActivas: number;
  obrasCompletadas: number;
  obrasPausadas: number;
  progresoPromedio: number;
  presupuestoTotal: number;
  gastadoTotal: number;
  ahorro: number;
  fotosTotal: number;
  hitosCompletados: number;
  hitosPendientes: number;
}

/**
 * Reporte de avance para compartir con clientes
 */
export interface ReporteAvance {
  id: string;
  obraId: string;
  fecha: string;
  etapa: EtapaObra;
  progreso: number;
  resumenAvances: string;
  fotosDestacadas: string[]; // IDs de fotos
  proximosHitos: string[]; // IDs de hitos
  observaciones?: string;
  generadoPor: string;
  createdAt: string;
}

// ==================== HELPERS ====================

/**
 * Obtener información de una etapa
 */
export const getEtapaInfo = (etapa: EtapaObra): EtapaInfo => {
  return ETAPAS_CONFIG[etapa];
};

/**
 * Calcular progreso automático basado en etapa
 */
export const calcularProgresoAutomatico = (etapa: EtapaObra): number => {
  const info = getEtapaInfo(etapa);
  const totalEtapas = Object.keys(ETAPAS_CONFIG).length;
  return Math.round((info.orden / totalEtapas) * 100);
};

/**
 * Obtener siguiente etapa
 */
export const getSiguienteEtapa = (etapaActual: EtapaObra): EtapaObra | null => {
  const etapas = Object.values(ETAPAS_CONFIG).sort((a, b) => a.orden - b.orden);
  const indiceActual = etapas.findIndex(e => e.key === etapaActual);
  
  if (indiceActual === -1 || indiceActual === etapas.length - 1) {
    return null;
  }
  
  return etapas[indiceActual + 1].key;
};

/**
 * Obtener etapa anterior
 */
export const getEtapaAnterior = (etapaActual: EtapaObra): EtapaObra | null => {
  const etapas = Object.values(ETAPAS_CONFIG).sort((a, b) => a.orden - b.orden);
  const indiceActual = etapas.findIndex(e => e.key === etapaActual);
  
  if (indiceActual <= 0) {
    return null;
  }
  
  return etapas[indiceActual - 1].key;
};

/**
 * Validar si una etapa está completada
 */
export const isEtapaCompletada = (obra: Obra, etapa: EtapaObra): boolean => {
  const etapaActualInfo = getEtapaInfo(obra.etapa);
  const etapaVerificarInfo = getEtapaInfo(etapa);
  return etapaVerificarInfo.orden < etapaActualInfo.orden;
};

/**
 * Obtener color de progreso
 */
export const getColorProgreso = (progreso: number): string => {
  if (progreso < 30) return '#ef4444'; // Rojo
  if (progreso < 70) return '#f59e0b'; // Naranja
  return '#22c55e'; // Verde
};

/**
 * Calcular porcentaje de presupuesto gastado
 */
export const calcularPorcentajeGastado = (obra: Obra): number => {
  if (obra.presupuesto === 0) return 0;
  return (obra.gastado / obra.presupuesto) * 100;
};

/**
 * Verificar alerta de presupuesto
 */
export const tieneAlertaPresupuesto = (obra: Obra): boolean => {
  return calcularPorcentajeGastado(obra) > 90;
};

export default ETAPAS_CONFIG;