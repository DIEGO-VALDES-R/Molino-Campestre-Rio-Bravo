/**
 * SERVICIO DE GENERACIÓN DE PDFs MEJORADO
 * Comprobantes profesionales con formato en pesos colombianos
 * Soporta cuotas automáticas Y cuotas personalizadas (promesa de compraventa)
 */

import jsPDF from 'jspdf';
import { ClienteActual, PagoCliente, ClienteInteresado } from '../types';

// ============================================
// UTILIDADES DE FORMATO
// ============================================

const formatearMoneda = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
};

const formatearMiles = (valor: number): string => {
  if (valor >= 1000000000) {
    return `$${(valor / 1000000000).toFixed(2)}B`;
  } else if (valor >= 1000000) {
    return `$${(valor / 1000000).toFixed(1)}M`;
  } else if (valor >= 1000) {
    return `$${(valor / 1000).toFixed(0)}K`;
  }
  return formatearMoneda(valor);
};

const formatearFecha = (fecha: string): string => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// ============================================
// INTERFACES
// ============================================

/**
 * Cuota personalizada para promesas de compraventa
 * con condiciones específicas por cuota
 */
export interface CuotaPersonalizada {
  numero: number;
  descripcion: string;      // Ej: "Primera cuota - Arras confirmatorias"
  monto: number;
  fechaPago: string;        // ISO date string o descripción libre
  condicion?: string;       // Ej: "Al momento de firma de escritura"
  pagada?: boolean;
}

export interface ComprobanteData {
  tipo: 'reserva' | 'venta';
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
  };
  lote: {
    numeroLote: string;
    area?: number;
    precio: number;
    ubicacion?: string;
  };
  deposito: number;

  // MODO 1: Cuotas automáticas (comportamiento anterior)
  numeroCuotas?: number;
  valorCuota?: number;

  // MODO 2: Cuotas personalizadas (para promesas de compraventa)
  cuotasPersonalizadas?: CuotaPersonalizada[];
  tipoPlanPago?: 'automatico' | 'personalizado';

  fechaOperacion: string;
  numeroOperacion: string;
  usuarioGenerador?: string;

  // Información adicional de la promesa
  notasEspeciales?: string;
}

export interface ReciboData {
  cliente: ClienteActual;
  pago: PagoCliente;
  saldoAnterior: number;
  saldoActual: number;
  usuarioGenerador?: string;
}

// ============================================
// COMPROBANTE DE RESERVA/VENTA MEJORADO
// ============================================

export const generarComprobanteReservaVenta = async (
  data: ComprobanteData
): Promise<Blob> => {
  const doc = new jsPDF();

  // Paleta de colores profesional
  const azulOscuro = [30, 58, 138];
  const azulMedio = [59, 130, 246];
  const verde = [16, 185, 129];
  const gris = [100, 116, 139];
  const grisClaro = [241, 245, 249];
  const grisOscuro = [51, 65, 85];
  const naranja = [249, 115, 22];

  const esPersonalizado =
    data.tipoPlanPago === 'personalizado' &&
    data.cuotasPersonalizadas &&
    data.cuotasPersonalizadas.length > 0;

  let y = 0;

  // ===== ENCABEZADO =====
  doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(
    data.tipo === 'reserva' ? 'COMPROBANTE DE RESERVA' : 'COMPROBANTE DE VENTA',
    105,
    18,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MOLINO CAMPESTRE RIO BRAVO', 105, 26, { align: 'center' });
  doc.text('Sistema de Gestión de Ventas', 105, 32, { align: 'center' });

  // Número de operación
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.roundedRect(155, 10, 45, 22, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No. OPERACIÓN', 177.5, 16, { align: 'center' });
  doc.setFontSize(13);
  doc.text(data.numeroOperacion, 177.5, 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date(data.fechaOperacion).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    177.5,
    28,
    { align: 'center' }
  );

  y = 50;

  // ===== SECCIÓN 1: DATOS DEL CLIENTE =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('1. INFORMACIÓN DEL CLIENTE', 20, y + 5.5);

  y += 12;

  const infoCliente = [
    { label: 'Nombre:', valor: data.cliente.nombre },
    { label: 'Email:', valor: data.cliente.email },
    { label: 'Teléfono:', valor: data.cliente.telefono }
  ];

  doc.setFontSize(9);
  infoCliente.forEach(info => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.text(info.label, 20, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text(info.valor, 45, y);

    y += 6;
  });

  y += 6;

  // ===== SECCIÓN 2: DATOS DEL LOTE =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('2. INFORMACIÓN DEL LOTE', 20, y + 5.5);

  y += 12;

  const infoLote = [
    { label: 'Lote No.:', valor: data.lote.numeroLote },
    {
      label: 'Ubicación:',
      valor: data.lote.ubicacion || 'Molino Campestre Rio Bravo'
    },
    ...(data.lote.area
      ? [{ label: 'Área:', valor: `${data.lote.area} m²` }]
      : []),
    {
      label: 'Valor del Lote:',
      valor: formatearMoneda(data.lote.precio),
      destacacar: true
    }
  ];

  doc.setFontSize(9);
  infoLote.forEach(info => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.text(info.label, 20, y);

    doc.setFont('helvetica', 'bold');
    if (info.destacacar) {
      doc.setTextColor(verde[0], verde[1], verde[2]);
      doc.setFontSize(11);
      doc.text(info.valor, 45, y);
      doc.setFontSize(7);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(`(${formatearMiles(data.lote.precio)})`, 95, y);
      doc.setFontSize(9);
    } else {
      doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
      doc.text(info.valor, 45, y);
    }

    y += 6;
  });

  y += 8;

  // ===== SECCIÓN 3: DETALLE DE PAGO INICIAL =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('3. DETALLE DE PAGO', 20, y + 5.5);

  y += 12;

  const concepto =
    data.tipo === 'reserva' ? 'Depósito de Reserva' : 'Cuota Inicial';

  // Encabezado tabla
  doc.setFillColor(azulMedio[0], azulMedio[1], azulMedio[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO', 20, y + 5);
  doc.text('CANTIDAD', 110, y + 5, { align: 'center' });
  doc.text('VALOR', 185, y + 5, { align: 'right' });

  y += 10;

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.1);
  doc.line(15, y, 195, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
  doc.text(concepto, 20, y);
  doc.text('1', 110, y, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(verde[0], verde[1], verde[2]);
  doc.setFontSize(11);
  doc.text(formatearMoneda(data.deposito), 185, y, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.text(`(${formatearMiles(data.deposito)})`, 185, y + 4, {
    align: 'right'
  });

  y += 8;

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.line(15, y, 195, y);
  y += 4;

  // TOTAL destacado
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(15, y, 180, 12, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL PAGADO HOY:', 20, y + 7.5);

  doc.setFontSize(14);
  doc.text(formatearMoneda(data.deposito), 185, y + 7.5, { align: 'right' });

  y += 18;

  // ===== SECCIÓN 4: PLAN DE PAGO =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text(
    esPersonalizado
      ? '4. PLAN DE PAGO - PROMESA DE COMPRAVENTA'
      : '4. PLAN DE FINANCIACIÓN',
    20,
    y + 5.5
  );

  y += 12;

  const saldoRestante = data.lote.precio - data.deposito;
  const porcentajePagado = (data.deposito / data.lote.precio) * 100;

  if (esPersonalizado && data.cuotasPersonalizadas) {
    // ---- MODO PERSONALIZADO: tabla de cuotas de la promesa ----

    // Resumen financiero
    const resumenItems = [
      {
        label: 'Valor Total del Lote:',
        valor: formatearMoneda(data.lote.precio),
        corto: formatearMiles(data.lote.precio),
        color: grisOscuro
      },
      {
        label: `${concepto} (pagado hoy):`,
        valor: formatearMoneda(data.deposito),
        corto: formatearMiles(data.deposito),
        color: verde
      },
      {
        label: 'Saldo pendiente:',
        valor: formatearMoneda(saldoRestante),
        corto: formatearMiles(saldoRestante),
        color: naranja
      }
    ];

    doc.setFontSize(9);
    resumenItems.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(item.label, 20, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(item.valor, 185, y, { align: 'right' });

      doc.setFontSize(7);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(`(${item.corto})`, 185, y + 3.5, { align: 'right' });
      doc.setFontSize(9);

      y += 8;
    });

    y += 4;

    // Tabla de cuotas personalizadas
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('Cronograma de Pagos según Promesa de Compraventa:', 20, y);
    y += 8;

    // Encabezado tabla cuotas
    doc.setFillColor(azulMedio[0], azulMedio[1], azulMedio[2]);
    doc.rect(15, y, 180, 8, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CUOTA', 20, y + 5);
    doc.text('DESCRIPCIÓN', 35, y + 5);
    doc.text('FECHA / CONDICIÓN', 100, y + 5);
    doc.text('MONTO', 185, y + 5, { align: 'right' });

    y += 9;

    data.cuotasPersonalizadas.forEach((cuota, idx) => {
      // Fondo alternado
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 2, 180, 10, 'F');
      }

      doc.setDrawColor(gris[0], gris[1], gris[2]);
      doc.setLineWidth(0.1);
      doc.line(15, y + 8, 195, y + 8);

      const esPagada = cuota.pagada === true;
      const colorCuota = esPagada ? verde : cuota.numero === 1 ? verde : grisOscuro;

      // Número de cuota con indicador
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(colorCuota[0], colorCuota[1], colorCuota[2]);
      doc.text(`${cuota.numero}`, 22, y + 4.5, { align: 'center' });

      // Descripción
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
      const descCorta =
        cuota.descripcion.length > 35
          ? cuota.descripcion.substring(0, 33) + '...'
          : cuota.descripcion;
      doc.text(descCorta, 35, y + 4.5);

      // Fecha / condición
      const fechaTexto = cuota.condicion || cuota.fechaPago;
      const fechaCorta =
        fechaTexto.length > 28
          ? fechaTexto.substring(0, 26) + '...'
          : fechaTexto;
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(fechaCorta, 100, y + 4.5);

      // Monto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(colorCuota[0], colorCuota[1], colorCuota[2]);
      doc.text(formatearMoneda(cuota.monto), 185, y + 4.5, { align: 'right' });

      // Badge "PAGADA" si aplica
      if (esPagada) {
        doc.setFillColor(verde[0], verde[1], verde[2]);
        doc.setFontSize(5.5);
        doc.setTextColor(255, 255, 255);
        doc.text('✓ PAGADA', 164, y + 4.5, { align: 'right' });
      }

      y += 10;

      // ← NUEVA VERIFICACIÓN DE PÁGINA
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    });

    // Total del cronograma
    const totalCronograma = data.cuotasPersonalizadas.reduce(
      (sum, c) => sum + c.monto,
      0
    );

    doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.rect(15, y, 180, 9, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL SEGÚN CRONOGRAMA:', 20, y + 6);
    doc.setFontSize(10);
    doc.text(formatearMoneda(totalCronograma), 185, y + 6, { align: 'right' });

    y += 15;

    // Notas especiales si existen
    if (data.notasEspeciales) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.3);
      const notasLines = doc.splitTextToSize(data.notasEspeciales, 168);
      const notasH = notasLines.length * 4 + 12;
      doc.rect(15, y, 180, notasH, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('NOTAS DE LA PROMESA DE COMPRAVENTA:', 20, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(92, 45, 4);
      doc.text(notasLines, 20, y + 11);

      y += notasH + 6;
    }
  } else {
    // ---- MODO AUTOMÁTICO (comportamiento original) ----
    const planFinanciacion = [
      {
        label: 'Valor Total del Lote:',
        valor: formatearMoneda(data.lote.precio),
        valorCorto: formatearMiles(data.lote.precio)
      },
      {
        label: `${concepto}:`,
        valor: formatearMoneda(data.deposito),
        valorCorto: formatearMiles(data.deposito),
        color: verde
      },
      {
        label: 'Saldo a Financiar:',
        valor: formatearMoneda(saldoRestante),
        valorCorto: formatearMiles(saldoRestante),
        color: naranja
      },
      {
        label: 'Número de Cuotas:',
        valor: `${data.numeroCuotas} cuotas mensuales`
      },
      {
        label: 'Valor de Cada Cuota:',
        valor: formatearMoneda(data.valorCuota || 0),
        valorCorto: formatearMiles(data.valorCuota || 0),
        destacacar: true
      }
    ];

    doc.setFontSize(9);
    planFinanciacion.forEach(item => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(item.label, 20, y);

      doc.setFont('helvetica', 'bold');
      const color = item.color || grisOscuro;
      doc.setTextColor(color[0], color[1], color[2]);

      if (item.destacacar) {
        doc.setFontSize(11);
      }

      doc.text(item.valor, 185, y, { align: 'right' });

      if (item.valorCorto) {
        doc.setFontSize(7);
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(`(${item.valorCorto})`, 185, y + 4, { align: 'right' });
      }

      doc.setFontSize(9);
      y += 7;
    });

    y += 4;
  }

  // ===== BARRA DE PROGRESO =====
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.text(`Progreso de Pago: ${porcentajePagado.toFixed(1)}%`, 20, y);

  y += 3;

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.5);
  doc.rect(20, y, 170, 4, 'S');

  doc.setFillColor(verde[0], verde[1], verde[2]);
  const barWidth = (porcentajePagado / 100) * 170;
  doc.rect(20, y, barWidth, 4, 'F');

  y += 12;

  // ===== SECCIÓN 5: TÉRMINOS Y CONDICIONES =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  const terminosHeight = esPersonalizado ? 30 : 25;
  doc.rect(15, y, 180, terminosHeight, 'F');

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, terminosHeight, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('TÉRMINOS Y CONDICIONES', 20, y + 5);

  y += 10;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);

  const terminos = [
    `• Este comprobante es válido con el pago del ${concepto.toLowerCase()}`,
    `• El lote queda ${data.tipo === 'reserva' ? 'reservado' : 'vendido'} a partir de la fecha de esta operación`,
    '• Los pagos deben realizarse en las fechas y montos estipulados en el cronograma',
    '• Retrasos en el pago pueden generar intereses de mora del 2% mensual',
    '• Este documento tiene validez legal como comprobante de pago',
    ...(esPersonalizado
      ? ['• Las condiciones específicas están sujetas a la Promesa de Compraventa firmada']
      : [])
  ];

  terminos.forEach(termino => {
    doc.text(termino, 20, y);
    y += 3.5;
  });

  y += 6;

  // ===== VALIDACIÓN =====
  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.2);
  doc.line(15, y, 195, y);

  y += 4;

  doc.setFontSize(7);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Documento validado electrónicamente - No requiere firma',
    105,
    y,
    { align: 'center' }
  );

  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Código de verificación: ${generateHash(data.numeroOperacion)}`,
    105,
    y,
    { align: 'center' }
  );

  if (data.usuarioGenerador) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado por: ${data.usuarioGenerador}`, 105, y, {
      align: 'center'
    });
  }

  // ===== FOOTER =====
  doc.setFontSize(7);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.text(
    'Tel: 3124915127 - 3125123639 | Molino Campestre Rio Bravo',
    105,
    282,
    { align: 'center' }
  );
  doc.setFontSize(6);
  doc.text(
    `Documento generado: ${new Date().toLocaleString('es-CO')}`,
    105,
    287,
    { align: 'center' }
  );

  return doc.output('blob');
};

// ============================================
// RECIBO DE ABONO MEJORADO
// ============================================

export const generarReciboAbono = async (data: ReciboData): Promise<Blob> => {
  const doc = new jsPDF();

  const azulOscuro = [30, 58, 138];
  const azulMedio = [59, 130, 246];
  const verde = [16, 185, 129];
  const naranja = [249, 115, 22];
  const gris = [100, 116, 139];
  const grisClaro = [241, 245, 249];
  const grisOscuro = [51, 65, 85];

  let y = 0;

  // ===== ENCABEZADO =====
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE ABONO', 105, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('MOLINO CAMPESTRE RIO BRAVO', 105, 26, { align: 'center' });
  doc.text('Comprobante Oficial de Pago', 105, 32, { align: 'center' });

  const numeroRecibo = `REC-${new Date().getTime().toString().slice(-8)}`;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.roundedRect(155, 10, 45, 22, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No. RECIBO', 177.5, 16, { align: 'center' });
  doc.setFontSize(13);
  doc.text(numeroRecibo, 177.5, 22, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    new Date(data.pago.fechaPago).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    177.5,
    28,
    { align: 'center' }
  );

  y = 50;

  // ===== SECCIÓN 1: DATOS DEL CLIENTE =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('1. INFORMACIÓN DEL CLIENTE', 20, y + 5.5);

  y += 12;

  const infoCliente = [
    { label: 'Nombre:', valor: data.cliente.nombre },
    { label: 'Lote No.:', valor: `#${data.cliente.numeroLote}` },
    ...(data.cliente.email
      ? [{ label: 'Email:', valor: data.cliente.email }]
      : []),
    ...(data.cliente.telefono
      ? [{ label: 'Teléfono:', valor: data.cliente.telefono }]
      : [])
  ];

  doc.setFontSize(9);
  infoCliente.forEach(info => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.text(info.label, 20, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text(info.valor, 50, y);

    y += 6;
  });

  y += 6;

  // ===== SECCIÓN 2: DETALLES DEL PAGO =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('2. DETALLES DEL ABONO', 20, y + 5.5);

  y += 12;

  const detallesPago = [
    { label: 'Tipo de Pago:', valor: data.pago.tipoPago || 'Abono Regular' },
    {
      label: 'Forma de Pago:',
      valor: data.pago.formaPago || 'No especificado'
    },
    {
      label: 'Fecha de Pago:',
      valor: new Date(data.pago.fechaPago).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }
  ];

  doc.setFontSize(9);
  detallesPago.forEach(info => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gris[0], gris[1], gris[2]);
    doc.text(info.label, 20, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text(info.valor, 55, y);

    y += 6;
  });

  y += 8;

  // ===== MONTO DESTACADO =====
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(15, y, 180, 18, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MONTO ABONADO:', 20, y + 11);

  doc.setFontSize(16);
  doc.text(formatearMoneda(data.pago.monto), 185, y + 11, { align: 'right' });

  doc.setFontSize(9);
  doc.text(`(${formatearMiles(data.pago.monto)})`, 185, y + 16, {
    align: 'right'
  });

  y += 26;

  // ===== SECCIÓN 3: ESTADO DE LA DEUDA =====
  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('3. ESTADO DE LA DEUDA', 20, y + 5.5);

  y += 12;

  const estadoDeuda = [
    { label: 'Saldo Anterior', valor: data.saldoAnterior, color: grisOscuro },
    {
      label: 'Abono Realizado',
      valor: data.pago.monto,
      color: verde,
      esAbono: true
    },
    {
      label: 'Saldo Actual',
      valor: data.saldoActual,
      color: data.saldoActual > 0 ? naranja : verde,
      destacacar: true
    }
  ];

  doc.setFillColor(azulMedio[0], azulMedio[1], azulMedio[2]);
  doc.rect(15, y, 180, 8, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CONCEPTO', 20, y + 5);
  doc.text('MONTO', 120, y + 5, { align: 'right' });
  doc.text('EN MILES', 175, y + 5, { align: 'right' });

  y += 10;

  estadoDeuda.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(15, y, 180, 8, 'F');
    }

    doc.setDrawColor(gris[0], gris[1], gris[2]);
    doc.setLineWidth(0.1);
    doc.line(15, y, 195, y);

    doc.setFont('helvetica', item.destacacar ? 'bold' : 'normal');
    doc.setFontSize(item.destacacar ? 10 : 9);
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text(item.label, 20, y + 5);

    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.setFont('helvetica', 'bold');

    const valorTexto = item.esAbono
      ? `-${formatearMoneda(item.valor)}`
      : formatearMoneda(item.valor);
    doc.text(valorTexto, 115, y + 5, { align: 'right' });

    doc.setFontSize(8);
    doc.text(formatearMiles(item.valor), 175, y + 5, { align: 'right' });

    y += 8;
  });

  doc.setDrawColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);

  y += 8;

  const valorTotal = data.saldoAnterior + data.pago.monto;
  const totalPagado = valorTotal - data.saldoActual;
  const porcentajePagado =
    valorTotal > 0 ? (totalPagado / valorTotal) * 100 : 0;

  doc.setFontSize(8);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Progreso Total del Pago:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(verde[0], verde[1], verde[2]);
  doc.text(`${porcentajePagado.toFixed(1)}%`, 185, y, { align: 'right' });

  y += 4;

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.5);
  doc.rect(20, y, 170, 5, 'S');

  doc.setFillColor(verde[0], verde[1], verde[2]);
  const barWidth = (porcentajePagado / 100) * 170;
  doc.rect(20, y, barWidth, 5, 'F');

  y += 12;

  if (data.pago.notas) {
    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    const notasLines = doc.splitTextToSize(data.pago.notas, 170);
    const notasHeight = notasLines.length * 4 + 10;
    doc.rect(15, y, 180, notasHeight, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('OBSERVACIONES:', 20, y + 6);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
    doc.text(notasLines, 20, y);

    y += notasLines.length * 4 + 8;
  }

  doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
  const infoHeight = 22;
  doc.rect(15, y, 180, infoHeight, 'F');

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, infoHeight, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
  doc.text('INFORMACIÓN IMPORTANTE', 20, y + 5);

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);

  const infoTextos = [
    '• Conserve este recibo como comprobante de pago válido',
    '• Cualquier discrepancia debe reportarse dentro de las 48 horas',
    '• Para consultas, comuníquese con nosotros citando el número de recibo'
  ];

  infoTextos.forEach(texto => {
    doc.text(texto, 20, y);
    y += 3.5;
  });

  y += 6;

  doc.setDrawColor(gris[0], gris[1], gris[2]);
  doc.setLineWidth(0.2);
  doc.line(15, y, 195, y);

  y += 4;

  doc.setFontSize(7);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Documento validado electrónicamente - No requiere firma',
    105,
    y,
    { align: 'center' }
  );

  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Código de verificación: ${generateHash(numeroRecibo)}`,
    105,
    y,
    { align: 'center' }
  );

  if (data.usuarioGenerador) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado por: ${data.usuarioGenerador}`, 105, y, {
      align: 'center'
    });
  }

  doc.setFontSize(7);
  doc.setTextColor(gris[0], gris[1], gris[2]);
  doc.text(
    'Tel: 3124915127 - 3125123639 | Molino Campestre Rio Bravo',
    105,
    282,
    { align: 'center' }
  );
  doc.setFontSize(6);
  doc.text(
    `Documento generado: ${new Date().toLocaleString('es-CO')}`,
    105,
    287,
    { align: 'center' }
  );

  return doc.output('blob');
};

// ============================================
// REPORTE CONTABLE EJECUTIVO
// ============================================

export const generarReporteContable = (
  clientesActuales: ClienteActual[],
  clientesInteresados: ClienteInteresado[],
  pagosClientes: PagoCliente[],
  getPagosCliente: (clienteId: string) => PagoCliente[],
  usuarioGenerador?: string
): void => {
  try {
    const doc = new jsPDF();

    const azulOscuro = [30, 58, 138];
    const azulMedio = [59, 130, 246];
    const verde = [16, 185, 129];
    const rojo = [239, 68, 68];
    const naranja = [249, 115, 22];
    const gris = [100, 116, 139];
    const grisClaro = [241, 245, 249];
    const grisOscuro = [51, 65, 85];

    let y = 0;

    doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE', 105, 110, { align: 'center' });
    doc.text('CONTABLE', 105, 125, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Estado de Clientes y Cobranzas', 105, 145, { align: 'center' });

    const fechaReporte = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.setFontSize(11);
    doc.text(
      fechaReporte.charAt(0).toUpperCase() + fechaReporte.slice(1),
      105,
      160,
      { align: 'center' }
    );

    doc.setFontSize(10);
    doc.text('Molino Campestre Rio Bravo', 105, 260, { align: 'center' });

    if (usuarioGenerador) {
      doc.setFontSize(9);
      doc.text(`Generado por: ${usuarioGenerador}`, 105, 270, {
        align: 'center'
      });
    }

    doc.addPage();
    y = 20;

    doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL', 105, 15, { align: 'center' });

    y = 35;

    const totalClientes = clientesActuales.length;
    const totalInteresados = clientesInteresados.filter(
      c => c.estado !== 'convertido'
    ).length;
    const totalValorLotes = clientesActuales.reduce(
      (sum, c) => sum + (c.valorLote || 0),
      0
    );
    const totalPagado = pagosClientes.reduce((sum, p) => sum + p.monto, 0);
    const totalPendiente = clientesActuales.reduce((sum, c) => {
      const pagos = getPagosCliente(c.id);
      const totalPagadoCliente = pagos.reduce((s, p) => s + p.monto, 0);
      return sum + Math.max(0, (c.valorLote || 0) - totalPagadoCliente);
    }, 0);
    const tasaCobro =
      totalValorLotes > 0 ? (totalPagado / totalValorLotes) * 100 : 0;

    const kpisPrincipales = [
      {
        titulo: 'CLIENTES ACTIVOS',
        valor: totalClientes.toString(),
        subtitulo: 'Total',
        color: azulMedio
      },
      {
        titulo: 'INTERESADOS',
        valor: totalInteresados.toString(),
        subtitulo: 'Prospectos',
        color: naranja
      },
      {
        titulo: 'TASA DE COBRO',
        valor: `${tasaCobro.toFixed(1)}%`,
        subtitulo: 'Del total',
        color: verde
      }
    ];

    kpisPrincipales.forEach((kpi, idx) => {
      const x = 15 + idx * 62;

      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.roundedRect(x, y, 58, 22, 2, 2, 'F');

      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(kpi.titulo, x + 29, y + 6, { align: 'center' });

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.valor, x + 29, y + 15, { align: 'center' });

      doc.setFontSize(6);
      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.text(kpi.subtitulo, x + 29, y + 19, { align: 'center' });
    });

    y += 30;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('BALANCE FINANCIERO', 15, y);

    y += 8;

    const balanceData = [
      {
        label: 'Valor Total Cartera (Lotes)',
        valor: totalValorLotes,
        miles: formatearMiles(totalValorLotes)
      },
      {
        label: 'Total Recaudado',
        valor: totalPagado,
        miles: formatearMiles(totalPagado),
        color: verde
      },
      {
        label: 'Saldo por Cobrar',
        valor: totalPendiente,
        miles: formatearMiles(totalPendiente),
        color: naranja
      },
      {
        label: 'Total Transacciones',
        valor: pagosClientes.length,
        miles: `${pagosClientes.length} pagos`,
        esNumero: true
      }
    ];

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(15, y, 180, 7, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('CONCEPTO', 20, y + 4.5);
    doc.text('MONTO', 115, y + 4.5, { align: 'right' });
    doc.text('EN MILES', 175, y + 4.5, { align: 'right' });

    y += 7;

    balanceData.forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y, 180, 7, 'F');
      }

      doc.setDrawColor(gris[0], gris[1], gris[2]);
      doc.setLineWidth(0.1);
      doc.line(15, y + 7, 195, y + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
      doc.text(item.label, 20, y + 4.5);

      const color = item.color || grisOscuro;
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont('helvetica', 'bold');

      if (!item.esNumero) {
        doc.text(formatearMoneda(item.valor as number), 115, y + 4.5, {
          align: 'right'
        });
      }
      doc.text(item.miles, 175, y + 4.5, { align: 'right' });

      y += 7;
    });

    y += 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('DETALLE DE CUENTAS POR COBRAR', 15, y);

    y += 6;

    doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
    doc.rect(15, y, 180, 7, 'F');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
    doc.text('CLIENTE', 18, y + 4.5);
    doc.text('LOTE', 75, y + 4.5);
    doc.text('TOTAL', 100, y + 4.5, { align: 'right' });
    doc.text('PAGADO', 135, y + 4.5, { align: 'right' });
    doc.text('SALDO', 170, y + 4.5, { align: 'right' });
    doc.text('ESTADO', 190, y + 4.5, { align: 'right' });

    y += 7;

    const clientesOrdenados = [...clientesActuales]
      .sort((a, b) => (b.valorLote || 0) - (a.valorLote || 0))
      .slice(0, 20);

    doc.setFontSize(6);
    clientesOrdenados.forEach((cliente, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y, 180, 6, 'F');
      }

      const pagos = getPagosCliente(cliente.id);
      const totalPagadoCliente = pagos.reduce((s, p) => s + p.monto, 0);
      const saldo = Math.max(
        0,
        (cliente.valorLote || 0) - totalPagadoCliente
      );

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);

      const nombreCorto =
        cliente.nombre.length > 30
          ? cliente.nombre.substring(0, 28) + '...'
          : cliente.nombre;
      doc.text(nombreCorto, 18, y + 4);
      doc.text(`#${cliente.numeroLote}`, 75, y + 4);

      doc.text(formatearMiles(cliente.valorLote || 0), 100, y + 4, {
        align: 'right'
      });

      doc.setTextColor(verde[0], verde[1], verde[2]);
      doc.text(formatearMiles(totalPagadoCliente), 135, y + 4, {
        align: 'right'
      });

      doc.setTextColor(naranja[0], naranja[1], naranja[2]);
      doc.text(formatearMiles(saldo), 170, y + 4, { align: 'right' });

      let colorEstado = azulMedio;
      if (cliente.estado === 'pagado') colorEstado = verde;
      else if (cliente.estado === 'mora') colorEstado = rojo;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colorEstado[0], colorEstado[1], colorEstado[2]);
      doc.text(cliente.estado.toUpperCase(), 190, y + 4, { align: 'right' });

      y += 6;
    });

    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);

      if (i > 1) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(
          `Molino Campestre Rio Bravo | Página ${i} de ${totalPaginas} | ${new Date().toLocaleDateString('es-CO')}`,
          105,
          287,
          { align: 'center' }
        );
      }
    }

    const nombreArchivo = `Reporte_Contable_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el reporte contable.');
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const generateHash = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 10);
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const descargarPDF = (blob: Blob, nombreArchivo: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generarNombreArchivo = (
  tipo: 'comprobante' | 'recibo',
  numeroLote: string
): string => {
  const fecha = new Date().toISOString().split('T')[0];
  const timestamp = new Date().getTime().toString().slice(-6);

  if (tipo === 'comprobante') {
    return `Comprobante_Lote_${numeroLote}_${fecha}_${timestamp}.pdf`;
  } else {
    return `Recibo_Abono_Lote_${numeroLote}_${fecha}_${timestamp}.pdf`;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1] || base64String;
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

