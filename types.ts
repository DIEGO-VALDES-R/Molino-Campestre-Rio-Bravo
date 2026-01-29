/**
 * ==================== GESTIÓN DE OBRAS ====================
 * Sistema completo de gestión de proyectos de construcción
 * Molino Campestre Rio Bravo
 */

/**
 * Etapas del proyecto inmobiliario personalizadas
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
 * Hito o evento importante en la obra
 */
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

/**
 * Foto de avance de obra
 */
export interface FotoObra {
  id: string;
  url: string; // URL o base64
  descripcion: string;
  fecha: string;
  etapa: EtapaObra;
  coordenadas?: { lat: number; lng: number };
  uploadedBy: string;
  createdAt: string;
}

/**
 * Gasto registrado en la obra
 */
export interface GastoObra {
  id: string;
  fecha: string;
  concepto: string;
  categoria: 'materiales' | 'mano_obra' | 'maquinaria' | 'permisos' | 'servicios' | 'otros';
  monto: number;
  proveedor?: string;
  factura?: string;
  etapa: EtapaObra;
  aprobadoPor?: string;
  observaciones?: string;
  createdAt: string;
}

/**
 * Obra o proyecto de construcción
 */
export interface Obra {
  id: string;
  nombre: string;
  descripcion?: string;
  etapaActual: string;
  progreso: number; // 0-100
  presupuesto: number;
  gastado: number;
  fechaInicio: string;
  fechaEstimadaFin?: string;
  fotos: any[];
  hitos: any[];
  gastos: any[];
  ubicacion?: string;
  responsable?: string;
  estado: 'activa' | 'pausada' | 'completada' | 'cancelada';
  compartidoConClientes?: boolean;
  lotesAsociados?: string[];
  clientesAsociados?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Configuración de etapas con información detallada
 */
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

/**
 * Reporte de avance de obra
 */
export interface ReporteAvanceObra {
  id: string;
  obraId: string;
  fecha: string;
  etapa: EtapaObra;
  progresoGeneral: number;
  presupuestoEjecutado: number;
  presupuestoRestante: number;
  hitosCompletados: number;
  hitosPendientes: number;
  observaciones: string;
  proximasActividades: string[];
  fotosAdjuntas: string[];
  generadoPor: string;
  createdAt: string;
}

/**
 * Configuración completa de todas las etapas
 */
export const ETAPAS_OBRA: EtapaConfig[] = [
  {
    id: 'planificacion',
    nombre: 'Planificación',
    descripcion: 'Fase inicial de diseño y planificación del proyecto',
    icon: '📋',
    color: '#6366f1',
    colorBg: '#eef2ff',
    orden: 1,
    duracionEstimadaDias: 30
  },
  {
    id: 'topografia',
    nombre: 'Topografía',
    descripcion: 'Levantamiento topográfico del terreno',
    icon: '🗺️',
    color: '#8b5cf6',
    colorBg: '#f5f3ff',
    orden: 2,
    duracionEstimadaDias: 15
  },
  {
    id: 'planos',
    nombre: 'Planos Iniciales',
    descripcion: 'Elaboración de planos arquitectónicos iniciales',
    icon: '📐',
    color: '#a855f7',
    colorBg: '#faf5ff',
    orden: 3,
    duracionEstimadaDias: 20
  },
  {
    id: 'curvas_nivel',
    nombre: 'Curvas de Nivel',
    descripcion: 'Diseño y ajuste de curvas de nivel',
    icon: '📊',
    color: '#d946ef',
    colorBg: '#fdf4ff',
    orden: 4,
    duracionEstimadaDias: 10
  },
  {
    id: 'planos_finales',
    nombre: 'Planos Finales',
    descripcion: 'Aprobación y finalización de planos técnicos',
    icon: '✅',
    color: '#3b82f6',
    colorBg: '#eff6ff',
    orden: 5,
    duracionEstimadaDias: 15
  },
  {
    id: 'documentacion_planeacion',
    nombre: 'Documentación y Planeación',
    descripcion: 'Gestión de permisos y documentación legal',
    icon: '📄',
    color: '#06b6d4',
    colorBg: '#ecfeff',
    orden: 6,
    duracionEstimadaDias: 45
  },
  {
    id: 'remocion_piedras',
    nombre: 'Remoción de Piedras',
    descripcion: 'Limpieza y preparación del terreno',
    icon: '⛏️',
    color: '#f59e0b',
    colorBg: '#fffbeb',
    orden: 7,
    duracionEstimadaDias: 20
  },
  {
    id: 'construccion_vias',
    nombre: 'Construcción de Vías',
    descripcion: 'Pavimentación y construcción de vías de acceso',
    icon: '🛣️',
    color: '#f97316',
    colorBg: '#fff7ed',
    orden: 8,
    duracionEstimadaDias: 60
  },
  {
    id: 'entrega_lotes',
    nombre: 'Entrega de Lotes',
    descripcion: 'Delimitación y entrega física de lotes',
    icon: '🏘️',
    color: '#10b981',
    colorBg: '#ecfdf5',
    orden: 9,
    duracionEstimadaDias: 30
  },
  {
    id: 'sucesion_interna',
    nombre: 'Sucesión Interna Familiar',
    descripcion: 'Gestión de sucesión interna de propietarios',
    icon: '👨‍👩‍👧‍👦',
    color: '#14b8a6',
    colorBg: '#f0fdfa',
    orden: 10,
    duracionEstimadaDias: 90
  },
  {
    id: 'sucesion_lotes',
    nombre: 'Sucesión por Lotes',
    descripcion: 'Proceso de sucesión individual por lote',
    icon: '📝',
    color: '#22c55e',
    colorBg: '#f0fdf4',
    orden: 11,
    duracionEstimadaDias: 120
  },
  {
    id: 'escrituracion',
    nombre: 'Escrituración',
    descripcion: 'Proceso de escrituración y registro legal',
    icon: '⚖️',
    color: '#84cc16',
    colorBg: '#f7fee7',
    orden: 12,
    duracionEstimadaDias: 60
  },
  {
    id: 'terminada',
    nombre: 'Terminada',
    descripcion: 'Proyecto finalizado y entregado',
    icon: '🎉',
    color: '#22d3ee',
    colorBg: '#cffafe',
    orden: 13,
    duracionEstimadaDias: 0
  }
];

/**
 * Obtener configuración de una etapa
 */
export const getEtapaConfig = (etapa: EtapaObra): EtapaConfig | undefined => {
  return ETAPAS_OBRA.find(e => e.id === etapa);
};

/**
 * Calcular progreso basado en etapa actual
 */
export const calcularProgresoAutomatico = (etapaActual: EtapaObra): number => {
  const config = getEtapaConfig(etapaActual);
  if (!config) return 0;
  
  const totalEtapas = ETAPAS_OBRA.length;
  return Math.round((config.orden / totalEtapas) * 100);
};

export * from './obra-types';