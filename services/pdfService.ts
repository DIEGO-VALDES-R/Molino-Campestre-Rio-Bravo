/**
 * ✅ SERVICIO DE GENERACIÓN DE PDFs - VERSIÓN EJECUTIVA CON USUARIO
 * Comprobantes de Reserva/Venta, Recibos de Abono y Reportes Contables
 * Estilo: Factura profesional sin caracteres especiales
 */

import jsPDF from 'jspdf';
import { ClienteActual, PagoCliente, ClienteInteresado, User } from '../types';

// ============================================
// INTERFACES
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
  usuarioGenerador?: string; // NUEVO: Usuario que genera el comprobante
}

export interface ReciboData {
  cliente: ClienteActual;
  pago: PagoCliente;
  saldoAnterior: number;
  saldoActual: number;
  usuarioGenerador?: string; // NUEVO: Usuario que genera el recibo
}

// ============================================
// 1️⃣ COMPROBANTE DE RESERVA/VENTA
// ============================================

export const generarComprobanteReservaVenta = async (
  data: ComprobanteData
): Promise<Blob> => {
  const doc = new jsPDF();
  
  // Colores ejecutivos suaves
  const darkBlue = [41, 55, 75];
  const mediumGray = [100, 116, 139];
  const lightGray = [241, 245, 249];
  const darkGray = [51, 65, 85];
  const accentGreen = [34, 139, 34];

  // ===== ENCABEZADO PROFESIONAL =====
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, 210, 35, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(
    data.tipo === 'reserva' ? 'COMPROBANTE DE RESERVA' : 'COMPROBANTE DE VENTA',
    105,
    15,
    { align: 'center' }
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Molino Campestre Rio Bravo', 105, 22, { align: 'center' });
  doc.text('Sistema de Gestion Integral', 105, 27, { align: 'center' });

  // Número de operación en recuadro
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(155, 8, 45, 20, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No. Operacion', 177.5, 13, { align: 'center' });
  doc.setFontSize(11);
  doc.text(data.numeroOperacion, 177.5, 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.fechaOperacion).toLocaleDateString('es-CO'), 177.5, 24, { align: 'center' });

  // ===== INFORMACIÓN DEL CLIENTE =====
  let y = 50;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 15, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.cliente.nombre, 35, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Email:', 15, y);
  doc.text(data.cliente.email, 35, y);
  
  y += 5;
  doc.text('Telefono:', 15, y);
  doc.text(data.cliente.telefono, 35, y);

  // ===== INFORMACIÓN DEL LOTE =====
  y += 10;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACION DEL LOTE', 15, y);

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.text('Lote No.:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.lote.numeroLote, 35, y);
  
  if (data.lote.area) {
    doc.setFont('helvetica', 'normal');
    doc.text('Area:', 100, y);
    doc.text(`${data.lote.area} m2`, 115, y);
  }
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Ubicacion:', 15, y);
  doc.text(data.lote.ubicacion || 'N/A', 35, y);
  
  y += 5;
  doc.text('Valor del Lote:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.lote.precio.toLocaleString('es-CO')}`, 35, y);

  // ===== DETALLE FINANCIERO (TABLA ESTILO FACTURA) =====
  y += 12;
  
  // Encabezado de tabla
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 7, 'F');
  
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.1);
  doc.rect(15, y, 180, 7, 'S');
  
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', 20, y + 4.5);
  doc.text('CANTIDAD', 100, y + 4.5);
  doc.text('VALOR', 170, y + 4.5, { align: 'right' });

  y += 7;

  // Fila de datos
  const concepto = data.tipo === 'reserva' ? 'Deposito de Reserva' : 'Cuota Inicial';
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(concepto, 20, y + 4);
  doc.text('1', 100, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.deposito.toLocaleString('es-CO')}`, 190, y + 4, { align: 'right' });

  // Línea de separación
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.line(15, y + 7, 195, y + 7);

  y += 12;

  // TOTAL
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('TOTAL:', 20, y + 5);
  doc.setFontSize(12);
  doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.text(`$${data.deposito.toLocaleString('es-CO')}`, 190, y + 5, { align: 'right' });

  // ===== PLAN DE PAGO =====
  y += 15;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN DE PAGO', 15, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const saldoRestante = data.lote.precio - data.deposito;
  
  doc.text('Valor Total del Lote:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.lote.precio.toLocaleString('es-CO')}`, 190, y, { align: 'right' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${concepto}:`, 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.deposito.toLocaleString('es-CO')}`, 190, y, { align: 'right' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo a Financiar:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${saldoRestante.toLocaleString('es-CO')}`, 190, y, { align: 'right' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Numero de Cuotas:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.numeroCuotas}`, 190, y, { align: 'right' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Valor de Cada Cuota:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${data.valorCuota.toLocaleString('es-CO', { maximumFractionDigits: 2 })}`, 190, y, { align: 'right' });

  // Barra de progreso sutil
  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  const porcentajePagado = ((data.deposito / data.lote.precio) * 100).toFixed(1);
  doc.text(`Progreso de Pago: ${porcentajePagado}%`, 20, y);

  y += 3;
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.3);
  doc.rect(20, y - 2, 170, 3, 'S');
  
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  const barWidth = (parseFloat(porcentajePagado) / 100) * 170;
  doc.rect(20, y - 2, barWidth, 3, 'F');

  // ===== TÉRMINOS Y CONDICIONES =====
  y += 10;
  
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 20, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('TERMINOS Y CONDICIONES', 20, y + 4);

  y += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

  const terminos = [
    '- Este comprobante es valido con el deposito del pago inicial',
    `- El lote queda ${data.tipo === 'reserva' ? 'reservado' : 'vendido'} a partir de la fecha de esta operacion`,
    '- Las cuotas deben ser pagadas de acuerdo al cronograma establecido',
    '- Retrasos en el pago incurren en intereses del 2% mensual'
  ];

  terminos.forEach((termino) => {
    doc.text(termino, 20, y);
    y += 3;
  });

  // ===== VALIDACIÓN Y USUARIO =====
  y += 8;
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.1);
  doc.line(15, y, 195, y);
  
  y += 4;
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Documento validado electronicamente - No requiere firma', 105, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.text(`Codigo de verificacion: ${generateHash(data.numeroOperacion)}`, 105, y, { align: 'center' });
  
  // NUEVO: Mostrar usuario que generó el documento
  if (data.usuarioGenerador) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Generado por: ${data.usuarioGenerador}`, 105, y, { align: 'center' });
  }

  // ===== FOOTER =====
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Tel: 3124915127 - 3125123639', 105, 282, { align: 'center' });
  doc.text('Molino Campestre Rio Bravo - Comprobante Oficial', 105, 286, { align: 'center' });
  doc.setFontSize(6);
  doc.text(`Documento generado: ${new Date().toLocaleString('es-CO')}`, 105, 290, { align: 'center' });

  return doc.output('blob');
};

// ============================================
// 2️⃣ RECIBO DE ABONO EJECUTIVO
// ============================================

export const generarReciboAbono = async (data: ReciboData): Promise<Blob> => {
  const doc = new jsPDF();

  // Colores ejecutivos suaves
  const darkBlue = [41, 55, 75];
  const mediumGray = [100, 116, 139];
  const lightGray = [241, 245, 249];
  const darkGray = [51, 65, 85];
  const accentGreen = [34, 139, 34];

  // ===== ENCABEZADO PROFESIONAL =====
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, 210, 35, 'F');

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE ABONO', 105, 15, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Molino Campestre Rio Bravo', 105, 22, { align: 'center' });
  doc.text('Sistema de Gestion Integral', 105, 27, { align: 'center' });

  // Número de recibo
  const numeroRecibo = `REC-${new Date().getTime().toString().slice(-6)}`;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(155, 8, 45, 20, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No. Recibo', 177.5, 13, { align: 'center' });
  doc.setFontSize(11);
  doc.text(numeroRecibo, 177.5, 19, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.pago.fechaPago).toLocaleDateString('es-CO'), 177.5, 24, { align: 'center' });

  // ===== INFORMACIÓN DEL CLIENTE =====
  let y = 50;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 15, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.cliente.nombre, 35, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Lote No.:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.cliente.numeroLote, 35, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('(Identificador del predio)', 60, y);
  
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  if (data.cliente.email) {
    doc.text('Email:', 15, y);
    doc.text(data.cliente.email, 35, y);
  }
  
  y += 5;
  if (data.cliente.telefono) {
    doc.text('Telefono:', 15, y);
    doc.text(data.cliente.telefono, 35, y);
  }

  // ===== DETALLES DEL PAGO =====
  y += 10;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALLE DEL ABONO', 15, y);

  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  doc.text('Tipo de Pago:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.pago.tipoPago || 'Abono Regular', 45, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Forma de Pago:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(data.pago.formaPago || 'No especificado', 45, y);

  // ===== MONTO DESTACADO =====
  y += 12;
  
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 15, 'F');
  
  doc.setDrawColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.setLineWidth(0.5);
  doc.rect(15, y, 180, 15, 'S');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('MONTO ABONADO:', 20, y + 9);
  
  doc.setFontSize(14);
  doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.text(`$${data.pago.monto.toLocaleString('es-CO')}`, 190, y + 10, { align: 'right' });

  // ===== ESTADO DE LA DEUDA =====
  y += 22;
  
  doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('ESTADO DE LA DEUDA', 15, y);

  y += 7;

  // Tabla con encabezado
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 6, 'F');
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.rect(15, y, 180, 6, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', 20, y + 4);
  doc.text('VALOR', 170, y + 4, { align: 'right' });

  y += 6;

  const tableData = [
    { label: 'Saldo Anterior', value: data.saldoAnterior, color: darkGray },
    { label: 'Abono Realizado', value: -data.pago.monto, color: accentGreen },
    { label: 'Saldo Actual', value: data.saldoActual, color: darkBlue, bold: true }
  ];

  tableData.forEach((row, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(15, y, 180, 7, 'F');
    }

    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(row.label, 20, y + 4.5);

    doc.setTextColor(row.color[0], row.color[1], row.color[2]);
    const valueText = row.value < 0 
      ? `-$${Math.abs(row.value).toLocaleString('es-CO')}`
      : `$${row.value.toLocaleString('es-CO')}`;
    doc.text(valueText, 190, y + 4.5, { align: 'right' });

    y += 7;
  });

  // Borde de tabla
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.1);
  doc.rect(15, y - 21, 180, 21, 'S');

  // ===== PROGRESO DE PAGO =====
  y += 5;
  
  const totalLote = data.saldoAnterior + data.pago.monto;
  const porcentajePagado = ((totalLote - data.saldoActual) / totalLote) * 100;
  
  doc.setFontSize(8);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Progreso del Pago:', 20, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${porcentajePagado.toFixed(1)}%`, 190, y, { align: 'right' });
  
  y += 3;
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.3);
  doc.rect(20, y, 170, 3, 'S');
  
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  const barWidth = (porcentajePagado / 100) * 170;
  doc.rect(20, y, barWidth, 3, 'F');

  // ===== OBSERVACIONES =====
  if (data.pago.notas) {
    y += 10;
    
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    const notasLines = doc.splitTextToSize(data.pago.notas, 170);
    const notasHeight = (notasLines.length * 4) + 8;
    doc.rect(15, y, 180, notasHeight, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('OBSERVACIONES:', 20, y + 5);
    
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(notasLines, 20, y);
    y += notasLines.length * 4;
  }

  // ===== INFORMACIÓN ADICIONAL =====
  y += 10;
  
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, y, 180, 20, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('INFORMACION IMPORTANTE', 20, y + 5);
  
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  
  const infoTexts = [
    '- Conserve este recibo como comprobante de pago',
    '- Cualquier discrepancia debe reportarse dentro de las 48 horas',
    '- Para consultas, comuniquese con nosotros citando el numero de recibo'
  ];
  
  infoTexts.forEach(text => {
    doc.text(text, 20, y);
    y += 3;
  });

  // ===== VALIDACIÓN Y USUARIO =====
  y += 8;
  
  doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setLineWidth(0.1);
  doc.line(15, y, 195, y);
  y += 4;
  
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Documento validado electronicamente - No requiere firma', 105, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'italic');
  doc.text(`Codigo de verificacion: ${generateHash(numeroRecibo)}`, 105, y, { align: 'center' });
  
  // NUEVO: Mostrar usuario que generó el documento
  if (data.usuarioGenerador) {
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Generado por: ${data.usuarioGenerador}`, 105, y, { align: 'center' });
  }

  // ===== FOOTER =====
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Tel: 3124915127 - 3125123639', 105, 282, { align: 'center' });
  doc.text('Molino Campestre Rio Bravo - Recibo Oficial de Abono', 105, 286, { align: 'center' });
  doc.setFontSize(6);
  doc.text(`Documento generado: ${new Date().toLocaleString('es-CO')}`, 105, 290, { align: 'center' });

  return doc.output('blob');
};

// ============================================
// 3️⃣ REPORTE CONTABLE EJECUTIVO
// ============================================

export const generarReporteContable = (
  clientesActuales: ClienteActual[],
  clientesInteresados: ClienteInteresado[],
  pagosClientes: PagoCliente[],
  getPagosCliente: (clienteId: string) => PagoCliente[],
  usuarioGenerador?: string // NUEVO: Usuario que genera el reporte
): void => {
  try {
    const doc = new jsPDF();
    
    const pageWidth = 210;
    const leftMargin = 15;
    const rightMargin = 195;
    let currentY = 15;

    // Colores ejecutivos
    const darkBlue = [41, 55, 75];
    const mediumGray = [100, 116, 139];
    const lightGray = [241, 245, 249];
    const darkGray = [51, 65, 85];
    const accentGreen = [34, 139, 34];

    // === ENCABEZADO ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.text("REPORTE CONTABLE DE CLIENTES Y COBRANZAS", pageWidth / 2, currentY, { align: "center" });

    currentY += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text("Proyecto Molino Campestre - Estado Financiero", pageWidth / 2, currentY, { align: "center" });
    
    currentY += 5;
    const fechaReporte = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(8);
    doc.text(`Fecha de Emision: ${fechaReporte}`, rightMargin, currentY, { align: "right" });
    
    // NUEVO: Mostrar usuario generador
    if (usuarioGenerador) {
      currentY += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text(`Generado por: ${usuarioGenerador}`, rightMargin, currentY, { align: "right" });
    }

    currentY += 8;
    doc.setLineWidth(0.3);
    doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    currentY += 8;

    // === RESUMEN FINANCIERO ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("RESUMEN GENERAL DEL ESTADO", leftMargin, currentY);
    currentY += 5;

    const totalClientes = clientesActuales.length;
    const totalInteresados = clientesInteresados.filter(c => c.estado !== 'convertido').length;
    const totalValorLotes = clientesActuales.reduce((sum, c) => sum + (c.valorLote || 0), 0);
    const totalPagado = pagosClientes.reduce((sum, p) => sum + p.monto, 0);
    const totalPendiente = clientesActuales.reduce((sum, c) => {
      const pagos = getPagosCliente(c.id);
      const totalPagadoCliente = pagos.reduce((s, p) => s + p.monto, 0);
      return sum + (c.saldoFinal - totalPagadoCliente);
    }, 0);

    const resumenData = [
      { label: "Total Clientes Activos", value: totalClientes.toString() },
      { label: "Total Interesados", value: totalInteresados.toString() },
      { label: "Valor Cartera (Lotes)", value: `$${totalValorLotes.toLocaleString('es-CO')}`, isMoney: true },
      { label: "Total Recaudado", value: `$${totalPagado.toLocaleString('es-CO')}`, isMoney: true, color: accentGreen },
      { label: "Saldo por Cobrar", value: `$${totalPendiente.toLocaleString('es-CO')}`, isMoney: true, color: [180, 0, 0] },
      { label: "Total Transacciones", value: pagosClientes.length.toString() },
    ];

    const tableTop = currentY;
    const rowHeight = 7;
    const tableWidth = rightMargin - leftMargin;

    resumenData.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(leftMargin, tableTop + (index * rowHeight), tableWidth, rowHeight, 'F');
      }
      
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setLineWidth(0.1);
      doc.line(leftMargin, tableTop + (index * rowHeight) + rowHeight, rightMargin, tableTop + (index * rowHeight) + rowHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(row.label, leftMargin + 2, tableTop + (index * rowHeight) + 4.5);

      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      if (row.color) doc.setTextColor(row.color[0], row.color[1], row.color[2]);
      else doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(row.value, rightMargin - 2, tableTop + (index * rowHeight) + 4.5, { align: "right" });
    });
    
    currentY = tableTop + (resumenData.length * rowHeight);
    doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, tableTop, tableWidth, currentY - tableTop);

    currentY += 12;

    // === DETALLE DE CLIENTES ===
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text("DETALLE DE CUENTAS POR COBRAR", leftMargin, currentY);
    currentY += 6;

    const headerHeight = 7;
    const rowHeightClientes = 6;
    
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(leftMargin, currentY, tableWidth, headerHeight, 'F');
    
    doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.rect(leftMargin, currentY, tableWidth, headerHeight, 'S');
    
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    
    const colCliente = 16;
    const colLote = 80;
    const colTotal = 100;
    const colPagado = 130;
    const colSaldo = 160;

    doc.text("CLIENTE", leftMargin + 2, currentY + 4.5);
    doc.text("LOTE", colLote, currentY + 4.5);
    doc.text("TOTAL", colTotal, currentY + 4.5);
    doc.text("PAGADO", colPagado, currentY + 4.5);
    doc.text("SALDO", colSaldo, currentY + 4.5);
    doc.text("ESTADO", rightMargin - 2, currentY + 4.5, { align: "right" });

    currentY += headerHeight;

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const maxClientesPage1 = Math.min(clientesActuales.length, 28);

    for (let i = 0; i < maxClientesPage1; i++) {
      const cliente = clientesActuales[i];
      const pagos = getPagosCliente(cliente.id);
      const totalPagadoCliente = pagos.reduce((s, p) => s + p.monto, 0);
      const saldo = cliente.saldoFinal - totalPagadoCliente;

      if (i % 2 === 1) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(leftMargin, currentY, tableWidth, rowHeightClientes, 'F');
      }

      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.setLineWidth(0.1);
      doc.line(leftMargin, currentY + rowHeightClientes, rightMargin, currentY + rowHeightClientes);

      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      
      let nombre = cliente.nombre;
      if (nombre.length > 22) nombre = nombre.substring(0, 20) + '...';
      doc.text(nombre, leftMargin + 2, currentY + 4);

      doc.text(`#${cliente.numeroLote}`, colLote, currentY + 4);

      doc.setFont("courier", "normal");
      doc.text(`$${(cliente.valorLote||0).toLocaleString('es-CO')}`, colTotal, currentY + 4);
      
      doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
      doc.text(`$${totalPagadoCliente.toLocaleString('es-CO')}`, colPagado, currentY + 4);
      
      doc.setTextColor(180, 0, 0);
      doc.text(`$${saldo.toLocaleString('es-CO')}`, colSaldo, currentY + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      let estadoColor = darkGray;
      if(cliente.estado === 'pagado') estadoColor = accentGreen;
      else if(cliente.estado === 'mora') estadoColor = [180, 0, 0];
      else estadoColor = darkBlue;
      
      doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
      doc.text(cliente.estado.toUpperCase(), rightMargin - 2, currentY + 4, { align: "right" });

      currentY += rowHeightClientes;
    }

    doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY, rightMargin, currentY);
    
    // === PÁGINA 2: TRANSACCIONES ===
    if (pagosClientes.length > 0) {
      doc.addPage();
      currentY = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text("HISTORIAL DE TRANSACCIONES Y PAGOS", leftMargin, currentY);
      currentY += 6;

      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(leftMargin, currentY, tableWidth, headerHeight, 'F');
      
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.rect(leftMargin, currentY, tableWidth, headerHeight, 'S');
      
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      
      doc.text("FECHA", leftMargin + 2, currentY + 4.5);
      doc.text("REFERENCIA", 30, currentY + 4.5);
      doc.text("CLIENTE", 65, currentY + 4.5);
      doc.text("TIPO", 115, currentY + 4.5);
      doc.text("MONTO", 145, currentY + 4.5);
      doc.text("METODO", rightMargin - 2, currentY + 4.5, { align: "right" });

      currentY += headerHeight;

      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      const pagosOrdenados = [...pagosClientes]
        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());

      pagosOrdenados.forEach((pago, index) => {
        const cliente = clientesActuales.find(c => c.id === pago.clienteId);

        if (index % 2 === 1) {
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(leftMargin, currentY, tableWidth, rowHeightClientes, 'F');
        }

        doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.setLineWidth(0.1);
        doc.line(leftMargin, currentY + rowHeightClientes, rightMargin, currentY + rowHeightClientes);

        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.setFont("courier", "normal");
        doc.text(new Date(pago.fechaPago).toLocaleDateString('es-CO'), leftMargin + 2, currentY + 4);
        
        doc.setFont("helvetica", "normal");
        doc.text(`Lote #${cliente?.numeroLote || '-'}`, 30, currentY + 4);
        
        let nombre = cliente?.nombre || 'Desconocido';
        if (nombre.length > 16) nombre = nombre.substring(0, 14) + '...';
        doc.text(nombre, 65, currentY + 4);
        
        doc.setFontSize(6);
        const tipoPagoTexto = pago.tipoPago || 'PAGO';
        doc.text(tipoPagoTexto.toUpperCase().substring(0, 10), 115, currentY + 4);
        
        doc.setFontSize(7);
        doc.setFont("courier", "bold");
        doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
        doc.text(`$${pago.monto.toLocaleString('es-CO')}`, 145, currentY + 4);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        const formaPago = (pago.formaPago || 'N/A').toUpperCase();
        doc.text(formaPago, rightMargin - 2, currentY + 4, { align: "right" });

        currentY += rowHeightClientes;

        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
      });
      
      doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, currentY, rightMargin, currentY);
    }

    // === PIE DE PÁGINA ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setLineWidth(0.1);
      doc.setDrawColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.line(leftMargin, 280, rightMargin, 280);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text("Este documento es un informe generado automaticamente", pageWidth / 2, 285, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.text(`Pagina ${i} de ${pageCount}`, rightMargin, 290, { align: "right" });
    }

    const fileName = `Reporte_Contable_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF contable.');
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const generateHash = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
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

export const agregarCodigoQR = (doc: jsPDF, datos: string, x: number, y: number) => {
  console.log('Codigo QR pendiente de implementacion', datos, x, y);
};

export const agregarMarcaAgua = (doc: jsPDF, texto: string = 'PAGADO') => {
  doc.setTextColor(220, 220, 220);
  doc.setFontSize(50);
  doc.setFont('helvetica', 'bold');
  doc.saveGraphicsState();
  doc.text(texto, 105, 150, {
    align: 'center',
    angle: 45,
    renderingMode: 'stroke'
  });
  doc.restoreGraphicsState();
};