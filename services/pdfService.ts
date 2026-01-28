/**
 * ✅ SERVICIO DE GENERACIÓN DE PDFs
 * Comprobantes de Reserva/Venta y Recibos de Abono
 */

import jsPDF from 'jspdf';
import { ClienteActual, PagoCliente } from '../types';
import { fileToBase64 } from './dataService'; // Ya la tienes aquí
// ============================================
// 1️⃣ COMPROBANTE DE RESERVA/VENTA
// ============================================

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
  numeroCuotas: number;
  valorCuota: number;
  fechaOperacion: string;
  numeroOperacion: string;
}

export const generarComprobanteReservaVenta = async (
  data: ComprobanteData
): Promise<Blob> => {
  const doc = new jsPDF();
  const brandColor = [79, 70, 229];
  const greenColor = [16, 185, 129];
  const blueColor = [59, 130, 246];
  const grayColor = [107, 114, 128];

  // ===== ENCABEZADO =====
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 50, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('🌾', 20, 25, { align: 'left' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(
    data.tipo === 'reserva' ? 'COMPROBANTE DE RESERVA' : 'COMPROBANTE DE VENTA',
    110,
    20,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Molino Campestre Rio Bravo', 110, 28, { align: 'center' });
  doc.text('Sistema de Gestión Integral', 110, 33, { align: 'center' });

  // Número y fecha
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text(`Operación #${data.numeroOperacion}`, 190, 15, { align: 'right' });
  doc.text(
    `Fecha: ${new Date(data.fechaOperacion).toLocaleDateString('es-CO')}`,
    190,
    21,
    { align: 'right' }
  );

  // ===== INFORMACIÓN DEL CLIENTE =====
  let y = 65;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${data.cliente.nombre}`, 20, y);
  y += 6;
  doc.text(`Email: ${data.cliente.email}`, 20, y);
  y += 6;
  doc.text(`Teléfono: ${data.cliente.telefono}`, 20, y);

  // ===== INFORMACIÓN DEL LOTE =====
  y += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL LOTE', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Lote #${data.lote.numeroLote}`, 20, y);
  y += 6;
  if (data.lote.area) {
    doc.text(`Área: ${data.lote.area} m²`, 20, y);
    y += 6;
  }
  doc.text(`Ubicación: ${data.lote.ubicacion || 'N/A'}`, 20, y);
  y += 6;
  doc.text(`Valor: $${data.lote.precio.toLocaleString()}`, 20, y);

  // ===== DETALLE FINANCIERO =====
  y += 12;

  doc.setFillColor(248, 250, 252);
  doc.rect(20, y, 170, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Concepto', 25, y + 5);
  doc.text('Cantidad', 100, y + 5);
  doc.text('Valor', 150, y + 5);

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const concepto =
    data.tipo === 'reserva' ? 'Depósito de Reserva' : 'Cuota Inicial';
  doc.text(concepto, 25, y + 3);
  doc.text('1', 100, y + 3);
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.deposito.toLocaleString()}`, 150, y + 3);

  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, 190, y);
  y += 5;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 20, y + 5);
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.text(`$${data.deposito.toLocaleString()}`, 190, y + 5, {
    align: 'right'
  });

  // ===== PLAN DE PAGO =====
  y += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN DE PAGO', 20, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const saldoRestante = data.lote.precio - data.deposito;
  doc.text(`Valor Total del Lote: $${data.lote.precio.toLocaleString()}`, 20, y);
  y += 5;
  doc.text(
    `${concepto}: $${data.deposito.toLocaleString()}`,
    20,
    y
  );
  y += 5;
  doc.text(
    `Saldo a Financiar: $${saldoRestante.toLocaleString()}`,
    20,
    y
  );
  y += 5;
  doc.text(`Número de Cuotas: ${data.numeroCuotas}`, 20, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Valor de Cada Cuota: $${data.valorCuota.toLocaleString(undefined, {
      maximumFractionDigits: 2
    })}`,
    20,
    y
  );

  // ===== TÉRMINOS Y CONDICIONES =====
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TÉRMINOS Y CONDICIONES', 20, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const terminos = [
    '• Este comprobante es válido con el depósito del pago inicial',
    '• El lote queda ' +
      (data.tipo === 'reserva' ? 'reservado' : 'vendido') +
      ' a partir de la fecha de esta operación',
    '• Las cuotas deben ser pagadas de acuerdo al cronograma establecido',
    '• Retrasos en el pago incurren en intereses del 2% mensual'
  ];

  terminos.forEach((termino) => {
    doc.text(termino, 20, y);
    y += 4;
  });

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Molino Campestre Rio Bravo - Comprobante Oficial',
    105,
    287,
    { align: 'center' }
  );

  return doc.output('blob');
};

// ============================================
// 2️⃣ RECIBO DE ABONO
// ============================================

export interface ReciboData {
  cliente: ClienteActual;
  pago: PagoCliente;
  saldoAnterior: number;
  saldoActual: number;
}

export const generarReciboAbono = async (data: ReciboData): Promise<Blob> => {
  const doc = new jsPDF();

  const brandColor = [79, 70, 229];
  const greenColor = [16, 185, 129];

  // ===== ENCABEZADO =====
  doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('RECIBO DE ABONO', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Molino Campestre Rio Bravo', 105, 25, { align: 'center' });

  // Número y fecha
  doc.setFontSize(9);
  const numeroRecibo = `REC-${new Date().getTime().toString().slice(-6)}`;
  doc.text(`Recibo #${numeroRecibo}`, 190, 12, { align: 'right' });
  doc.text(
    `Fecha: ${new Date(data.pago.fechaPago).toLocaleDateString('es-CO')}`,
    190,
    20,
    { align: 'right' }
  );

  // ===== INFORMACIÓN DEL CLIENTE =====
  let y = 55;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${data.cliente.nombre}`, 20, y);
  y += 6;
  doc.text(`Lote #${data.cliente.numeroLote}`, 20, y);
  y += 6;
  doc.text(`Email: ${data.cliente.email}`, 20, y);

  // ===== DETALLES DEL PAGO =====
  y += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DEL ABONO', 20, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tipo de Pago: ${data.pago.tipoPago || 'Abono'}`, 20, y);
  y += 6;
  doc.text(`Forma de Pago: ${data.pago.formaPago}`, 20, y);

  // Monto
  y += 10;
  doc.setFillColor(248, 250, 252);
  doc.rect(20, y - 3, 170, 12, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('MONTO ABONADO:', 20, y + 4);
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.text(`$${data.pago.monto.toLocaleString()}`, 190, y + 4, {
    align: 'right'
  });

  // ===== ESTADO DE LA DEUDA =====
  y += 18;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DE LA DEUDA', 20, y);

  // Tabla
  y += 8;
  const tableData = [
    ['Concepto', 'Valor'],
    ['Saldo Anterior', `$${data.saldoAnterior.toLocaleString()}`],
    ['Abono Realizado', `-$${data.pago.monto.toLocaleString()}`],
    ['Saldo Actual', `$${data.saldoActual.toLocaleString()}`]
  ];

  // Encabezados
  doc.setFillColor(79, 70, 229);
  doc.rect(20, y - 1, 170, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(tableData[0][0], 25, y + 3);
  doc.text(tableData[0][1], 180, y + 3, { align: 'right' });

  y += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Filas
  for (let i = 1; i < tableData.length; i++) {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, y - 1, 170, 6, 'F');
    }

    doc.setFontSize(10);
    doc.text(tableData[i][0], 25, y + 2);

    if (i === tableData.length - 1) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
    } else if (i === 2) {
      doc.setFont('helvetica', 'bold');
    }

    doc.text(tableData[i][1], 180, y + 2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    y += 7;
  }

  // ===== OBSERVACIONES =====
  if (data.pago.notas) {
    y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(data.pago.notas, 20, y, { maxWidth: 170 });
  }

  // ===== FOOTER =====
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Recibo oficial de abono - Molino Campestre Rio Bravo',
    105,
    287,
    { align: 'center' }
  );

  return doc.output('blob');
};

// ============================================
// 3️⃣ FUNCIONES AUXILIARES
// ============================================

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
    return `comprobante_lote_${numeroLote}_${fecha}_${timestamp}.pdf`;
  } else {
    return `recibo_abono_lote_${numeroLote}_${fecha}_${timestamp}.pdf`;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};