/**
 * SISTEMA DE COLORES COHERENTES PARA MOLINO CAMPESTRE
 * Este archivo centraliza todos los colores para mantener consistencia visual
 */

export const COLOR_SYSTEM = {
  // Estados principales de lotes
  estados: {
    disponible: {
      icon: '🟢',
      label: 'Disponible',
      bg: 'bg-emerald-50',
      bgDark: 'bg-emerald-100',
      border: 'border-emerald-200',
      borderDark: 'border-emerald-400',
      text: 'text-emerald-700',
      textDark: 'text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800',
      hover: 'hover:bg-emerald-100 hover:border-emerald-400',
      light: '#ecfdf5',
      dark: '#059669',
      rgb: { r: 16, g: 185, b: 129 },
    },
    vendido: {
      icon: '🔵',
      label: 'Vendido',
      bg: 'bg-blue-50',
      bgDark: 'bg-blue-100',
      border: 'border-blue-200',
      borderDark: 'border-blue-400',
      text: 'text-blue-700',
      textDark: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
      hover: 'hover:bg-blue-100 hover:border-blue-400',
      light: '#eff6ff',
      dark: '#2563eb',
      rgb: { r: 37, g: 99, b: 235 },
    },
    reservado: {
      icon: '🟡',
      label: 'Reservado',
      bg: 'bg-amber-50',
      bgDark: 'bg-amber-100',
      border: 'border-amber-200',
      borderDark: 'border-amber-400',
      text: 'text-amber-700',
      textDark: 'text-amber-900',
      badge: 'bg-amber-100 text-amber-800',
      hover: 'hover:bg-amber-100 hover:border-amber-400',
      light: '#fffbeb',
      dark: '#f59e0b',
      rgb: { r: 245, g: 158, b: 11 },
    },
    bloqueado: {
      icon: '⚫',
      label: 'Bloqueado',
      bg: 'bg-slate-50',
      bgDark: 'bg-slate-100',
      border: 'border-slate-300',
      borderDark: 'border-slate-400',
      text: 'text-slate-700',
      textDark: 'text-slate-900',
      badge: 'bg-slate-200 text-slate-700',
      hover: 'hover:bg-slate-100 hover:border-slate-400',
      light: '#f8fafc',
      dark: '#64748b',
      rgb: { r: 100, g: 116, b: 139 },
    },
  },

  // Estados de clientes
  clienteEstado: {
    activo: {
      icon: '⭕',
      label: 'En Cuota',
      badge: 'bg-blue-100 text-blue-800',
      color: '#3b82f6',
    },
    pagado: {
      icon: '✅',
      label: 'Pagado',
      badge: 'bg-green-100 text-green-800',
      color: '#10b981',
    },
    mora: {
      icon: '⚠️',
      label: 'Mora',
      badge: 'bg-red-100 text-red-800',
      color: '#ef4444',
    },
  },

  // Transacciones
  transacciones: {
    ingreso: {
      icon: '⬆️',
      label: 'Ingreso',
      badge: 'bg-emerald-100 text-emerald-800',
      color: '#10b981',
      text: 'text-emerald-600',
    },
    egreso: {
      icon: '⬇️',
      label: 'Egreso',
      badge: 'bg-red-100 text-red-800',
      color: '#ef4444',
      text: 'text-red-600',
    },
  },

  // Colores de marca
  brand: {
    primary: '#4f46e5',
    secondary: '#7c3aed',
    light: '#eef2ff',
    dark: '#312e81',
  },

  // Estados genéricos
  generic: {
    success: { color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    error: { color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
    warning: { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
    info: { color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
  },
};

/**
 * Utilidades para trabajar con colores
 */
export const colorUtils = {
  /**
   * Obtiene el color para un estado de lote
   */
  getLoteColor: (estado: 'disponible' | 'vendido' | 'reservado' | 'bloqueado') => {
    return COLOR_SYSTEM.estados[estado];
  },

  /**
   * Obtiene el color para un estado de cliente
   */
  getClienteColor: (estado: 'activo' | 'pagado' | 'mora') => {
    return COLOR_SYSTEM.clienteEstado[estado];
  },

  /**
   * Obtiene el color para un tipo de transacción
   */
  getTransaccionColor: (tipo: 'ingreso' | 'egreso') => {
    return COLOR_SYSTEM.transacciones[tipo];
  },

  /**
   * Convierte hex a RGB
   */
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  },

  /**
   * Aplica transparencia a un color hex
   */
  hexToRgba: (hex: string, alpha: number = 0.5) => {
    const rgb = colorUtils.hexToRgb(hex);
    return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : hex;
  },

  /**
   * Obtiene contraste adecuado para texto
   */
  getContrastColor: (color: string) => {
    // Implementación simplificada
    return ['#10b981', '#3b82f6', '#f59e0b'].includes(color) ? '#ffffff' : '#000000';
  },
};

/**
 * Iconos y emojis por estado
 */
export const ESTADO_ICONS = {
  disponible: '🟢',
  vendido: '🔵',
  reservado: '🟡',
  bloqueado: '⚫',
  activo: '⭕',
  pagado: '✅',
  mora: '⚠️',
  ingreso: '⬆️',
  egreso: '⬇️',
};

/**
 * Clase CSS para cada estado (Tailwind)
 */
export const ESTADO_CLASSES = {
  // Lotes
  'lote-disponible': 'bg-emerald-50 border-emerald-200',
  'lote-vendido': 'bg-blue-50 border-blue-200',
  'lote-reservado': 'bg-amber-50 border-amber-200',
  'lote-bloqueado': 'bg-slate-50 border-slate-300',

  // Clientes
  'cliente-activo': 'bg-blue-50 border-blue-200',
  'cliente-pagado': 'bg-green-50 border-green-200',
  'cliente-mora': 'bg-red-50 border-red-200',

  // Transacciones
  'tx-ingreso': 'bg-emerald-50 border-emerald-200',
  'tx-egreso': 'bg-red-50 border-red-200',
};

export default COLOR_SYSTEM;