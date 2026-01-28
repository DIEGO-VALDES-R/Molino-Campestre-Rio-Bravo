import React, { useState, useMemo, useRef } from 'react';
import {
  Obra,
  EtapaObra,
  ETAPAS_CONFIG,
  calcularProgresoAutomatico
} from "../obra-tipos";
import { User } from '../types';
import {
  Plus,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  Clock,
  Users,
  MapPin,
  Camera,
  Upload,
  Trash2,
  Edit2,
  BarChart3,
  Eye,
  Download,
  Share2,
  AlertCircle,
  Search,
  Filter,
  Building2
} from 'lucide-react';

interface GestionObrasViewProps {
  obras: Obra[];
  onAddObra: (obra: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateObra: (id: string, updates: Partial<Obra>) => void;
  onDeleteObra: (id: string) => void;
  currentUser: User;
}

export const GestionObrasView: React.FC<GestionObrasViewProps> = ({
  obras,
  onAddObra,
  onUpdateObra,
  onDeleteObra,
  currentUser
}) => {
  // ==================== ESTADO ====================
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [showModalNuevaObra, setShowModalNuevaObra] = useState(false);
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'timeline' | 'fotos' | 'presupuesto' | 'hitos'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado: 'todas' as 'todas' | 'activa' | 'pausada' | 'completada'
  });

  // Form nueva obra
  const [formNuevaObra, setFormNuevaObra] = useState({
    nombre: '',
    descripcion: '',
    etapaActual: 'planificacion' as EtapaObra,
    presupuesto: 0,
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaEstimadaFin: '',
    responsable: currentUser.name,
    ubicacion: ''
  });

  // Form hito
  const [showModalHito, setShowModalHito] = useState(false);
  const [formHito, setFormHito] = useState({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    responsable: currentUser.name
  });

  // Form gasto
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [formGasto, setFormGasto] = useState({
    concepto: '',
    categoria: 'materiales' as 'materiales' | 'mano_obra' | 'maquinaria' | 'permisos' | 'servicios' | 'otros',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    observaciones: ''
  });

  // ==================== ESTADÍSTICAS ====================
  const estadisticas = useMemo(() => {
    return {
      total: obras.length,
      activas: obras.filter(o => o.estado === 'activa').length,
      completadas: obras.filter(o => o.estado === 'completada').length,
      pausadas: obras.filter(o => o.estado === 'pausada').length,
      presupuestoTotal: obras.reduce((sum, o) => sum + o.presupuesto, 0),
      gastadoTotal: obras.reduce((sum, o) => sum + o.gastado, 0),
      progresoPromedio: obras.length > 0 ? Math.round(obras.reduce((sum, o) => sum + o.progreso, 0) / obras.length) : 0
    };
  }, [obras]);

  // ==================== FILTRADO ====================
  const obrasFiltradas = useMemo(() => {
    return obras.filter(obra => {
      const cumpleEstado = filtros.estado === 'todas' || obra.estado === filtros.estado;
      const cumpleBusqueda = obra.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        obra.descripcion?.toLowerCase().includes(filtros.busqueda.toLowerCase());
      return cumpleEstado && cumpleBusqueda;
    });
  }, [obras, filtros]);

  // ==================== HANDLERS ====================

  const handleCrearObra = () => {
    if (!formNuevaObra.nombre || formNuevaObra.presupuesto <= 0) {
      alert('El nombre y presupuesto son obligatorios');
      return;
    }

    const nuevaObra: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formNuevaObra,
      progreso: calcularProgresoAutomatico(formNuevaObra.etapaActual),
      gastado: 0,
      fotos: [],
      hitos: [],
      gastos: [],
      estado: 'activa'
    };

    onAddObra(nuevaObra);
    setShowModalNuevaObra(false);
    setFormNuevaObra({
      nombre: '',
      descripcion: '',
      etapaActual: 'planificacion',
      presupuesto: 0,
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaEstimadaFin: '',
      responsable: currentUser.name,
      ubicacion: ''
    });
  };

  const handleAgregarHito = () => {
    if (!selectedObra || !formHito.titulo) {
      alert('El título del hito es obligatorio');
      return;
    }

    const nuevoHito = {
      id: crypto.randomUUID(),
      titulo: formHito.titulo,
      descripcion: formHito.descripcion,
      fecha: formHito.fecha,
      responsable: formHito.responsable,
      completado: false,
      createdAt: new Date().toISOString()
    };

    const hitosActualizados = [...selectedObra.hitos, nuevoHito];
    onUpdateObra(selectedObra.id, { hitos: hitosActualizados });
    setSelectedObra({ ...selectedObra, hitos: hitosActualizados });
    setShowModalHito(false);
    setFormHito({
      titulo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      responsable: currentUser.name
    });
  };

  const handleToggleHito = (hitoId: string) => {
    if (!selectedObra) return;

    const hitosActualizados = selectedObra.hitos.map(h =>
      h.id === hitoId ? { ...h, completado: !h.completado } : h
    );

    onUpdateObra(selectedObra.id, { hitos: hitosActualizados });
    setSelectedObra({ ...selectedObra, hitos: hitosActualizados });
  };

  const handleEliminarHito = (hitoId: string) => {
    if (!selectedObra || !window.confirm('¿Eliminar este hito?')) return;

    const hitosActualizados = selectedObra.hitos.filter(h => h.id !== hitoId);
    onUpdateObra(selectedObra.id, { hitos: hitosActualizados });
    setSelectedObra({ ...selectedObra, hitos: hitosActualizados });
  };

  const handleAgregarGasto = () => {
    if (!selectedObra || !formGasto.concepto || formGasto.monto <= 0) {
      alert('Concepto y monto son obligatorios');
      return;
    }

    const nuevoGasto = {
      id: crypto.randomUUID(),
      fecha: formGasto.fecha,
      concepto: formGasto.concepto,
      categoria: formGasto.categoria,
      monto: formGasto.monto,
      proveedor: formGasto.proveedor,
      observaciones: formGasto.observaciones,
      etapa: selectedObra.etapaActual,
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
      observaciones: ''
    });
  };

  const handleEliminarGasto = (gastoId: string) => {
    if (!selectedObra || !window.confirm('¿Eliminar este gasto?')) return;

    const gastosActualizados = selectedObra.gastos.filter(g => g.id !== gastoId);
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
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObra || !e.target.files?.[0]) return;

    const archivo = e.target.files[0];
    if (!archivo.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setUploadingFoto(true);
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const etapaConfig = ETAPAS_CONFIG[selectedObra.etapaActual];

        const nuevaFoto = {
          id: crypto.randomUUID(),
          url: base64,
          descripcion: `Foto de avance - ${etapaConfig?.label}`,
          fecha: new Date().toISOString(),
          etapa: selectedObra.etapaActual,
          uploadedBy: currentUser.name,
          createdAt: new Date().toISOString()
        };

        const fotosActualizadas = [...selectedObra.fotos, nuevaFoto];
        onUpdateObra(selectedObra.id, { fotos: fotosActualizadas });
        setSelectedObra({ ...selectedObra, fotos: fotosActualizadas });
      };

      reader.readAsDataURL(archivo);
    } catch (error) {
      console.error('Error subiendo foto:', error);
      alert('Error al subir la foto');
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEliminarFoto = (fotoId: string) => {
    if (!selectedObra || !window.confirm('¿Eliminar esta foto?')) return;

    const fotosActualizadas = selectedObra.fotos.filter(f => f.id !== fotoId);
    onUpdateObra(selectedObra.id, { fotos: fotosActualizadas });
    setSelectedObra({ ...selectedObra, fotos: fotosActualizadas });
  };

  const handleCambiarEtapa = (nuevaEtapa: EtapaObra) => {
    if (!selectedObra) return;

    const nuevoProgreso = calcularProgresoAutomatico(nuevaEtapa);
    onUpdateObra(selectedObra.id, {
      etapaActual: nuevaEtapa,
      progreso: nuevoProgreso
    });

    setSelectedObra({
      ...selectedObra,
      etapaActual: nuevaEtapa,
      progreso: nuevoProgreso
    });
  };

  // ==================== RENDER TABS ====================

  const renderTabGeneral = () => {
    if (!selectedObra) return null;

    const etapaConfig = ETAPAS_CONFIG[selectedObra.etapaActual];
    const porcentajeGastado = selectedObra.presupuesto > 0
      ? (selectedObra.gastado / selectedObra.presupuesto) * 100
      : 0;

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="text-sm text-blue-600 mb-2">Progreso</div>
            <p className="text-3xl font-bold text-blue-900">{selectedObra.progreso}%</p>
            <p className="text-xs text-blue-600 mt-1">{etapaConfig?.label}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="text-sm text-green-600 mb-2">Presupuesto</div>
            <p className="text-2xl font-bold text-green-900">
              ${selectedObra.presupuesto.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div className="text-sm text-orange-600 mb-2">Gastado</div>
            <p className="text-2xl font-bold text-orange-900">
              ${selectedObra.gastado.toLocaleString()}
            </p>
            <p className="text-xs text-orange-600 mt-1">{porcentajeGastado.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <div className="text-sm text-purple-600 mb-2">Fotos</div>
            <p className="text-3xl font-bold text-purple-900">{selectedObra.fotos.length}</p>
          </div>
        </div>

        {/* Información General */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">📋 Información</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Descripción</label>
              <p className="font-medium">{selectedObra.descripcion || 'Sin descripción'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Responsable</label>
              <p className="font-medium">{selectedObra.responsable || 'No asignado'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Ubicación</label>
              <p className="font-medium">{selectedObra.ubicacion || 'No especificada'}</p>
            </div>
            <div>
              <label className="text-sm text-slate-600">Fecha Inicio</label>
              <p className="font-medium">
                {new Date(selectedObra.fechaInicio).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabTimeline = () => {
    if (!selectedObra) return null;

    const etapasArray = Object.entries(ETAPAS_CONFIG);
    const etapaActualIndex = etapasArray.findIndex(([key]) => key === selectedObra.etapaActual);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">🗓️ Timeline</h3>
          <p className="text-sm text-slate-600">
            Etapa {etapaActualIndex + 1} de {etapasArray.length}
          </p>
        </div>

        <div className="space-y-4">
          {etapasArray.map(([key, etapa], index) => {
            const isActual = key === selectedObra.etapaActual;
            const isCompletada = index < etapaActualIndex;

            return (
              <div
                key={key}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isActual ? 'border-blue-500 bg-blue-50' : isCompletada ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full text-2xl ${isActual ? 'bg-blue-500' : isCompletada ? 'bg-green-500' : 'bg-slate-300'}`}>
                    {isCompletada ? '✅' : isActual ? '🔄' : etapa.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900">{etapa.label}</h4>
                      {isActual && <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-bold">ACTUAL</span>}
                    </div>
                    <p className="text-sm text-slate-600">{etapa.descripcion}</p>
                  </div>

                  {!isCompletada && selectedObra.estado === 'activa' && (
                    <button
                      onClick={() => handleCambiarEtapa(key as EtapaObra)}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                    >
                      Mover
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTabFotos = () => {
    if (!selectedObra) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">📸 Fotos</h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSubirFoto}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload size={18} />
              {uploadingFoto ? 'Subiendo...' : 'Subir Foto'}
            </button>
          </div>
        </div>

        {selectedObra.fotos.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
            <ImageIcon size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">No hay fotos registradas</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Subir Primera Foto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selectedObra.fotos.map(foto => (
              <div key={foto.id} className="relative group">
                <img
                  src={foto.url}
                  alt={foto.descripcion}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-end p-4">
                  <div className="w-full transform translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-sm mb-2">{foto.descripcion}</p>
                    <button
                      onClick={() => handleEliminarFoto(foto.id)}
                      className="w-full px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTabPresupuesto = () => {
    if (!selectedObra) return null;

    const porcentajeGastado = selectedObra.presupuesto > 0
      ? (selectedObra.gastado / selectedObra.presupuesto) * 100
      : 0;
    const disponible = selectedObra.presupuesto - selectedObra.gastado;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">💰 Presupuesto</h3>
          <button
            onClick={() => setShowModalGasto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Plus size={18} />
            Registrar Gasto
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Total</p>
            <p className="text-2xl font-bold">${selectedObra.presupuesto.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
            <p className="text-sm text-orange-600 mb-1">Gastado</p>
            <p className="text-2xl font-bold">${selectedObra.gastado.toLocaleString()}</p>
            <p className="text-xs text-orange-600">{porcentajeGastado.toFixed(1)}%</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <p className="text-sm text-green-600 mb-1">Disponible</p>
            <p className="text-2xl font-bold">${disponible.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabla de gastos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Concepto</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {selectedObra.gastos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Sin gastos registrados
                  </td>
                </tr>
              ) : (
                selectedObra.gastos.map(gasto => (
                  <tr key={gasto.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{new Date(gasto.fecha).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3 font-medium">{gasto.concepto}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-xs rounded">
                        {gasto.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600">
                      ${gasto.monto.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleEliminarGasto(gasto.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
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

  const renderTabHitos = () => {
    if (!selectedObra) return null;

    const hitosCompletados = selectedObra.hitos.filter(h => h.completado).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">🎯 Hitos</h3>
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
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
            <CheckCircle size={48} className="mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-4">Sin hitos registrados</p>
            <button
              onClick={() => setShowModalHito(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Crear Primer Hito
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedObra.hitos.map(hito => (
              <div
                key={hito.id}
                className={`p-4 rounded-xl border-2 ${
                  hito.completado ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleHito(hito.id)}
                    className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      hito.completado
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 hover:border-green-500'
                    }`}
                  >
                    {hito.completado && <CheckCircle size={20} className="text-white" />}
                  </button>

                  <div className="flex-1">
                    <h4 className={`font-bold mb-1 ${hito.completado ? 'line-through text-slate-500' : ''}`}>
                      {hito.titulo}
                    </h4>
                    <p className="text-sm text-slate-600 mb-2">{hito.descripcion}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📅 {new Date(hito.fecha).toLocaleDateString('es-CO')}</span>
                      {hito.responsable && <span>👤 {hito.responsable}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleEliminarHito(hito.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🏗️ Gestión de Obras</h2>
          <p className="text-slate-600 text-sm mt-1">
            Control de proyectos de construcción
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">Total</p>
          <p className="text-3xl font-bold text-blue-900">{estadisticas.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <p className="text-sm text-green-600 mb-1">Activas</p>
          <p className="text-3xl font-bold text-green-900">{estadisticas.activas}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <p className="text-sm text-purple-600 mb-1">Completadas</p>
          <p className="text-3xl font-bold text-purple-900">{estadisticas.completadas}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
          <p className="text-sm text-orange-600 mb-1">Presupuesto Total</p>
          <p className="text-2xl font-bold text-orange-900">
            ${(estadisticas.presupuestoTotal / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
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
          <Building2 size={64} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {filtros.busqueda || filtros.estado !== 'todas' ? 'No se encontraron obras' : 'No hay obras'}
          </h3>
          <p className="text-slate-600 mb-6">
            {filtros.busqueda || filtros.estado !== 'todas'
              ? 'Ajusta los filtros'
              : 'Crea tu primera obra'}
          </p>
          {!filtros.busqueda && filtros.estado === 'todas' && (
            <button
              onClick={() => setShowModalNuevaObra(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Crear Primera Obra
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obrasFiltradas.map(obra => {
            const etapaConfig = ETAPAS_CONFIG[obra.etapaActual];
            const porcentajeGastado = obra.presupuesto > 0 ? (obra.gastado / obra.presupuesto) * 100 : 0;

            return (
              <div
                key={obra.id}
                className="bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 transition-all overflow-hidden"
              >
                {/* Header */}
                <div
                  className="p-4"
                  style={{
                    background: `linear-gradient(135deg, ${etapaConfig?.colorBg || '#eff6ff'} 0%, ${etapaConfig?.colorBg}80 100%)`
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-3xl">{etapaConfig?.icon}</div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        obra.estado === 'activa'
                          ? 'bg-green-100 text-green-800'
                          : obra.estado === 'pausada'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {obra.estado.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900">{obra.nombre}</h3>
                  <p className="text-sm text-slate-600">{etapaConfig?.label}</p>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Progreso */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Progreso</span>
                      <span className="font-bold" style={{ color: etapaConfig?.color }}>
                        {obra.progreso}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${obra.progreso}%`,
                          backgroundColor: etapaConfig?.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Presupuesto */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Presupuesto</span>
                      <span className={`font-bold ${porcentajeGastado > 90 ? 'text-red-600' : ''}`}>
                        {porcentajeGastado.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
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

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">{obra.fotos.length}</p>
                      <p className="text-xs text-slate-500">Fotos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{obra.hitos.filter(h => h.completado).length}</p>
                      <p className="text-xs text-slate-500">Hitos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">{obra.gastos.length}</p>
                      <p className="text-xs text-slate-500">Gastos</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    {new Date(obra.fechaInicio).toLocaleDateString('es-CO')}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedObra(obra);
                      setShowModalDetalle(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                  >
                    Ver
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Nueva Obra */}
      {showModalNuevaObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-xl font-bold">🏗️ Nueva Obra</h3>
              <button
                onClick={() => setShowModalNuevaObra(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formNuevaObra.nombre}
                  onChange={(e) => setFormNuevaObra({ ...formNuevaObra, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Urbanización Molino Fase 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formNuevaObra.descripcion}
                  onChange={(e) => setFormNuevaObra({ ...formNuevaObra, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Describe el proyecto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Etapa Inicial *</label>
                  <select
                    value={formNuevaObra.etapaActual}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, etapaActual: e.target.value as EtapaObra })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(ETAPAS_CONFIG).map(([key, etapa]) => (
                      <option key={key} value={key}>
                        {etapa.icon} {etapa.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Presupuesto ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formNuevaObra.presupuesto}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, presupuesto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={formNuevaObra.fechaInicio}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, fechaInicio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fecha Fin Estimada</label>
                  <input
                    type="date"
                    value={formNuevaObra.fechaEstimadaFin}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, fechaEstimadaFin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formNuevaObra.responsable}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={formNuevaObra.ubicacion}
                    onChange={(e) => setFormNuevaObra({ ...formNuevaObra, ubicacion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
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
                  disabled={!formNuevaObra.nombre}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Crear Obra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle de Obra */}
      {showModalDetalle && selectedObra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div
              className="px-6 py-4 flex justify-between items-center"
              style={{
                background: `linear-gradient(135deg, ${ETAPAS_CONFIG[selectedObra.etapaActual]?.colorBg}80 0%, ${ETAPAS_CONFIG[selectedObra.etapaActual]?.colorBg}40 100%)`
              }}
            >
              <h2 className="text-2xl font-bold">{selectedObra.nombre}</h2>
              <button
                onClick={() => setShowModalDetalle(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                <X size={28} />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-6">
              <div className="flex gap-1">
                {[
                  { id: 'general', label: 'General' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'fotos', label: 'Fotos' },
                  { id: 'presupuesto', label: 'Presupuesto' },
                  { id: 'hitos', label: 'Hitos' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-3 font-medium transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'general' && renderTabGeneral()}
              {activeTab === 'timeline' && renderTabTimeline()}
              {activeTab === 'fotos' && renderTabFotos()}
              {activeTab === 'presupuesto' && renderTabPresupuesto()}
              {activeTab === 'hitos' && renderTabHitos()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Hito */}
      {showModalHito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-purple-50">
              <h3 className="text-xl font-bold">🎯 Nuevo Hito</h3>
              <button
                onClick={() => setShowModalHito(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  value={formHito.titulo}
                  onChange={(e) => setFormHito({ ...formHito, titulo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ej: Aprobación de planos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formHito.descripcion}
                  onChange={(e) => setFormHito({ ...formHito, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={formHito.fecha}
                    onChange={(e) => setFormHito({ ...formHito, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Responsable</label>
                  <input
                    type="text"
                    value={formHito.responsable}
                    onChange={(e) => setFormHito({ ...formHito, responsable: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                  disabled={!formHito.titulo}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Gasto */}
      {showModalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-orange-50">
              <h3 className="text-xl font-bold">💰 Registrar Gasto</h3>
              <button
                onClick={() => setShowModalGasto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Concepto *</label>
                <input
                  type="text"
                  value={formGasto.concepto}
                  onChange={(e) => setFormGasto({ ...formGasto, concepto: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  placeholder="Ej: Compra de cemento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría *</label>
                  <select
                    value={formGasto.categoria}
                    onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value as any })}
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
                  <label className="block text-sm font-medium mb-1">Monto ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formGasto.monto}
                    onChange={(e) => setFormGasto({ ...formGasto, monto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={formGasto.fecha}
                    onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={formGasto.proveedor}
                    onChange={(e) => setFormGasto({ ...formGasto, proveedor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
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
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionObrasView;