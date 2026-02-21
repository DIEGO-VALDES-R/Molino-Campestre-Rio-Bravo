import React, { useState, useMemo } from 'react';
import {
  MapPin, Home, Lock, CheckCircle, Clock, X, Eye, Edit2, Trash2, Plus, User,
} from 'lucide-react';
import { ClienteActual, PagoCliente, Lote } from '../../types';

import {
  generarComprobanteReservaVenta,
  generarReciboAbono,
  blobToBase64,
  descargarPDF,
  generarNombreArchivo,
  fileToBase64,
  type ComprobanteData,
  type ReciboData,
  type CuotaPersonalizada,
} from '../services/pdfService';

import {
  enviarComprobanteCompleto,
  enviarReciboAbono,
} from '../services/envioService';

// ============================================================
// TIPOS E INTERFACES
// ============================================================

interface MapaLotesProps {
  lotes: Lote[];
  clientesActuales: ClienteActual[];
  pagosClientes: PagoCliente[];
  onSelectLote?: (lote: Lote) => void;
  onEditLote?: (id: string, updates: Partial<Lote>) => void;
  onDeleteLote?: (loteId: string) => void;
  onAddLote?: (lote: Omit<Lote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onReservarVenderLote?: (
    loteId: string,
    numeroLote: string,
    clienteData: any,
    pagoInicial: number,
    estado: 'reservado' | 'vendido'
  ) => Promise<void>;
  editMode?: boolean;
}

// ============================================================
// CONSTANTES DE ESTILOS
// ============================================================

const LOTE_COLORS = {
  disponible: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: 'text-emerald-600',
    hover: 'hover:bg-emerald-100 hover:border-emerald-400',
    light: '#ecfdf5',
    dark: '#059669',
  },
  vendido: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-600',
    hover: 'hover:bg-blue-100 hover:border-blue-400',
    light: '#eff6ff',
    dark: '#2563eb',
  },
  reservado: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    icon: 'text-amber-600',
    hover: 'hover:bg-amber-100 hover:border-amber-400',
    light: '#fffbeb',
    dark: '#f59e0b',
  },
  bloqueado: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    text: 'text-slate-700',
    badge: 'bg-slate-200 text-slate-700',
    icon: 'text-slate-500',
    hover: 'hover:bg-slate-100 hover:border-slate-400',
    light: '#f8fafc',
    dark: '#64748b',
  },
};

const ESTADO_LABELS = {
  disponible: { label: 'Disponible', icon: Home, color: '#10b981' },
  vendido: { label: 'Vendido', icon: CheckCircle, color: '#3b82f6' },
  reservado: { label: 'Reservado', icon: Clock, color: '#f59e0b' },
  bloqueado: { label: 'Bloqueado', icon: Lock, color: '#6b7280' },
};

// ============================================================
// COMPONENTE AUXILIAR: EDITOR DE CUOTAS PERSONALIZADAS
// ============================================================

interface EditorCuotasProps {
  cuotas: CuotaPersonalizada[];
  onChange: (cuotas: CuotaPersonalizada[]) => void;
  valorTotal: number;
  depositoInicial: number;
}

const EditorCuotasPersonalizadas: React.FC<EditorCuotasProps> = ({
  cuotas,
  onChange,
  valorTotal,
  depositoInicial,
}) => {
  const saldoPendiente = valorTotal - depositoInicial;
  const totalCuotas = cuotas.reduce((sum, c) => sum + (c.monto || 0), 0);
  const diferencia = saldoPendiente - totalCuotas;

  const formatMoneda = (v: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(v);

  const agregarCuota = () => {
    const nuevaCuota: CuotaPersonalizada = {
      numero: cuotas.length + 1,
      descripcion: `Cuota ${cuotas.length + 1}`,
      monto: 0,
      fechaPago: '',
      condicion: '',
      pagada: false,
    };
    onChange([...cuotas, nuevaCuota]);
  };

  const actualizarCuota = (idx: number, campo: keyof CuotaPersonalizada, valor: any) => {
    const nuevasCuotas = cuotas.map((c, i) =>
      i === idx ? { ...c, [campo]: valor } : c
    );
    onChange(nuevasCuotas);
  };

  const eliminarCuota = (idx: number) => {
    const nuevasCuotas = cuotas
      .filter((_, i) => i !== idx)
      .map((c, i) => ({ ...c, numero: i + 1 }));
    onChange(nuevasCuotas);
  };

  return (
    <div className="space-y-3">
      {/* Resumen de totales */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
          <p className="text-blue-600 font-medium">Saldo pendiente</p>
          <p className="font-bold text-blue-800">{formatMoneda(saldoPendiente)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <p className="text-green-600 font-medium">Total en cuotas</p>
          <p className="font-bold text-green-800">{formatMoneda(totalCuotas)}</p>
        </div>
        <div
          className={`rounded-lg p-2 text-center border ${
            Math.abs(diferencia) < 1
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <p className={`font-medium ${Math.abs(diferencia) < 1 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(diferencia) < 1 ? '✓ Balanceado' : 'Diferencia'}
          </p>
          <p className={`font-bold ${Math.abs(diferencia) < 1 ? 'text-green-800' : 'text-red-800'}`}>
            {Math.abs(diferencia) < 1 ? 'OK' : formatMoneda(Math.abs(diferencia))}
          </p>
        </div>
      </div>

      {/* Lista de cuotas */}
      {cuotas.map((cuota, idx) => (
        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {cuota.numero}
              </span>
              <span className="text-sm font-semibold text-slate-700">Cuota #{cuota.numero}</span>
              {cuota.pagada && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  ✓ Pagada
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => eliminarCuota(idx)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción *</label>
              <input
                type="text"
                value={cuota.descripcion}
                onChange={(e) => actualizarCuota(idx, 'descripcion', e.target.value)}
                placeholder="Ej: Primera cuota - Arras confirmatorias"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Monto */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Monto ($) *</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={cuota.monto || ''}
                onChange={(e) => actualizarCuota(idx, 'monto', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
              />
              {cuota.monto > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  ≈ {cuota.monto >= 1000000
                    ? `$${(cuota.monto / 1000000).toFixed(1)}M`
                    : `$${(cuota.monto / 1000).toFixed(0)}K`}
                </p>
              )}
            </div>

            {/* Fecha de pago */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fecha de pago</label>
              <input
                type="date"
                value={cuota.fechaPago}
                onChange={(e) => actualizarCuota(idx, 'fechaPago', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Condición especial */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Condición especial (reemplaza la fecha si se especifica)
              </label>
              <input
                type="text"
                value={cuota.condicion || ''}
                onChange={(e) => actualizarCuota(idx, 'condicion', e.target.value)}
                placeholder="Ej: Al momento de la firma de escritura pública"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* ¿Ya pagada? */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`pagada-${idx}`}
                checked={cuota.pagada || false}
                onChange={(e) => actualizarCuota(idx, 'pagada', e.target.checked)}
                className="rounded"
              />
              <label htmlFor={`pagada-${idx}`} className="text-xs font-medium text-slate-600 cursor-pointer">
                Marcar como ya pagada
              </label>
            </div>
          </div>
        </div>
      ))}

      {/* Botón agregar cuota */}
      <button
        type="button"
        onClick={agregarCuota}
        className="w-full py-2.5 border-2 border-dashed border-brand-300 text-brand-600 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Plus size={16} />
        Agregar cuota
      </button>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL: MapaLotes
// ============================================================

export const MapaLotes: React.FC<MapaLotesProps> = ({
  lotes,
  clientesActuales,
  pagosClientes,
  onSelectLote,
  onEditLote,
  onDeleteLote,
  onAddLote,
  onReservarVenderLote,
  editMode = false,
}) => {
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReservaVentaModal, setShowReservaVentaModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'disponible' | 'vendido' | 'reservado' | 'bloqueado'>('todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documentoCompraventa, setDocumentoCompraventa] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  // ── NUEVOS ESTADOS PARA PLAN DE PAGO PERSONALIZADO ──────────────────────
  const [tipoPlanPago, setTipoPlanPago] = useState<'automatico' | 'personalizado'>('automatico');
  const [cuotasPersonalizadas, setCuotasPersonalizadas] = useState<CuotaPersonalizada[]>([]);
  const [notasEspeciales, setNotasEspeciales] = useState('');
  // ─────────────────────────────────────────────────────────────────────────

  const currentUser: any = { name: 'Admin' };

  const [editFormData, setEditFormData] = useState<Partial<Lote>>({});

  const [reservaVentaForm, setReservaVentaForm] = useState({
    accion: 'reservado' as 'reservado' | 'vendido',
    nombre: '',
    cedula: '',          // ← Nuevo: cédula del comprador
    email: '',
    telefono: '',
    depositoInicial: 0,
    numeroCuotas: 12,
    formaPagoInicial: 'Efectivo',
    formaPagoCuotas: 'Transferencia Bancaria',
    documentoCompraventa: '',
    notasEspeciales: '',
  });

  const [newLoteForm, setNewLoteForm] = useState({
    numeroLote: '',
    estado: 'disponible' as const,
    area: '',
    precio: '',
    ubicacion: '',
    descripcion: '',
    bloqueadoPor: '',
  });

  // ============================================================
  // MEMOS
  // ============================================================

  const stats = useMemo(() => ({
    total: lotes.length,
    disponibles: lotes.filter(l => l.estado === 'disponible').length,
    vendidos: lotes.filter(l => l.estado === 'vendido').length,
    reservados: lotes.filter(l => l.estado === 'reservado').length,
    bloqueados: lotes.filter(l => l.estado === 'bloqueado').length,
  }), [lotes]);

  const lotesFiltrados = useMemo(() => {
    if (filterEstado === 'todos') return lotes;
    return lotes.filter(l => l.estado === filterEstado);
  }, [lotes, filterEstado]);

  // ============================================================
  // HELPERS
  // ============================================================

  const getClienteInfo = (numeroLote: string) =>
    clientesActuales.find(c => c.numeroLote === numeroLote);

  const getProgressoPago = (numeroLote: string) => {
    const cliente = clientesActuales.find(c => c.numeroLote === numeroLote);
    if (!cliente) return 0;
    const totalPagado = pagosClientes
      .filter(p => p.clienteId === cliente.id)
      .reduce((sum, p) => sum + p.monto, 0);
    const valorTotal = cliente.saldoFinal || cliente.valorLote;
    return Math.round((totalPagado / valorTotal) * 100);
  };

  const calcularValorCuota = () => {
    if (!selectedLote?.precio || reservaVentaForm.depositoInicial <= 0) return 0;
    const saldoRestante = selectedLote.precio - reservaVentaForm.depositoInicial;
    const numeroCuotas = reservaVentaForm.numeroCuotas || 1;
    return saldoRestante / numeroCuotas;
  };

  // ============================================================
  // HANDLERS DE APERTURA DE MODALES
  // ============================================================

  const handleSelectLote = (lote: Lote) => {
    setSelectedLote(lote);
    setShowModal(true);
    onSelectLote?.(lote);
  };

  const handleOpenEditModal = (lote: Lote) => {
    setSelectedLote(lote);
    setEditFormData({
      numeroLote: lote.numeroLote,
      estado: lote.estado,
      area: lote.area,
      precio: lote.precio,
      ubicacion: lote.ubicacion,
      descripcion: lote.descripcion,
      bloqueadoPor: lote.bloqueadoPor,
      fila: lote.fila,
      columna: lote.columna,
    });
    setShowEditModal(true);
  };

  const handleOpenReservaVentaModal = (lote: Lote) => {
    setSelectedLote(lote);
    setReservaVentaForm({
      accion: 'reservado',
      nombre: '',
      cedula: '',
      email: '',
      telefono: '',
      depositoInicial: 0,
      numeroCuotas: 12,
      formaPagoInicial: 'Efectivo',
      formaPagoCuotas: 'Transferencia Bancaria',
      documentoCompraventa: '',
      notasEspeciales: '',
    });
    setCuotasPersonalizadas([]);
    setNotasEspeciales('');
    setDocumentoCompraventa(null);
    setShowReservaVentaModal(true);
    setShowModal(false);
  };

  // ============================================================
  // HANDLER: DOCUMENTO COMPRAVENTA
  // ============================================================

  const handleDocumentoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) {
      alert('El archivo debe ser menor a 5MB');
      return;
    }
    const tiposValidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    if (!tiposValidos.includes(archivo.type)) {
      alert('Solo se aceptan PDF, DOC, DOCX, JPG o PNG');
      return;
    }
    setDocumentoCompraventa(archivo);
  };

  // ============================================================
  // HANDLER: GUARDAR RESERVA / VENTA
  // ============================================================

  const handleSaveReservaVenta = async () => {
    if (!selectedLote || !selectedLote.precio) {
      alert('El lote debe tener un precio definido');
      return;
    }
    if (!reservaVentaForm.nombre.trim()) {
      alert('Por favor ingrese el nombre del cliente');
      return;
    }
    if (reservaVentaForm.depositoInicial <= 0) {
      alert('Por favor ingrese un depósito inicial mayor a cero');
      return;
    }
    if (reservaVentaForm.depositoInicial > selectedLote.precio) {
      alert(`El depósito no puede superar $${selectedLote.precio.toLocaleString()}`);
      return;
    }
    if (!reservaVentaForm.email || !reservaVentaForm.telefono) {
      alert('El email y el teléfono son obligatorios para generar el comprobante.');
      return;
    }
    if (tipoPlanPago === 'personalizado' && cuotasPersonalizadas.length === 0) {
      alert('Debes agregar al menos una cuota personalizada.');
      return;
    }

    try {
      setEnviando(true);
      setIsProcessing(true);

      const saldoRestante = selectedLote.precio - reservaVentaForm.depositoInicial;
      const valorCuota = calcularValorCuota();
      const numeroOperacion = `${Date.now().toString().slice(-6)}`;

      console.log('📋 Iniciando proceso de reserva/venta...');

      // ── 1. CONSTRUIR DATOS DEL COMPROBANTE ────────────────────────────────
      const comprobanteData: ComprobanteData = {
  tipo: reservaVentaForm.accion === 'reservado' ? 'reserva' : 'venta',  // ← aquí
  cliente: {
    nombre: reservaVentaForm.nombre.trim(),
    cedula: reservaVentaForm.cedula.trim() || undefined,
    email: reservaVentaForm.email.trim() || 'no-especificado@molino.com',
    telefono: reservaVentaForm.telefono.trim() || 'No especificado',
  },
  lote: {
    numeroLote: selectedLote.numeroLote,
    area: selectedLote.area,
    precio: selectedLote.precio,
    ubicacion: selectedLote.ubicacion || 'No especificada',
  },
        deposito: reservaVentaForm.depositoInicial,
        tipoPlanPago,
        ...(tipoPlanPago === 'automatico'
          ? {
              numeroCuotas: reservaVentaForm.numeroCuotas,
              valorCuota,
            }
          : {
              cuotasPersonalizadas,
            }),
        notasEspeciales: notasEspeciales || undefined,
        fechaOperacion: new Date().toISOString(),
        numeroOperacion,
      };

      // ── 2. GENERAR PDF ─────────────────────────────────────────────────────
      console.log('📄 Generando PDF de comprobante...');
      // YA EXISTE - así está ahora:
const comprobanteBlob = await generarComprobanteReservaVenta(comprobanteData);
const pdfBase64 = await blobToBase64(comprobanteBlob);
const nombreArchivoComprobante = generarNombreArchivo('comprobante', selectedLote.numeroLote);
      console.log('✅ PDF generado exitosamente');

      // ── 3. GUARDAR DOCUMENTO COMPRAVENTA (si se adjuntó) ───────────────────
      let nombreArchivoCompraventa = '';
      if (documentoCompraventa) {
        const archivoBase64 = await fileToBase64(documentoCompraventa);
        nombreArchivoCompraventa = `compraventa_lote_${selectedLote.numeroLote}_${Date.now().toString().slice(-6)}.${documentoCompraventa.name.split('.').pop()}`;
        console.log('✅ Documento de compraventa preparado');
      }

      // ── 4. ENVIAR POR EMAIL Y WHATSAPP ─────────────────────────────────────
      console.log('📧 Enviando comprobante...');
      const resultadosEnvio = await enviarComprobanteCompleto(
        {
          nombre: reservaVentaForm.nombre,
          email: reservaVentaForm.email,
          telefono: reservaVentaForm.telefono,
          numeroLote: selectedLote.numeroLote,
        },
        {
  tipo: reservaVentaForm.accion,
  numeroOperacion,
  deposito: reservaVentaForm.depositoInicial,
  valorLote: selectedLote.precio,
  pdfBase64,
  pdfBlob: comprobanteBlob,   // ← solo agregar esta línea
  nombreArchivo: nombreArchivoComprobante,
},
        {
          enviarEmail: !!reservaVentaForm.email,
          enviarWhatsApp: !!reservaVentaForm.telefono,
        }
      );
      console.log('📤 Resultados de envío:', resultadosEnvio);

      let mensajeExito = '✅ Operación completada exitosamente!\n\n';
      if (resultadosEnvio.email?.success) mensajeExito += '📧 Email enviado\n';
      if (resultadosEnvio.whatsapp?.success) mensajeExito += '📱 WhatsApp enviado\n';
      if (resultadosEnvio.errores.length > 0) {
        mensajeExito += '\n⚠️ Advertencias:\n';
        resultadosEnvio.errores.forEach(e => (mensajeExito += `• ${e}\n`));
      }

      // ── 5. DESCARGAR PDF LOCALMENTE ────────────────────────────────────────
      descargarPDF(comprobanteBlob, nombreArchivoComprobante);

      // ── 6. REGISTRAR CLIENTE Y LOTE ────────────────────────────────────────
      console.log('👥 Registrando cliente y lote...');
      const clienteData = {
        nombre: reservaVentaForm.nombre.trim(),
        cedula: reservaVentaForm.cedula.trim() || '',
        email: reservaVentaForm.email.trim() || '',
        telefono: reservaVentaForm.telefono.trim() || '',
        valorLote: selectedLote.precio,
        depositoInicial: reservaVentaForm.depositoInicial,
        saldoRestante,
        numeroCuotas: tipoPlanPago === 'automatico' ? reservaVentaForm.numeroCuotas : cuotasPersonalizadas.length,
        valorCuota: tipoPlanPago === 'automatico' ? valorCuota : 0,
        cuotasPersonalizadas: tipoPlanPago === 'personalizado' ? cuotasPersonalizadas : undefined,
        tipoPlanPago,
        saldoFinal: selectedLote.precio,
        formaPagoInicial: reservaVentaForm.formaPagoInicial,
        formaPagoCuotas: reservaVentaForm.formaPagoCuotas,
        notasEspeciales: notasEspeciales || '',
        documentoCompraventa: nombreArchivoCompraventa || 'Sin documento',
        estado: 'activo',
      };

      await onReservarVenderLote?.(
        selectedLote.id,
        selectedLote.numeroLote,
        clienteData,
        reservaVentaForm.depositoInicial,
        reservaVentaForm.accion
      );
      console.log('✅ Cliente y lote registrados');

      // ── LIMPIAR Y CERRAR ───────────────────────────────────────────────────
      alert(mensajeExito);
      setShowReservaVentaModal(false);
      setDocumentoCompraventa(null);
      setTipoPlanPago('automatico');
      setCuotasPersonalizadas([]);
      setNotasEspeciales('');
      setReservaVentaForm({
        accion: 'reservado',
        nombre: '',
        cedula: '',
        email: '',
        telefono: '',
        depositoInicial: 0,
        numeroCuotas: 12,
        formaPagoInicial: 'Efectivo',
        formaPagoCuotas: 'Transferencia Bancaria',
        documentoCompraventa: '',
        notasEspeciales: '',
      });
      setSelectedLote(null);
    } catch (error) {
      console.error('❌ Error en handleSaveReservaVenta:', error);
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setEnviando(false);
      setIsProcessing(false);
    }
  };

  // ============================================================
  // HANDLER: GUARDAR EDICIÓN
  // ============================================================

  const handleSaveEdit = () => {
    if (selectedLote && editFormData) {
      onEditLote?.(selectedLote.id, editFormData);
      setShowEditModal(false);
      setSelectedLote(null);
    }
  };

  // ============================================================
  // HANDLER: AGREGAR LOTE
  // ============================================================

  const handleAddLote = () => {
    if (!newLoteForm.numeroLote) {
      alert('Por favor ingrese el número de lote');
      return;
    }
    onAddLote?.({
      numeroLote: newLoteForm.numeroLote,
      estado: newLoteForm.estado,
      area: newLoteForm.area ? parseFloat(newLoteForm.area) : undefined,
      precio: newLoteForm.precio ? parseFloat(newLoteForm.precio) : undefined,
      ubicacion: newLoteForm.ubicacion,
      descripcion: newLoteForm.descripcion,
      bloqueadoPor: newLoteForm.bloqueadoPor,
    });
    setNewLoteForm({ numeroLote: '', estado: 'disponible', area: '', precio: '', ubicacion: '', descripcion: '', bloqueadoPor: '' });
    setShowAddForm(false);
  };

  // ============================================================
  // RENDER GRID
  // ============================================================

  const renderGridView = () => {
    const lotesOrdenados = [...lotesFiltrados].sort((a, b) => {
      const numA = parseInt(a.numeroLote) || 0;
      const numB = parseInt(b.numeroLote) || 0;
      return numA - numB;
    });

    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {lotesOrdenados.map((lote) => {
          const colors = LOTE_COLORS[lote.estado as keyof typeof LOTE_COLORS] || LOTE_COLORS.disponible;
          const cliente = getClienteInfo(lote.numeroLote);
          const progreso = getProgressoPago(lote.numeroLote);

          return (
            <div
              key={lote.id}
              className={`relative p-4 rounded-xl border-2 transition-all ${colors.bg} ${colors.border} ${
                selectedLote?.id === lote.id ? 'ring-2 ring-offset-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg bg-white ${colors.icon}`}>
                  {lote.estado === 'disponible' && <Home size={20} />}
                  {lote.estado === 'vendido' && <CheckCircle size={20} />}
                  {lote.estado === 'reservado' && <Clock size={20} />}
                  {lote.estado === 'bloqueado' && <Lock size={20} />}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.badge}`}>
                  {ESTADO_LABELS[lote.estado as keyof typeof ESTADO_LABELS]?.label || lote.estado}
                </span>
              </div>

              <div className="text-left">
                <h4 className={`font-bold text-lg ${colors.text} mb-1`}>Lote #{lote.numeroLote}</h4>
                {lote.area && <p className="text-xs text-slate-600 mb-1">📐 {lote.area} m²</p>}
                {lote.precio && <p className="text-sm font-semibold text-slate-700 mb-2">${lote.precio.toLocaleString()}</p>}

                {cliente && (
                  <div className="bg-white bg-opacity-60 rounded p-2 mb-2">
                    <p className="text-xs font-medium text-slate-900 truncate">{cliente.nombre}</p>
                    <div className="mt-1">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Pagos:</span>
                        <span className="font-semibold">{progreso}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${progreso}%`,
                            backgroundColor: ESTADO_LABELS[lote.estado as keyof typeof ESTADO_LABELS]?.color || '#059669',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {lote.bloqueadoPor && (
                  <p className="text-xs text-slate-600 italic mb-2">Razón: {lote.bloqueadoPor}</p>
                )}

                <div className="flex gap-1 mt-2 flex-wrap">
                  <button
                    onClick={() => handleSelectLote(lote)}
                    className="flex-1 px-2 py-1 bg-slate-500 text-white text-xs rounded hover:bg-slate-600 transition-colors"
                  >
                    <Eye size={12} className="inline mr-1" /> Ver
                  </button>
                  {editMode && lote.estado === 'disponible' && (
                    <button
                      onClick={() => handleOpenReservaVentaModal(lote)}
                      className="flex-1 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      📋 Reservar/Vender
                    </button>
                  )}
                  {editMode && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(lote)}
                        className="flex-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                      >
                        <Edit2 size={12} className="inline mr-1" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('¿Está seguro de eliminar este lote?')) {
                            onDeleteLote?.(lote.id);
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        <Trash2 size={12} className="inline mr-1" /> Borrar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {editMode && (
          <button
            onClick={() => setShowAddForm(true)}
            className="p-4 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-brand-500 hover:bg-brand-50 transition-all"
          >
            <div className="text-center">
              <Plus size={32} className="text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Agregar Lote</p>
            </div>
          </button>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER LIST
  // ============================================================

  const renderListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Lote</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Área</th>
              <th className="px-6 py-4">Precio</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lotesFiltrados.map((lote) => {
              const colors = LOTE_COLORS[lote.estado as keyof typeof LOTE_COLORS] || LOTE_COLORS.disponible;
              const cliente = getClienteInfo(lote.numeroLote);
              return (
                <tr key={lote.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4"><span className="font-bold text-slate-900">#{lote.numeroLote}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                      {lote.estado === 'disponible' && <Home size={14} />}
                      {lote.estado === 'vendido' && <CheckCircle size={14} />}
                      {lote.estado === 'reservado' && <Clock size={14} />}
                      {lote.estado === 'bloqueado' && <Lock size={14} />}
                      {ESTADO_LABELS[lote.estado as keyof typeof ESTADO_LABELS]?.label || lote.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">{lote.area ? `${lote.area} m²` : '-'}</td>
                  <td className="px-6 py-4">{lote.precio ? `$${lote.precio.toLocaleString()}` : '-'}</td>
                  <td className="px-6 py-4"><p className="font-medium text-slate-900">{cliente?.nombre || '-'}</p></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleSelectLote(lote)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Ver detalles">
                        <Eye size={16} />
                      </button>
                      {editMode && lote.estado === 'disponible' && (
                        <button onClick={() => handleOpenReservaVentaModal(lote)} className="text-green-600 hover:text-green-800 transition-colors" title="Reservar/Vender">
                          📋
                        </button>
                      )}
                      {editMode && (
                        <>
                          <button onClick={() => handleOpenEditModal(lote)} className="text-slate-600 hover:text-slate-800 transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('¿Está seguro de eliminar este lote?')) onDeleteLote?.(lote.id); }}
                            className="text-red-600 hover:text-red-800 transition-colors" title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin size={28} className="text-brand-600" />
            Mapa de Lotes
          </h2>
          <p className="text-slate-500 text-sm mt-1">Visualiza el estado de todos los lotes del proyecto</p>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-100 text-slate-700 rounded-lg p-4 text-center">
          <p className="text-sm font-medium opacity-75">Total</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 rounded-lg p-4 text-center">
          <p className="text-sm font-medium opacity-75">🟢 Disponibles</p>
          <p className="text-3xl font-bold mt-1">{stats.disponibles}</p>
        </div>
        <div className="bg-blue-100 text-blue-700 rounded-lg p-4 text-center">
          <p className="text-sm font-medium opacity-75">🔵 Vendidos</p>
          <p className="text-3xl font-bold mt-1">{stats.vendidos}</p>
        </div>
        <div className="bg-amber-100 text-amber-700 rounded-lg p-4 text-center">
          <p className="text-sm font-medium opacity-75">🟡 Reservados</p>
          <p className="text-3xl font-bold mt-1">{stats.reservados}</p>
        </div>
        <div className="bg-slate-200 text-slate-700 rounded-lg p-4 text-center">
          <p className="text-sm font-medium opacity-75">⚫ Bloqueados</p>
          <p className="text-3xl font-bold mt-1">{stats.bloqueados}</p>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'grid' ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            🔲 Mapa
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'list' ? 'bg-brand-600 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            📋 Lista
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['todos', 'disponible', 'vendido', 'reservado', 'bloqueado'] as const).map((estado) => (
            <button
              key={estado}
              onClick={() => setFilterEstado(estado)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filterEstado === estado
                  ? `${LOTE_COLORS[estado === 'todos' ? 'disponible' : estado].badge} ring-2 ring-offset-1 ring-brand-500`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {estado === 'todos' ? 'Todos' : ESTADO_LABELS[estado]?.label || estado}
            </button>
          ))}
        </div>
      </div>

      {/* VISTA */}
      {viewMode === 'grid' ? renderGridView() : renderListView()}

      {/* ================================================================
          MODAL: AGREGAR LOTE
      ================================================================ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Agregar Nuevo Lote</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Número de lote" value={newLoteForm.numeroLote}
                onChange={(e) => setNewLoteForm({ ...newLoteForm, numeroLote: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              <select value={newLoteForm.estado} onChange={(e) => setNewLoteForm({ ...newLoteForm, estado: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                <option value="disponible">Disponible</option>
                <option value="vendido">Vendido</option>
                <option value="reservado">Reservado</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
              <input type="number" placeholder="Área (m²)" value={newLoteForm.area}
                onChange={(e) => setNewLoteForm({ ...newLoteForm, area: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              <input type="number" placeholder="Precio ($)" value={newLoteForm.precio}
                onChange={(e) => setNewLoteForm({ ...newLoteForm, precio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              <input type="text" placeholder="Ubicación" value={newLoteForm.ubicacion}
                onChange={(e) => setNewLoteForm({ ...newLoteForm, ubicacion: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              <textarea placeholder="Descripción" value={newLoteForm.descripcion}
                onChange={(e) => setNewLoteForm({ ...newLoteForm, descripcion: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              {newLoteForm.estado === 'bloqueado' && (
                <input type="text" placeholder="Razón del bloqueo" value={newLoteForm.bloqueadoPor}
                  onChange={(e) => setNewLoteForm({ ...newLoteForm, bloqueadoPor: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              )}
              <div className="flex gap-2 pt-4 border-t">
                <button onClick={() => setShowAddForm(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button onClick={handleAddLote} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Crear Lote</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: RESERVAR / VENDER (COMPLETO CON PLAN DE PAGO)
      ================================================================ */}
      {showReservaVentaModal && selectedLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

            {/* ENCABEZADO */}
            <div className="sticky top-0 bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 rounded-t-2xl flex justify-between items-start z-10">
              <div>
                <h3 className="text-2xl font-bold">📋 Reservar o Vender Lote</h3>
                <p className="text-brand-100 mt-1">Lote #{selectedLote.numeroLote}</p>
              </div>
              <button onClick={() => setShowReservaVentaModal(false)} className="text-white hover:text-brand-100" disabled={isProcessing}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* RESUMEN DEL LOTE */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-semibold">Valor del Lote</p>
                    <p className="text-2xl font-bold text-slate-900">${selectedLote.precio?.toLocaleString() || 0}</p>
                  </div>
                  {selectedLote.area && (
                    <div>
                      <p className="text-xs text-slate-600 uppercase font-semibold">Área</p>
                      <p className="text-xl font-semibold text-slate-700">{selectedLote.area} m²</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TIPO DE OPERACIÓN */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">¿Qué operación deseas realizar? *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReservaVentaForm({ ...reservaVentaForm, accion: 'reservado' })}
                    className={`p-4 rounded-xl border-2 transition-all ${reservaVentaForm.accion === 'reservado' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'}`}
                    disabled={isProcessing}
                  >
                    <Clock className="mx-auto mb-2" size={24} />
                    <p className="font-semibold">Reservar Lote</p>
                  </button>
                  <button
                    onClick={() => setReservaVentaForm({ ...reservaVentaForm, accion: 'vendido' })}
                    className={`p-4 rounded-xl border-2 transition-all ${reservaVentaForm.accion === 'vendido' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                    disabled={isProcessing}
                  >
                    <CheckCircle className="mx-auto mb-2" size={24} />
                    <p className="font-semibold">Vender Lote</p>
                  </button>
                </div>
              </div>

              {/* DATOS DEL CLIENTE */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <User size={20} className="text-brand-600" />
                  Datos del Cliente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre Completo *</label>
                    <input type="text" placeholder="Ej: LUDY JASMIN HERNANDEZ MONCADA" value={reservaVentaForm.nombre}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      disabled={isProcessing} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Cédula de Ciudadanía</label>
                    <input type="text" placeholder="Ej: 60.392.103" value={reservaVentaForm.cedula}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, cedula: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing} />
                    <p className="text-xs text-slate-400 mt-0.5">Aparecerá en el comprobante junto al nombre</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Teléfono *</label>
                    <input type="tel" placeholder="3001234567" value={reservaVentaForm.telefono}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Email *</label>
                    <input type="email" placeholder="cliente@email.com" value={reservaVentaForm.email}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing} />
                  </div>
                </div>
              </div>

              {/* DATOS FINANCIEROS */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-slate-900 mb-4">💰 Datos Financieros</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 mb-1 block">
                      {reservaVentaForm.accion === 'reservado' ? '💵 Depósito de Reserva *' : '💵 Cuota Inicial *'}
                    </label>
                    <input type="number" min="0" max={selectedLote.precio} step="1000"
                      value={reservaVentaForm.depositoInicial}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, depositoInicial: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-lg font-semibold"
                      placeholder="0" disabled={isProcessing} />
                    <p className="text-xs text-slate-500 mt-1">Máximo: ${selectedLote.precio?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">💳 Forma de Pago Inicial</label>
                    <select value={reservaVentaForm.formaPagoInicial}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, formaPagoInicial: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">💳 Forma de Pago Cuotas</label>
                    <select value={reservaVentaForm.formaPagoCuotas}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, formaPagoCuotas: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing}>
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Débito Automático">Débito Automático</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PLAN DE PAGO */}
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-slate-900 mb-3">📅 Plan de Pago</h4>

                {/* Selector tipo de plan */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setTipoPlanPago('automatico')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${tipoPlanPago === 'automatico' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}`}
                    disabled={isProcessing}
                  >
                    <p className={`font-semibold text-sm ${tipoPlanPago === 'automatico' ? 'text-brand-800' : 'text-slate-700'}`}>
                      Cuotas iguales
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Divide el saldo en N cuotas del mismo valor</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoPlanPago('personalizado')}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${tipoPlanPago === 'personalizado' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'}`}
                    disabled={isProcessing}
                  >
                    <p className={`font-semibold text-sm ${tipoPlanPago === 'personalizado' ? 'text-purple-800' : 'text-slate-700'}`}>
                      Cuotas personalizadas
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Define monto, fecha y condición por cuota</p>
                  </button>
                </div>

                {/* MODO AUTOMÁTICO */}
                {tipoPlanPago === 'automatico' && (
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">📅 Número de Cuotas *</label>
                    <input type="number" min="1" max="360"
                      value={reservaVentaForm.numeroCuotas}
                      onChange={(e) => setReservaVentaForm({ ...reservaVentaForm, numeroCuotas: parseInt(e.target.value) || 12 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                      disabled={isProcessing} />
                    {calcularValorCuota() > 0 && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800 font-medium">
                          Valor de cada cuota:{' '}
                          <span className="text-lg font-bold">
                            ${calcularValorCuota().toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">{reservaVentaForm.numeroCuotas} cuotas mensuales</p>
                      </div>
                    )}
                  </div>
                )}

                {/* MODO PERSONALIZADO */}
                {tipoPlanPago === 'personalizado' && (
                  <div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-purple-800 font-medium">
                        Define cada cuota según las condiciones de la Promesa de Compraventa.
                        Puedes indicar montos diferentes, fechas exactas o condiciones especiales por cuota.
                      </p>
                    </div>
                    <EditorCuotasPersonalizadas
                      cuotas={cuotasPersonalizadas}
                      onChange={setCuotasPersonalizadas}
                      valorTotal={selectedLote.precio || 0}
                      depositoInicial={reservaVentaForm.depositoInicial}
                    />
                  </div>
                )}
              </div>

              {/* NOTAS ESPECIALES */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  📝 Notas especiales / Observaciones (opcional)
                </label>
                <textarea
                  value={notasEspeciales}
                  onChange={(e) => setNotasEspeciales(e.target.value)}
                  rows={3}
                  placeholder="Ej: Sujeto a resolución de desenglobe del predio. Entrega física al 80% del valor cancelado..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 resize-none text-sm"
                  disabled={isProcessing}
                />
              </div>

              {/* DOCUMENTO COMPRAVENTA */}
              <div className="border-t pt-4">
                <h4 className="text-lg font-bold text-slate-900 mb-3">📄 Documentos</h4>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    Documento de Compraventa (Opcional)
                  </label>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleDocumentoChange}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg cursor-pointer"
                    disabled={isProcessing} />
                  {documentoCompraventa && (
                    <div className="mt-2 p-2 bg-white border border-green-200 rounded flex items-center justify-between">
                      <p className="text-sm text-green-700">✅ {documentoCompraventa.name}</p>
                      <button onClick={() => setDocumentoCompraventa(null)} className="text-red-500 hover:text-red-700" disabled={isProcessing}>✕</button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">Máx. 5MB. Formatos: PDF, DOC, DOCX, JPG, PNG</p>
                </div>
              </div>

              {/* RESUMEN FINANCIERO */}
              {reservaVentaForm.depositoInicial > 0 && selectedLote.precio && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 p-5 rounded-xl">
                  <h4 className="text-sm font-bold text-green-900 mb-3 uppercase">📊 Resumen Financiero</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-green-200">
                      <span className="text-sm text-slate-700">Valor Total del Lote:</span>
                      <span className="text-lg font-bold text-slate-900">${selectedLote.precio.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-green-200">
                      <span className="text-sm text-green-800">
                        {reservaVentaForm.accion === 'reservado' ? 'Depósito de Reserva:' : 'Cuota Inicial:'}
                      </span>
                      <span className="text-lg font-bold text-green-700">${reservaVentaForm.depositoInicial.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b-2 border-green-300">
                      <span className="text-sm font-semibold text-blue-800">Saldo Restante:</span>
                      <span className="text-2xl font-bold text-blue-700">
                        ${(selectedLote.precio - reservaVentaForm.depositoInicial).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">Porcentaje Pagado:</span>
                        <span className="text-sm font-bold text-brand-600">
                          {((reservaVentaForm.depositoInicial / selectedLote.precio) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-gradient-to-r from-brand-500 to-brand-600 h-2 rounded-full transition-all"
                          style={{ width: `${(reservaVentaForm.depositoInicial / selectedLote.precio) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Detalle cuotas personalizadas en resumen */}
                    {tipoPlanPago === 'personalizado' && cuotasPersonalizadas.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-slate-600">Cuotas configuradas:</p>
                        {cuotasPersonalizadas.map((c) => (
                          <div key={c.numero} className="flex justify-between text-xs bg-white rounded p-2">
                            <span className="text-slate-600">{c.descripcion || `Cuota ${c.numero}`}</span>
                            <span className="font-bold text-slate-800">${c.monto.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BOTONES */}
              <div className="flex gap-3 pt-6 border-t sticky bottom-0 bg-white pb-2">
                <button
                  onClick={() => setShowReservaVentaModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold transition-all"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveReservaVenta}
                  disabled={
                    isProcessing ||
                    !reservaVentaForm.nombre ||
                    reservaVentaForm.depositoInicial <= 0 ||
                    !reservaVentaForm.email ||
                    !reservaVentaForm.telefono ||
                    (tipoPlanPago === 'personalizado' && cuotasPersonalizadas.length === 0)
                  }
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl hover:from-brand-700 hover:to-brand-800 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    `✅ Confirmar ${reservaVentaForm.accion === 'reservado' ? 'Reserva' : 'Venta'}`
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                * Campos requeridos. Verifica toda la información antes de confirmar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: EDITAR LOTE
      ================================================================ */}
      {showEditModal && selectedLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900 mb-4">✏️ Editar Lote #{selectedLote.numeroLote}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Número de Lote</label>
                <input type="text" value={editFormData.numeroLote || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, numeroLote: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Estado</label>
                <select value={editFormData.estado || 'disponible'}
                  onChange={(e) => setEditFormData({ ...editFormData, estado: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="disponible">Disponible</option>
                  <option value="vendido">Vendido</option>
                  <option value="reservado">Reservado</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Área (m²)</label>
                <input type="number" step="0.01" min="0" value={editFormData.area !== undefined ? editFormData.area : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ejemplo: 500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Precio ($)</label>
                <input type="number" step="0.01" min="0" value={editFormData.precio !== undefined ? editFormData.precio : ''}
                  onChange={(e) => setEditFormData({ ...editFormData, precio: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Ejemplo: 50000" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Ubicación</label>
                <input type="text" value={editFormData.ubicacion || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, ubicacion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Descripción</label>
                <textarea value={editFormData.descripcion || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              {editFormData.estado === 'bloqueado' && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Razón del Bloqueo</label>
                  <input type="text" value={editFormData.bloqueadoPor || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, bloqueadoPor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL: DETALLES DEL LOTE
      ================================================================ */}
      {showModal && selectedLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div
              className="p-6 text-white"
              style={{ backgroundColor: ESTADO_LABELS[selectedLote.estado as keyof typeof ESTADO_LABELS]?.color || '#059669' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-bold">Lote #{selectedLote.numeroLote}</h3>
                  <p className="mt-2">{ESTADO_LABELS[selectedLote.estado as keyof typeof ESTADO_LABELS]?.label || selectedLote.estado}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-white hover:text-opacity-80">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {selectedLote.area && (
                <div>
                  <label className="text-sm font-medium text-slate-600">📐 Área</label>
                  <p className="text-slate-900 font-semibold mt-1">{selectedLote.area} m²</p>
                </div>
              )}
              {selectedLote.precio && (
                <div>
                  <label className="text-sm font-medium text-slate-600">💰 Precio</label>
                  <p className="text-slate-900 font-semibold mt-1">${selectedLote.precio.toLocaleString()}</p>
                </div>
              )}
              {selectedLote.ubicacion && (
                <div>
                  <label className="text-sm font-medium text-slate-600">📍 Ubicación</label>
                  <p className="text-slate-900 font-semibold mt-1">{selectedLote.ubicacion}</p>
                </div>
              )}
              {selectedLote.descripcion && (
                <div>
                  <label className="text-sm font-medium text-slate-600">📝 Descripción</label>
                  <p className="text-slate-900 font-semibold mt-1">{selectedLote.descripcion}</p>
                </div>
              )}
              <div className="flex gap-2 mt-6 pt-4 border-t">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapaLotes;
