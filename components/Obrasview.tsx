import React, { useState, useMemo } from 'react';
import {
  Obra,
  EtapaObra,
  Hito,
  FotoAvance,
  GastoObra,
  ETAPAS_OBRA
} from './obras-types';
import { User } from '../types';
import {
  Plus,
  Calendar,
  DollarSign,
  Camera,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Eye,
  Edit2,
  Trash2,
  X,
  Upload,
  Download,
  Share2,
  Filter,
  Search,
  BarChart3,
  FileText,
  Image as ImageIcon,
  MapPin,
  AlertCircle
} from 'lucide-react';

interface ObrasViewProps {
  obras: Obra[];
  onAddObra: (obra: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateObra: (id: string, updates: Partial<Obra>) => void;
  onDeleteObra: (id: string) => void;
  currentUser: User;
}

export const ObrasView: React.FC<ObrasViewProps> = ({
  obras,
  onAddObra,
  onUpdateObra,
  onDeleteObra,
  currentUser
}) => {
  // Estados
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showModalNuevaObra, setShowModalNuevaObra] = useState(false);
  const [showModalDetalles, setShowModalDetalles] = useState(false);
  const [vistaActual, setVistaActual] = useState<
    'lista' | 'timeline' | 'fotos' | 'presupuesto' | 'hitos'
  >('lista');
  const [filtros, setFiltros] = useState({
    estado: 'todas' as 'todas' | 'activa' | 'pausada' | 'completada',
    busqueda: ''
  });

  // Form nueva obra
  const [formNuevaObra, setFormNuevaObra] = useState({
    nombre: '',
    descripcion: '',
    etapaActual: 'planificacion' as EtapaObra,
    presupuesto: 0,
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaEstimadaFin: '',
    ubicacion: '',
    responsable: currentUser.name,
    prioridad: 'media' as 'baja' | 'media' | 'alta',
    visibleParaClientes: false
  });

  // Form nuevo hito
  const [showModalHito, setShowModalHito] = useState(false);
  const [formHito, setFormHito] = useState({
    nombre: '',
    descripcion: '',
    fechaEstimada: new Date().toISOString().split('T')[0],
    responsable: currentUser.name
  });

  // Form nuevo gasto
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [formGasto, setFormGasto] = useState({
    concepto: '',
    categoria: 'materiales' as GastoObra['categoria'],
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    notas: ''
  });

  // Upload de fotos
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ==================== ESTADÍSTICAS ====================
  const estadisticas = useMemo(() => {
    return {
      total: obras.length,
      activas: obras.filter((o) => o.estado === 'activa').length,
      completadas: obras.filter((o) => o.estado === 'completada').length,
      pausadas: obras.filter((o) => o.estado === 'pausada').length,
      presupuestoTotal: obras.reduce((sum, o) => sum + o.presupuesto, 0),
      gastadoTotal: obras.reduce((sum, o) => sum + o.gastado, 0),
      progresoPromedio:
        obras.length > 0
          ? Math.round(
              obras.reduce((sum, o) => sum + o.progreso, 0) / obras.length
            )
          : 0
    };
  }, [obras]);

  // ==================== FILTRADO ====================
  const obrasFiltradas = useMemo(() => {
    return obras.filter((obra) => {
      const cumpleEstado =
        filtros.estado === 'todas' || obra.estado === filtros.estado;
      const cumpleBusqueda =
        obra.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        obra.descripcion?.toLowerCase().includes(filtros.busqueda.toLowerCase());

      return cumpleEstado && cumpleBusqueda;
    });
  }, [obras, filtros]);

  // ==================== HANDLERS ====================

  const handleCrearObra = () => {
    if (!formNuevaObra.nombre || formNuevaObra.presupuesto <= 0) {
      alert('Nombre y presupuesto son obligatorios');
      return;
    }

    const nuevaObra: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formNuevaObra,
      progreso: 0,
      gastado: 0,
      hitos: [],
      fotos: [],
      gastos: [],
      estado: 'activa',
      createdBy: currentUser.id
    };

    onAddObra(nuevaObra);
    setShowModalNuevaObra(false);
    resetFormNuevaObra();
  };

  const resetFormNuevaObra = () => {
    setFormNuevaObra({
      nombre: '',
      descripcion: '',
      etapaActual: 'planificacion',
      presupuesto: 0,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaEstimadaFin: '',
      ubicacion: '',
      responsable: currentUser.name,
      prioridad: 'media',
      visibleParaClientes: false
    });
  };

  const handleAgregarHito = () => {
    if (!selectedObra || !formHito.nombre) return;

    const nuevoHito: Hito = {
      id: crypto.randomUUID(),
      ...formHito,
      progreso: 0,
      completado: false,
      createdAt: new Date().toISOString()
    };

    const hitosActualizados = [...selectedObra.hitos, nuevoHito];
    onUpdateObra(selectedObra.id, { hitos: hitosActualizados });
    setSelectedObra({ ...selectedObra, hitos: hitosActualizados });
    setShowModalHito(false);
    setFormHito({
      nombre: '',
      descripcion: '',
      fechaEstimada: new Date().toISOString().split('T')[0],
      responsable: currentUser.name
    });
  };

  const handleToggleHito = (hitoId: string) => {
    if (!selectedObra) return;

    const hitosActualizados = selectedObra.hitos.map((h) =>
      h.id === hitoId
        ? {
            ...h,
            completado: !h.completado,
            progreso: !h.completado ? 100 : h.progreso,
            fechaCompletado: !h.completado
              ? new Date().toISOString()
              : undefined
          }
        : h
    );

    onUpdateObra(selectedObra.id, { hitos: hitosActualizados });
    setSelectedObra({ ...selectedObra, hitos: hitosActualizados });
  };

  const handleAgregarGasto = () => {
    if (!selectedObra || !formGasto.concepto || formGasto.monto <= 0) return;

    const nuevoGasto: GastoObra = {
      id: crypto.randomUUID(),
      obraId: selectedObra.id,
      ...formGasto,
      aprobadoPor: currentUser.name,
      createdAt: new Date().toISOString()
    };

    const gastosActualizados = [...selectedObra.gastos, nuevoGasto];
    const gastadoTotal = gastosActualizados.reduce((sum, g) => sum + g.monto, 0);

    onUpdateObra(selectedObra.id, {
      gastos: gastosActualizados,
      gastado: gastadoTotal
    });

    setSelectedObra({
      ...selectedObra,
      gastos: gastosActualizados,
      gastado: gastadoTotal
    });

    setShowModalGasto(false);
    setFormGasto({
      concepto: '',
      categoria: 'materiales',
      monto: 0,
      fecha: new Date().toISOString().split('T')[0],
      proveedor: '',
      notas: ''
    });
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObra || !e.target.files?.[0]) return;

    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Imagen muy grande (máx 5MB)');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;

        const nuevaFoto: FotoAvance = {
          id: crypto.randomUUID(),
          url: base64,
          descripcion: `Avance de ${ETAPAS_OBRA[selectedObra.etapaActual].label}`,
          etapa: selectedObra.etapaActual,
          fecha: new Date().toISOString(),
          uploadedBy: currentUser.name,
          createdAt: new Date().toISOString()
        };

        const fotosActualizadas = [...selectedObra.fotos, nuevaFoto];
        onUpdateObra(selectedObra.id, { fotos: fotosActualizadas });
        setSelectedObra({ ...selectedObra, fotos: fotosActualizadas });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error subiendo foto:', error);
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCambiarEtapa = (nuevaEtapa: EtapaObra) => {
    if (!selectedObra) return;

    const etapas = Object.keys(ETAPAS_OBRA) as EtapaObra[];
    const indiceNuevo = etapas.indexOf(nuevaEtapa);
    const progresoAutomatico = Math.round(
      (indiceNuevo / (etapas.length - 1)) * 100
    );

    onUpdateObra(selectedObra.id, {
      etapaActual: nuevaEtapa,
      progreso: progresoAutomatico
    });

    setSelectedObra({
      ...selectedObra,
      etapaActual: nuevaEtapa,
      progreso: progresoAutomatico
    });
  };

  const handleCompartirConClientes = () => {
    if (!selectedObra) return;

    if (window.confirm('¿Compartir avances de esta obra con los clientes?')) {
      onUpdateObra(selectedObra.id, { visibleParaClientes: true });
      alert('✅ Obra compartida con clientes');
    }
  };

  // ==================== RENDERIZADO ====================

  const renderCardObra = (obra: Obra) => {
    const etapa = ETAPAS_OBRA[obra.etapaActual];
    const porcentajeGastado =
      obra.presupuesto > 0 ? (obra.gastado / obra.presupuesto) * 100 : 0;
    const hitosCompletados = obra.hitos.filter((h) => h.completado).length;
    const alertaPresupuesto = porcentajeGastado > 90;

    return (
      <div
        key={obra.id}
        className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 transition-all p-6 cursor-pointer group"
        onClick={() => {
          setSelectedObra(obra);
          setShowModalDetalles(true);
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{etapa.icono}</span>
              <div>
                <h3 className="font-bold text-lg text-slate-900">{obra.nombre}</h3>
                <p className="text-sm text-slate-600">{etapa.label}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                obra.estado === 'activa'
                  ? 'bg-green-100 text-green-800'
                  : obra.estado === 'pausada'
                  ? 'bg-yellow-100 text-yellow-800'
                  : obra.estado === 'completada'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {obra.estado.toUpperCase()}
            </span>

            {obra.visibleParaClientes && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded flex items-center gap-1">
                <Users size={12} />
                Visible para clientes
              </span>
            )}
          </div>
        </div>

        {/* Descripción */}
        {obra.descripcion && (
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
            {obra.descripcion}
          </p>
        )}

        {/* Progreso */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progreso general</span>
            <span className="font-bold" style={{ color: etapa.color }}>
              {obra.progreso}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${obra.progreso}%`,
                backgroundColor: etapa.color
              }}
            />
          </div>
        </div>

        {/* Presupuesto */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Presupuesto</span>
            <span
              className={`font-bold ${
                alertaPresupuesto ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {porcentajeGastado.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                alertaPresupuesto
                  ? 'bg-red-500'
                  : porcentajeGastado > 75
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Gastado: ${obra.gastado.toLocaleString()}</span>
            <span>Total: ${obra.presupuesto.toLocaleString()}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{obra.fotos.length}</p>
            <p className="text-xs text-slate-500">Fotos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {hitosCompletados}/{obra.hitos.length}
            </p>
            <p className="text-xs text-slate-500">Hitos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{obra.gastos.length}</p>
            <p className="text-xs text-slate-500">Gastos</p>
          </div>
        </div>

        {/* Alertas */}
        {alertaPresupuesto && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="text-red-600" size={16} />
            <span className="text-xs text-red-800 font-medium">
              ⚠️ Presupuesto excedido
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderVistaTimeline = () => {
    if (!selectedObra) return null;

    const etapas = Object.entries(ETAPAS_OBRA) as [EtapaObra, typeof ETAPAS_OBRA[EtapaObra]][];
    const indiceActual = etapas.findIndex(([key]) => key === selectedObra.etapaActual);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">🗓️ Timeline de Construcción</h3>
          <span className="text-sm text-slate-600">
            Etapa {indiceActual + 1} de {etapas.length}
          </span>
        </div>

        {etapas.map(([key, etapa], index) => {
          const esActual = key === selectedObra.etapaActual;
          const esCompletada = index < indiceActual;
          const esPendiente = index > indiceActual;

          return (
            <div
              key={key}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                esActual
                  ? 'border-blue-500 bg-blue-50'
                  : esCompletada
                  ? 'border-green-300 bg-green-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icono */}
                <div
                  className={`p-3 rounded-full text-2xl ${
                    esActual
                      ? 'bg-blue-500'
                      : esCompletada
                      ? 'bg-green-500'
                      : 'bg-slate-300'
                  }`}
                >
                  {esCompletada ? '✅' : esActual ? '🔄' : etapa.icono}
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-slate-900">{etapa.label}</h4>
                    {esActual && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-bold">
                        ACTUAL
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{etapa.descripcion}</p>
                </div>

                {/* Acción */}
                {!esCompletada && selectedObra.estado === 'activa' && (
                  <button
                    onClick={() => handleCambiarEtapa(key)}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Mover aquí
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderVistaFotos = () => {
    if (!selectedObra) return null;

    // Agrupar fotos por etapa
    const fotosPorEtapa = selectedObra.fotos.reduce((acc, foto) => {
      if (!acc[foto.etapa]) acc[foto.etapa] = [];
      acc[foto.etapa].push(foto);
      return acc;
    }, {} as Record<EtapaObra, FotoAvance[]>);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">📸 Fotos de Avances</h3>
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
            <Upload size={18} />
            Subir Foto
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadFoto}
              className="hidden"
            />
          </label>
        </div>

        {selectedObra.fotos.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <ImageIcon size={64} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">No hay fotos de avance</p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
              <Camera size={20} />
              Subir Primera Foto
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadFoto}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(fotosPorEtapa).map(([etapa, fotos]) => (
              <div key={etapa}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{ETAPAS_OBRA[etapa as EtapaObra].icono}</span>
                  <h4 className="font-bold text-slate-900">
                    {ETAPAS_OBRA[etapa as EtapaObra].label}
                  </h4>
                  <span className="text-sm text-slate-500">({fotos.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="group relative">
                      <img
                        src={foto.url}
                        alt={foto.descripcion}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all rounded-lg flex items-end p-4">
                        <div className="transform translate-y-full group-hover:translate-y-0 transition-transform w-full">
                          <p className="text-white text-sm font-medium mb-2">
                            {foto.descripcion}
                          </p>
                          <div className="flex items-center justify-between text-xs text-white">
                            <span>{new Date(foto.fecha).toLocaleDateString('es-CO')}</span>
                            <span>{foto.uploadedBy}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVistaPresupuesto = () => {
    if (!selectedObra) return null;

    const porcentajeGastado =
      selectedObra.presupuesto > 0
        ? (selectedObra.gastado / selectedObra.presupuesto) * 100
        : 0;
    const disponible = selectedObra.presupuesto - selectedObra.gastado;

    // Gastos por categoría
    const gastosPorCategoria = selectedObra.gastos.reduce((acc, gasto) => {
      acc[gasto.categoria] = (acc[gasto.categoria] || 0) + gasto.monto;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">💰 Control de Presupuesto</h3>
          <button
            onClick={() => setShowModalGasto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus size={18} />
            Registrar Gasto
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-600 mb-2">Presupuesto Total</p>
            <p className="text-3xl font-bold text-blue-900">
              ${selectedObra.presupuesto.toLocaleString()}
            </p>
          </div>

          <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
            <p className="text-sm text-orange-600 mb-2">Gastado</p>
            <p className="text-3xl font-bold text-orange-900">
              ${selectedObra.gastado.toLocaleString()}
            </p>
            <p className="text-sm text-orange-600 mt-1">{porcentajeGastado.toFixed(1)}%</p>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-200">
            <p className="text-sm text-green-600 mb-2">Disponible</p>
            <p className="text-3xl font-bold text-green-900">
              ${disponible.toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1">
              {(100 - porcentajeGastado).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Ejecución presupuestal</span>
            <span
              className={`font-bold ${
                porcentajeGastado > 90
                  ? 'text-red-600'
                  : porcentajeGastado > 75
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}
            >
              {porcentajeGastado.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                porcentajeGastado > 90
                  ? 'bg-red-500'
                  : porcentajeGastado > 75
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
            />
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-900 mb-4">📊 Gastos por Categoría</h4>
          <div className="space-y-3">
            {Object.entries(gastosPorCategoria).map(([categoria, monto]) => {
              const porcentaje =
                selectedObra.presupuesto > 0
                  ? (monto / selectedObra.presupuesto) * 100
                  : 0;
              return (
                <div key={categoria}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 capitalize">
                      {categoria.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-slate-900">
                      ${monto.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla de gastos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedObra.gastos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                selectedObra.gastos.map((gasto) => (
                  <tr key={gasto.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {new Date(gasto.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3 font-medium">{gasto.concepto}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {gasto.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">
                      ${gasto.monto.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVistaHitos = () => {
    if (!selectedObra) return null;

    const hitosCompletados = selectedObra.hitos.filter((h) => h.completado).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">🎯 Hitos del Proyecto</h3>
            <p className="text-sm text-slate-600">
              {hitosCompletados} completados de {selectedObra.hitos.length}
            </p>
          </div>
          <button
            onClick={() => setShowModalHito(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus size={18} />
            Nuevo Hito
          </button>
        </div>

        {selectedObra.hitos.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
            <CheckCircle size={64} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">No hay hitos registrados</p>
            <button
              onClick={() => setShowModalHito(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Crear Primer Hito
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedObra.hitos.map((hito) => (
              <div
                key={hito.id}
                className={`p-4 rounded-xl border-2 ${
                  hito.completado
                    ? 'border-green-300 bg-green-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleHito(hito.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      hito.completado
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 hover:border-green-500'
                    }`}
                  >
                    {hito.completado && <CheckCircle size={20} className="text-white" />}
                  </button>

                  <div className="flex-1">
                    <h4
                      className={`font-bold mb-1 ${
                        hito.completado
                          ? 'text-green-900 line-through'
                          : 'text-slate-900'
                      }`}
                    >
                      {hito.nombre}
                    </h4>
                    <p className="text-sm text-slate-600 mb-2">{hito.descripcion}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Estimado: {new Date(hito.fechaEstimada).toLocaleDateString('es-CO')}
                      </span>
                      {hito.fechaCompletado && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={12} />
                          Completado:{' '}
                          {new Date(hito.fechaCompletado).toLocaleDateString('es-CO')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDER PRINCIPAL ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🏗️ Gestión de Obras</h2>
          <p className="text-slate-600 text-sm mt-1">
            Control de proyectos de construcción y avances
          </p>
        </div>
        <button
          onClick={() => setShowModalNuevaObra(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
        >
          <Plus size={20} />
          Nueva Obra
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="text-blue-600" size={24} />
            <span className="text-xs text-blue-600 font-bold">TOTAL</span>
          </div>
          <p className="text-4xl font-bold text-blue-900">{estadisticas.total}</p>
          <p className="text-sm text-blue-600 mt-1">Obras registradas</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="text-green-600" size={24} />
            <span className="text-xs text-green-600 font-bold">ACTIVAS</span>
          </div>
          <p className="text-4xl font-bold text-green-900">{estadisticas.activas}</p>
          <p className="text-sm text-green-600 mt-1">En construcción</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="text-purple-600" size={24} />
            <span className="text-xs text-purple-600 font-bold">COMPLETADAS</span>
          </div>
          <p className="text-4xl font-bold text-purple-900">{estadisticas.completadas}</p>
          <p className="text-sm text-purple-600 mt-1">Finalizadas</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-orange-600" size={24} />
            <span className="text-xs text-orange-600 font-bold">PRESUPUESTO</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            ${(estadisticas.presupuestoTotal / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-orange-600 mt-1">
            Gastado: ${(estadisticas.gastadoTotal / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar obras..."
            value={filtros.busqueda}
            onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value as any })}
          className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todas">Todas</option>
          <option value="activa">Activas</option>
          <option value="pausada">Pausadas</option>
          <option value="completada">Completadas</option>
        </select>
      </div>

      {/* Lista de obras */}
      {obrasFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {filtros.busqueda || filtros.estado !== 'todas'
              ? 'No se encontraron obras'
              : 'No hay obras registradas'}
          </h3>
          <p className="text-slate-600 mb-6">
            {filtros.busqueda || filtros.estado !== 'todas'
              ? 'Intenta ajustar los filtros'
              : 'Comienza creando tu primera obra'}
          </p>
          {!filtros.busqueda && filtros.estado === 'todas' && (
            <button
              onClick={() => setShowModalNuevaObra(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
            >
              Crear Primera Obra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obrasFiltradas.map((obra) => renderCardObra(obra))}
        </div>
      )}

      {/* MODAL: Nueva Obra */}
      {showModalNuevaObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-bold text-slate-900">🏗️ Nueva Obra</h3>
              <button
                onClick={() => setShowModalNuevaObra(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formNuevaObra.nombre}
                  onChange={(e) =>
                    setFormNuevaObra({ ...formNuevaObra, nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Urbanización Molino Fase 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formNuevaObra.descripcion}
                  onChange={(e) =>
                    setFormNuevaObra({ ...formNuevaObra, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Describe el proyecto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Etapa Inicial *
                  </label>
                  <select
                    value={formNuevaObra.etapaActual}
                    onChange={(e) =>
                      setFormNuevaObra({
                        ...formNuevaObra,
                        etapaActual: e.target.value as EtapaObra
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(ETAPAS_OBRA).map(([key, etapa]) => (
                      <option key={key} value={key}>
                        {etapa.icono} {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Presupuesto ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formNuevaObra.presupuesto}
                    onChange={(e) =>
                      setFormNuevaObra({
                        ...formNuevaObra,
                        presupuesto: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    value={formNuevaObra.fechaInicio}
                    onChange={(e) =>
                      setFormNuevaObra({ ...formNuevaObra, fechaInicio: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha Estimada Fin
                  </label>
                  <input
                    type="date"
                    value={formNuevaObra.fechaEstimadaFin}
                    onChange={(e) =>
                      setFormNuevaObra({
                        ...formNuevaObra,
                        fechaEstimadaFin: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formNuevaObra.responsable}
                    onChange={(e) =>
                      setFormNuevaObra({ ...formNuevaObra, responsable: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formNuevaObra.ubicacion}
                    onChange={(e) =>
                      setFormNuevaObra({ ...formNuevaObra, ubicacion: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Dirección"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visibleClientes"
                  checked={formNuevaObra.visibleParaClientes}
                  onChange={(e) =>
                    setFormNuevaObra({
                      ...formNuevaObra,
                      visibleParaClientes: e.target.checked
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="visibleClientes" className="text-sm text-slate-700">
                  Visible para clientes (permitir que vean avances)
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModalNuevaObra(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCrearObra}
                  disabled={!formNuevaObra.nombre || formNuevaObra.presupuesto <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Crear Obra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalles de Obra */}
      {showModalDetalles && selectedObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div
              className="px-6 py-4 flex justify-between items-center"
              style={{
                background: `linear-gradient(135deg, ${
                  ETAPAS_OBRA[selectedObra.etapaActual].color
                }30 0%, ${ETAPAS_OBRA[selectedObra.etapaActual].color}50 100%)`
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">
                  {ETAPAS_OBRA[selectedObra.etapaActual].icono}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {selectedObra.nombre}
                  </h2>
                  <p className="text-slate-600 text-sm">
                    {ETAPAS_OBRA[selectedObra.etapaActual].label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCompartirConClientes}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Share2 size={18} />
                  Compartir
                </button>
                <button
                  onClick={() => setShowModalDetalles(false)}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-6">
              <div className="flex gap-1">
                {[
                  { id: 'lista', label: 'General', icon: <FileText size={16} /> },
                  { id: 'timeline', label: 'Timeline', icon: <Calendar size={16} /> },
                  { id: 'fotos', label: 'Fotos', icon: <Camera size={16} /> },
                  {
                    id: 'presupuesto',
                    label: 'Presupuesto',
                    icon: <DollarSign size={16} />
                  },
                  { id: 'hitos', label: 'Hitos', icon: <CheckCircle size={16} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setVistaActual(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                      vistaActual === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {vistaActual === 'lista' && <div>Vista General (pendiente)</div>}
              {vistaActual === 'timeline' && renderVistaTimeline()}
              {vistaActual === 'fotos' && renderVistaFotos()}
              {vistaActual === 'presupuesto' && renderVistaPresupuesto()}
              {vistaActual === 'hitos' && renderVistaHitos()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Hito */}
      {showModalHito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50">
              <h3 className="text-xl font-bold text-slate-900">🎯 Nuevo Hito</h3>
              <button
                onClick={() => setShowModalHito(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formHito.nombre}
                  onChange={(e) => setFormHito({ ...formHito, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ej: Aprobación de planos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formHito.descripcion}
                  onChange={(e) =>
                    setFormHito({ ...formHito, descripcion: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                  placeholder="Describe el hito..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha Estimada *
                  </label>
                  <input
                    type="date"
                    value={formHito.fechaEstimada}
                    onChange={(e) =>
                      setFormHito({ ...formHito, fechaEstimada: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Responsable
                  </label>
                  <input
                    type="text"
                    value={formHito.responsable}
                    onChange={(e) =>
                      setFormHito({ ...formHito, responsable: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Nombre"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModalHito(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarHito}
                  disabled={!formHito.nombre}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Agregar Hito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Gasto */}
      {showModalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-orange-50">
              <h3 className="text-xl font-bold text-slate-900">💰 Registrar Gasto</h3>
              <button
                onClick={() => setShowModalGasto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Concepto *
                </label>
                <input
                  type="text"
                  value={formGasto.concepto}
                  onChange={(e) =>
                    setFormGasto({ ...formGasto, concepto: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ej: Compra de cemento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formGasto.categoria}
                    onChange={(e) =>
                      setFormGasto({ ...formGasto, categoria: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="materiales">Materiales</option>
                    <option value="mano_obra">Mano de Obra</option>
                    <option value="maquinaria">Maquinaria</option>
                    <option value="permisos">Permisos</option>
                    <option value="servicios">Servicios</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monto ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formGasto.monto}
                    onChange={(e) =>
                      setFormGasto({ ...formGasto, monto: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formGasto.fecha}
                    onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={formGasto.proveedor}
                    onChange={(e) =>
                      setFormGasto({ ...formGasto, proveedor: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="Nombre"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowModalGasto(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarGasto}
                  disabled={!formGasto.concepto || formGasto.monto <= 0}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Registrar Gasto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ObrasView;