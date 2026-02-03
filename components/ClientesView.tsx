import React, { useState } from 'react';
import { ClienteInteresado, ClienteActual, PagoCliente, User } from '../types';
import { Users, UserPlus, DollarSign, FileText, Trash2, Eye, Plus, X, CheckCircle, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

// Nuevos imports para servicios de PDF y Envío
import {
  generarReciboAbono,
  blobToBase64,
  descargarPDF,
  generarNombreArchivo,
  type ReciboData
} from '../services/pdfService';

import { enviarReciboAbono } from '../services/envioService';

interface ClientesViewProps {
  clientesInteresados: ClienteInteresado[];
  clientesActuales: ClienteActual[];
  pagosClientes: PagoCliente[];
  onAddClienteInteresado: (cliente: Omit<ClienteInteresado, 'id' | 'createdAt'>) => void;
  onConvertToClienteActual: (interesadoId: string, clienteData: Omit<ClienteActual, 'id' | 'createdAt'>) => void;
  onAddPagoCliente: (pago: Omit<PagoCliente, 'id' | 'createdAt'>) => void;
  onDeleteClienteInteresado: (id: string) => void;
  onDeleteClienteActual: (id: string) => void;
  onDeletePagoCliente?: (id: string) => void;
  onUpdateClienteInteresado?: (id: string, updates: Partial<ClienteInteresado>) => void;
  onUpdateClienteActual?: (id: string, updates: Partial<ClienteActual>) => void;
  currentUser: User;
  // Agregado para soportar la función de guardar documentos
  onAddDocument?: (doc: any) => Promise<void>;
}

const ClientesView: React.FC<ClientesViewProps> = ({
  clientesInteresados,
  clientesActuales,
  pagosClientes,
  onAddClienteInteresado,
  onConvertToClienteActual,
  onAddPagoCliente,
  onDeleteClienteInteresado,
  onDeleteClienteActual,
  onDeletePagoCliente,
  currentUser,
  onAddDocument, // Destructuramos la nueva prop
}) => {
  const [activeTab, setActiveTab] = useState<'interesados' | 'actuales'>('interesados');
  const [showModalInteresado, setShowModalInteresado] = useState(false);
  const [showModalActual, setShowModalActual] = useState(false);
  const [showModalPago, setShowModalPago] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteActual | null>(null);
  const [selectedInteresado, setSelectedInteresado] = useState<ClienteInteresado | null>(null);
  
  // Nuevo estado para controlar la carga de generación de recibos
  const [generandoRecibo, setGenerandoRecibo] = useState<string | null>(null);

  // Form states
  const [formInteresado, setFormInteresado] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    notas: '',
  });

  const [formActual, setFormActual] = useState({
    nombre: '',
    email: '',
    telefono: '',
    numeroLote: '',
    valorLote: 0,
    depositoInicial: 0,
    numeroCuotas: 1,
    formaPagoInicial: 'efectivo',
    formaPagoCuotas: 'efectivo',
    documentoCompraventa: '',
  });

  const [formPago, setFormPago] = useState({
    monto: 0,
    tipoPago: 'cuota' as 'cuota' | 'deposito_inicial' | 'pago_extra',
    formaPago: 'efectivo',
    documentoAdjunto: '',
    notas: '',
  });

  const handleAddInteresado = (e: React.FormEvent) => {
    e.preventDefault();
    onAddClienteInteresado({
      ...formInteresado,
      fechaContacto: new Date().toISOString(),
      estado: 'activo',
    });
    setFormInteresado({ nombre: '', email: '', telefono: '', direccion: '', notas: '' });
    setShowModalInteresado(false);
  };

  const handleConvertToActual = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInteresado) {
      alert('Error: No hay cliente interesado seleccionado');
      return;
    }

    const saldoRestante = formActual.valorLote - formActual.depositoInicial;
    const valorCuota = saldoRestante / formActual.numeroCuotas;

    onConvertToClienteActual(selectedInteresado.id, {
      nombre: formActual.nombre,
      email: formActual.email,
      telefono: formActual.telefono,
      numeroLote: formActual.numeroLote,
      valorLote: formActual.valorLote,
      depositoInicial: formActual.depositoInicial,
      numeroCuotas: formActual.numeroCuotas,
      formaPagoInicial: formActual.formaPagoInicial,
      formaPagoCuotas: formActual.formaPagoCuotas,
      documentoCompraventa: formActual.documentoCompraventa,
      saldoRestante,
      valorCuota,
      saldoFinal: saldoRestante,
      estado: 'activo',
    });

    setFormActual({
      nombre: '',
      email: '',
      telefono: '',
      numeroLote: '',
      valorLote: 0,
      depositoInicial: 0,
      numeroCuotas: 1,
      formaPagoInicial: 'efectivo',
      formaPagoCuotas: 'efectivo',
      documentoCompraventa: '',
    });
    setSelectedInteresado(null);
    setShowModalActual(false);
  };

  const handleAddPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    onAddPagoCliente({
      clienteId: selectedCliente.id,
      fechaPago: new Date().toISOString(),
      ...formPago,
    });

    setFormPago({
      monto: 0,
      tipoPago: 'cuota',
      formaPago: 'efectivo',
      documentoAdjunto: '',
      notas: '',
    });
    setSelectedCliente(null);
    setShowModalPago(false);
  };

  const getPagosCliente = (clienteId: string) => {
    return pagosClientes.filter((p) => p.clienteId === clienteId);
  };

  const getTotalPagado = (clienteId: string) => {
    return getPagosCliente(clienteId).reduce((sum, p) => sum + p.monto, 0);
  };

  // ==================== FUNCIÓN PARA GENERAR RECIBO ====================
  const handleGenerarReciboAbono = async (
    cliente: ClienteActual,
    pago: PagoCliente
  ) => {
    try {
      setGenerandoRecibo(pago.id);
      console.log('📋 Generando recibo de abono...');

      // Calcular saldos
      const abonosPosteriores = pagosClientes
        .filter(
          (p) =>
            p.clienteId === cliente.id &&
            p.tipoPago !== 'Depósito de Reserva' &&
            p.tipoPago !== 'Cuota Inicial'
        )
        .reduce((acc, p) => acc + p.monto, 0);

      const totalPagado = cliente.depositoInicial + abonosPosteriores;
      const saldoActual = cliente.valorLote - totalPagado;
      const saldoAnterior = saldoActual + pago.monto;

      console.log('💰 Saldos calculados:', {
        saldoAnterior,
        monto: pago.monto,
        saldoActual
      });

      // Generar PDF del recibo
      console.log('📄 Generando PDF...');

      const reciboData: ReciboData = {
        cliente,
        pago,
        saldoAnterior,
        saldoActual
      };

      const reciboBlob = await generarReciboAbono(reciboData);
      const reciboBase64 = await blobToBase64(reciboBlob);
      const nombreArchivo = generarNombreArchivo(
        'recibo',
        cliente.numeroLote
      );

      console.log('✅ PDF generado');

      // Guardar documento si la función está disponible
      console.log('💾 Guardando documento...');
      if (onAddDocument) {
        await onAddDocument({
          name: nombreArchivo,
          type: 'application/pdf',
          data: reciboBase64,
          uploadedBy: currentUser?.name || 'Sistema',
          category: 'Recibo de Abono',
          uploadedAt: new Date().toISOString()
        });
      }

      console.log('✅ Documento guardado');

      // Preguntar si enviar por email
      const enviarPorEmail = window.confirm(
        `¿Deseas enviar el recibo por email a ${cliente.email}?`
      );

      if (enviarPorEmail && cliente.email) {
        console.log('📧 Enviando recibo por email...');

        const resultadoEnvio = await enviarReciboAbono(
          {
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono,
            numeroLote: cliente.numeroLote
          },
          {
            monto: pago.monto,
            fecha: pago.fechaPago,
            saldoAnterior,
            saldoActual
          },
          reciboBase64,
          nombreArchivo
        );

        if (resultadoEnvio.success) {
          console.log('✅ Email enviado');
        } else {
          console.warn('⚠️ Error enviando email:', resultadoEnvio.error);
        }
      }

      // Descargar PDF
      descargarPDF(reciboBlob, nombreArchivo);

      alert(
        `✅ Recibo generado y guardado!\n\nArchivo: ${nombreArchivo}\n\nEl recibo ha sido descargado a tu computadora.`
      );
    } catch (error) {
      console.error('❌ Error generando recibo:', error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setGenerandoRecibo(null);
    }
  };

  // ============================================
  // FUNCIÓN DE EXPORTACIÓN A PDF (REPORTES GENERALES)
  // ============================================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      const brandColor = [79, 70, 229];
      const greenColor = [16, 185, 129];
      const redColor = [239, 68, 68];
      const blueColor = [59, 130, 246];
      const orangeColor = [249, 115, 22];

      // ===== PÁGINA 1: RESUMEN GENERAL =====
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Clientes', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 25, { align: 'center' });

      // Calcular estadísticas
      const totalClientes = clientesActuales.length;
      const totalInteresados = clientesInteresados.filter(c => c.estado !== 'convertido').length;
      const totalValorLotes = clientesActuales.reduce((sum, c) => sum + (c.valorLote || 0), 0);
      const totalPagado = pagosClientes.reduce((sum, p) => sum + p.monto, 0);
      const totalPendiente = clientesActuales.reduce((sum, c) => {
        const pagos = getPagosCliente(c.id);
        const totalPagadoCliente = pagos.reduce((s, p) => s + p.monto, 0);
        return sum + (c.saldoFinal - totalPagadoCliente);
      }, 0);

      // Resumen General
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General', 14, 45);

      // Tarjetas de estadísticas (2x3)
      const cardY = 52;
      const cardHeight = 18;
      const cardWidth = 60;
      
      // Fila 1
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Clientes Actuales', 44, cardY + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(totalClientes.toString(), 44, cardY + 14, { align: 'center' });

      doc.setFillColor(239, 246, 255);
      doc.roundedRect(78, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Interesados', 108, cardY + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
      doc.text(totalInteresados.toString(), 108, cardY + 14, { align: 'center' });

      doc.setFillColor(254, 249, 195);
      doc.roundedRect(142, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Valor Total Lotes', 172, cardY + 6, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(`$${totalValorLotes.toLocaleString()}`, 172, cardY + 14, { align: 'center' });

      // Fila 2
      const cardY2 = cardY + cardHeight + 5;
      
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(14, cardY2, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Pagado', 44, cardY2 + 6, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(`$${totalPagado.toLocaleString()}`, 44, cardY2 + 14, { align: 'center' });

      doc.setFillColor(255, 237, 213);
      doc.roundedRect(78, cardY2, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Saldo Pendiente', 108, cardY2 + 6, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
      doc.text(`$${totalPendiente.toLocaleString()}`, 108, cardY2 + 14, { align: 'center' });

      doc.setFillColor(243, 244, 246);
      doc.roundedRect(142, cardY2, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Pagos', 172, cardY2 + 6, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(pagosClientes.length.toString(), 172, cardY2 + 14, { align: 'center' });

      // Tabla de Clientes Actuales
      let y = 105;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Clientes con Lotes Adquiridos', 14, y);
      
      y += 8;
      
      // Encabezados de tabla
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Cliente', 16, y + 5);
      doc.text('Lote', 60, y + 5);
      doc.text('Valor', 77, y + 5);
      doc.text('Pagado', 100, y + 5);
      doc.text('Pendiente', 125, y + 5);
      doc.text('Progreso', 155, y + 5);
      doc.text('Estado', 177, y + 5);

      y += 10;

      // Datos de clientes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const maxClientes = Math.min(clientesActuales.length, 10);
      
      for (let i = 0; i < maxClientes; i++) {
        const cliente = clientesActuales[i];
        const totalPagadoCliente = getTotalPagado(cliente.id);
        const saldoPendiente = cliente.saldoFinal - totalPagadoCliente;
        const progreso = ((totalPagadoCliente / cliente.saldoFinal) * 100).toFixed(0);

        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 253);
          doc.rect(14, y - 3, 182, 7, 'F');
        }

        // Nombre
        doc.setTextColor(0, 0, 0);
        const nombreCorto = cliente.nombre.length > 20 ? cliente.nombre.substring(0, 18) + '...' : cliente.nombre;
        doc.text(nombreCorto, 16, y + 2);

        // Lote
        doc.text(`#${cliente.numeroLote}`, 60, y + 2);

        // Valor lote
        doc.setTextColor(71, 85, 105);
        doc.text(`$${(cliente.valorLote || 0).toLocaleString()}`, 77, y + 2);

        // Pagado
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`$${totalPagadoCliente.toLocaleString()}`, 100, y + 2);

        // Pendiente
        doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
        doc.text(`$${saldoPendiente.toLocaleString()}`, 125, y + 2);

        // Progreso
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text(`${progreso}%`, 155, y + 2);

        // Estado (badge)
        let estadoColor, estadoBg;
        if (cliente.estado === 'pagado') {
          estadoBg = [220, 252, 231];
          estadoColor = [6, 95, 70];
        } else if (cliente.estado === 'mora') {
          estadoBg = [254, 226, 226];
          estadoColor = [153, 27, 27];
        } else {
          estadoBg = [219, 234, 254];
          estadoColor = [30, 64, 175];
        }
        
        doc.setFillColor(estadoBg[0], estadoBg[1], estadoBg[2]);
        doc.roundedRect(175, y - 2, 18, 5, 1, 1, 'F');
        doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
        doc.setFontSize(6);
        doc.text(cliente.estado.toUpperCase(), 184, y + 1.5, { align: 'center' });
        doc.setFontSize(7);

        y += 7;
        
        if (y > 270) break;
      }

      // ===== PÁGINA 2: HISTORIAL DE PAGOS =====
      if (pagosClientes.length > 0) {
        doc.addPage();
        
        doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Historial de Pagos', 105, 15, { align: 'center' });

        y = 35;
        
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Fecha', 16, y + 5);
        doc.text('Cliente', 40, y + 5);
        doc.text('Lote', 85, y + 5);
        doc.text('Monto', 105, y + 5);
        doc.text('Tipo Pago', 130, y + 5);
        doc.text('Forma Pago', 165, y + 5);

        y += 10;

        doc.setFont('helvetica', 'normal');
        const maxPagos = Math.min(pagosClientes.length, 30);
        const pagosOrdenados = [...pagosClientes]
          .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
          .slice(0, maxPagos);

        for (let i = 0; i < pagosOrdenados.length; i++) {
          const pago = pagosOrdenados[i];
          const cliente = clientesActuales.find(c => c.id === pago.clienteId);

          if (i % 2 === 0) {
            doc.setFillColor(252, 252, 253);
            doc.rect(14, y - 3, 182, 7, 'F');
          }

          doc.setTextColor(0, 0, 0);
          doc.text(new Date(pago.fechaPago).toLocaleDateString('es-ES'), 16, y + 2);

          const clienteNombre = cliente ? 
            (cliente.nombre.length > 20 ? cliente.nombre.substring(0, 18) + '...' : cliente.nombre) : 
            'Desconocido';
          doc.text(clienteNombre, 40, y + 2);

          doc.text(cliente ? `#${cliente.numeroLote}` : '-', 85, y + 2);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.text(`$${pago.monto.toLocaleString()}`, 105, y + 2);
          doc.setFont('helvetica', 'normal');

          doc.setTextColor(71, 85, 105);
          const tipoPagoTexto = pago.tipoPago === 'cuota' ? 'Cuota' : 
                                pago.tipoPago === 'deposito_inicial' ? 'Depósito' : 'Extra';
          doc.text(tipoPagoTexto, 130, y + 2);

          doc.text(pago.formaPago.charAt(0).toUpperCase() + pago.formaPago.slice(1), 165, y + 2);

          y += 7;

          if (y > 280) break;
        }
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Molino Campestre Rio Bravo - Página ${i} de ${pageCount}`,
          105,
          290,
          { align: 'center' }
        );
      }

      const fileName = `clientes_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs y botón de exportación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('interesados')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'interesados'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserPlus size={18} />
              Clientes Interesados ({clientesInteresados.filter(c => c.estado !== 'convertido').length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('actuales')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'actuales'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Clientes Actuales ({clientesActuales.length})
            </div>
          </button>
        </div>

        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          title="Exportar a PDF"
        >
          <Printer size={18} />
          <span className="hidden sm:inline">Exportar PDF</span>
        </button>
      </div>

      {/* CLIENTES INTERESADOS */}
      {activeTab === 'interesados' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Gestión de Clientes Interesados</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModalInteresado(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus size={18} /> Agregar Interesado
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Fecha Contacto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientesInteresados
                  .filter((c) => c.estado !== 'convertido')
                  .map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{cliente.nombre}</td>
                      <td className="px-6 py-4">{cliente.email || '-'}</td>
                      <td className="px-6 py-4">{cliente.telefono || '-'}</td>
                      <td className="px-6 py-4">{new Date(cliente.fechaContacto).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cliente.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedInteresado(cliente);
                              setFormActual((prev) => ({
                                ...prev,
                                nombre: cliente.nombre,
                                email: cliente.email || '',
                                telefono: cliente.telefono || '',
                              }));
                              setShowModalActual(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 transition-colors"
                            title="Convertir a cliente actual"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => onDeleteClienteInteresado(cliente.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {clientesInteresados.filter((c) => c.estado !== 'convertido').length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No hay clientes interesados registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLIENTES ACTUALES */}
      {activeTab === 'actuales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Clientes con Lotes Adquiridos</h3>
            <button
              onClick={() => {
                setSelectedInteresado(null);
                setFormActual({
                  nombre: '',
                  email: '',
                  telefono: '',
                  numeroLote: '',
                  valorLote: 0,
                  depositoInicial: 0,
                  numeroCuotas: 1,
                  formaPagoInicial: 'efectivo',
                  formaPagoCuotas: 'efectivo',
                  documentoCompraventa: '',
                });
                setShowModalActual(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus size={18} /> Agregar Cliente Actual
            </button>
          </div>

          <div className="grid gap-6">
            {clientesActuales.map((cliente) => {
              const totalPagado = getTotalPagado(cliente.id);
              const saldoPendiente = cliente.saldoFinal - totalPagado;
              const progreso = (totalPagado / cliente.saldoFinal) * 100;

              return (
                <div key={cliente.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{cliente.nombre}</h4>
                        <p className="text-sm text-slate-500">
                          Lote #{cliente.numeroLote} • {cliente.email} • {cliente.telefono}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cliente.estado === 'pagado'
                            ? 'bg-green-100 text-green-800'
                            : cliente.estado === 'mora'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {cliente.estado.toUpperCase()}
                      </span>
                    </div>

                    {/* Información del cliente reorganizada */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  {/* Columna Izquierda: Información básica */}
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 font-medium w-24">Email:</span>
      <span className="text-slate-900">{cliente.email || 'No registrado'}</span>
    </div>
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-sm flex-1">
        <span className="text-slate-500 font-medium w-24">Teléfono:</span>
        <span className="text-slate-900">{cliente.telefono || 'No registrado'}</span>
      </div>
      
      {/* ✨ ACCIONES AQUÍ - AL LADO DEL TELÉFONO */}
      <div className="flex gap-2">
  <button
    onClick={() => {
      setSelectedCliente(cliente);
      setShowModalPago(true);
    }}
    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
  >
    <DollarSign size={16} /> Registrar Pago
  </button>
  <button
    onClick={() => {
      if (window.confirm(`¿Está seguro de que desea eliminar a ${cliente.nombre}? Se eliminarán todos sus pagos asociados.`)) {
        onDeleteClienteActual(cliente.id);
      }
    }}
    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
  >
    <Trash2 size={16} /> Eliminar
  </button>
</div>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 font-medium w-24">Lote:</span>
      <span className="text-slate-900 font-bold">#{cliente.numeroLote}</span>
    </div>
  </div>

  {/* Columna Derecha: Datos financieros compactos */}
  <div className="grid grid-cols-2 gap-3">
    <div className="bg-slate-50 p-3 rounded-lg">
      <p className="text-xs text-slate-500 mb-1">Valor Lote</p>
      <p className="text-base font-bold text-slate-900">${(cliente.valorLote || 0) / 1000}k</p>
    </div>
    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
      <p className="text-xs text-emerald-600 mb-1">Depósito</p>
      <p className="text-base font-bold text-emerald-700">${(cliente.depositoInicial || 0) / 1000}k</p>
    </div>
    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
      <p className="text-xs text-blue-600 mb-1">Total Pagado</p>
      <p className="text-base font-bold text-blue-700">${(totalPagado / 1000).toFixed(1)}k</p>
    </div>
    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
      <p className="text-xs text-orange-600 mb-1">Pendiente</p>
      <p className="text-base font-bold text-orange-700">${(saldoPendiente / 1000).toFixed(1)}k</p>
    </div>
  </div>
</div>

                    {/* Barra de progreso */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Progreso de pago</span>
                        <span>{progreso.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progreso, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-slate-500">Cuotas:</span>{' '}
                        <span className="font-medium">{cliente.numeroCuotas}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Valor cuota:</span>{' '}
                        <span className="font-medium">${cliente.valorCuota?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Forma pago inicial:</span>{' '}
                        <span className="font-medium capitalize">{cliente.formaPagoInicial}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Forma pago cuotas:</span>{' '}
                        <span className="font-medium capitalize">{cliente.formaPagoCuotas}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedCliente(cliente);
                          setShowModalPago(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                      >
                        <DollarSign size={16} /> Registrar Pago
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de que desea eliminar a ${cliente.nombre}? Se eliminarán todos sus pagos asociados.`)) {
                            onDeleteClienteActual(cliente.id);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  </div>

                  {/* HISTORIAL DE PAGOS MEJORADO */}
                  {getPagosCliente(cliente.id).length > 0 && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-slate-700">
                          📋 Historial de Pagos
                        </h5>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                          {getPagosCliente(cliente.id).length} pago(s)
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {getPagosCliente(cliente.id)
                          .slice(-5) // Últimos 5 pagos
                          .reverse()
                          .map((pago) => (
                            <div
                              key={pago.id}
                              className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 hover:border-brand-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-emerald-600">
                                    ${pago.monto.toLocaleString()}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(pago.fechaPago).toLocaleDateString('es-CO')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-600">
                                    {pago.tipoPago || 'Abono'}
                                  </span>
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {pago.formaPago}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-2">
                                {/* Botón para generar recibo */}
                                <button
                                  onClick={() => handleGenerarReciboAbono(cliente, pago)}
                                  disabled={generandoRecibo === pago.id || !cliente.email}
                                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title={cliente.email ? 'Generar recibo de abono' : 'El cliente no tiene email'}
                                >
                                  {generandoRecibo === pago.id ? (
                                    <>
                                      <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                      <span>Procesando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>📄</span>
                                      <span className="hidden sm:inline">Recibo</span>
                                    </>
                                  )}
                                </button>

                                {/* Botón para eliminar pago */}
                                {onDeletePagoCliente && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`¿Deseas eliminar este pago de $${pago.monto.toLocaleString()}?`)) {
                                        onDeletePagoCliente(pago.id);
                                      }
                                    }}
                                    className="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar pago"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      {getPagosCliente(cliente.id).length > 5 && (
                        <p className="text-xs text-slate-500 mt-2 text-center">
                          + {getPagosCliente(cliente.id).length - 5} pagos anteriores
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {clientesActuales.length === 0 && (
              <div className="text-center py-20 text-slate-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay clientes con lotes adquiridos</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Agregar Interesado */}
      {showModalInteresado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Nuevo Cliente Interesado</h3>
              <button onClick={() => setShowModalInteresado(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddInteresado} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={formInteresado.nombre}
                  onChange={(e) => setFormInteresado({ ...formInteresado, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formInteresado.email}
                  onChange={(e) => setFormInteresado({ ...formInteresado, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formInteresado.telefono}
                  onChange={(e) => setFormInteresado({ ...formInteresado, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={formInteresado.notas}
                  onChange={(e) => setFormInteresado({ ...formInteresado, notas: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Convertir a Cliente Actual */}
      {showModalActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">
                {selectedInteresado ? 'Convertir a Cliente Actual' : 'Nuevo Cliente Actual'}
              </h3>
              <button onClick={() => setShowModalActual(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConvertToActual} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={formActual.nombre}
                    onChange={(e) => setFormActual({ ...formActual, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formActual.email}
                    onChange={(e) => setFormActual({ ...formActual, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formActual.telefono}
                    onChange={(e) => setFormActual({ ...formActual, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Lote *</label>
                  <input
                    type="text"
                    value={formActual.numeroLote}
                    onChange={(e) => setFormActual({ ...formActual, numeroLote: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor del Lote ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formActual.valorLote}
                    onChange={(e) => setFormActual({ ...formActual, valorLote: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Depósito Inicial ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formActual.depositoInicial}
                    onChange={(e) => setFormActual({ ...formActual, depositoInicial: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Cuotas *</label>
                  <input
                    type="number"
                    min="1"
                    value={formActual.numeroCuotas}
                    onChange={(e) => setFormActual({ ...formActual, numeroCuotas: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Forma Pago Inicial</label>
                  <select
                    value={formActual.formaPagoInicial}
                    onChange={(e) => setFormActual({ ...formActual, formaPagoInicial: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Forma Pago Cuotas</label>
                <select
                  value={formActual.formaPagoCuotas}
                  onChange={(e) => setFormActual({ ...formActual, formaPagoCuotas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
              >
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Pago MEJORADO */}
      {showModalPago && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* ENCABEZADO */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6 flex justify-between items-start rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold">💳 Registrar Pago</h3>
                <p className="text-emerald-100 mt-1">{selectedCliente.nombre}</p>
              </div>
              <button
                onClick={() => setShowModalPago(false)}
                className="text-white hover:text-emerald-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddPago} className="p-6 space-y-4">
              {/* INFORMACIÓN DEL CLIENTE */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  📊 Información del Lote
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lote:</span>
                    <span className="font-semibold">#{selectedCliente.numeroLote}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Valor Total:</span>
                    <span className="font-semibold">
                      ${selectedCliente.valorLote?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-600">Saldo Actual:</span>
                    <span className="font-bold text-orange-600">
                      ${selectedCliente.saldoFinal?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* MONTO */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  💵 Monto del Pago *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formPago.monto}
                  onChange={(e) =>
                    setFormPago({
                      ...formPago,
                      monto: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-semibold"
                  placeholder="0.00"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  Máximo: ${selectedCliente.saldoFinal?.toLocaleString() || 0}
                </p>
              </div>

              {/* TIPO DE PAGO */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  📋 Tipo de Pago *
                </label>
                <select
                  value={formPago.tipoPago}
                  onChange={(e) =>
                    setFormPago({
                      ...formPago,
                      tipoPago: e.target.value as any
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                >
                  <option value="cuota">Cuota Mensual</option>
                  <option value="abono">Abono Extra</option>
                  <option value="deposito_inicial">Depósito Inicial</option>
                </select>
              </div>

              {/* FORMA DE PAGO */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  💳 Forma de Pago
                </label>
                <select
                  value={formPago.formaPago}
                  onChange={(e) =>
                    setFormPago({
                      ...formPago,
                      formaPago: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="cheque">Cheque</option>
                  <option value="debito">Débito Automático</option>
                  <option value="tarjeta_credito">Tarjeta de Crédito</option>
                </select>
              </div>

              {/* NOTAS */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  📝 Notas (Opcional)
                </label>
                <textarea
                  value={formPago.notas}
                  onChange={(e) =>
                    setFormPago({
                      ...formPago,
                      notas: e.target.value
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Ej: Pago realizado en banco XYZ"
                />
              </div>

              {/* BOTONES */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModalPago(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formPago.monto <= 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  ✅ Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesView;