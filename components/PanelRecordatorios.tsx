/**
 * 📧 PANEL DE RECORDATORIOS - Vista Admin
 * Gestión y configuración del sistema de recordatorios
 */

import React, { useState, useEffect } from 'react';
import {
  getConfiguracionRecordatorios,
  actualizarConfiguracionRecordatorios,
  obtenerHistorialRecordatorios,
  ejecutarSistemaRecordatorios,
  ConfiguracionRecordatorios,
  Recordatorio
} from '../services/recordatoriosService';
import { ClienteActual, PagoCliente } from '../types';
import {
  Bell,
  Settings,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  TrendingUp,
  Filter
} from 'lucide-react';

interface PanelRecordatoriosProps {
  clientes: ClienteActual[];
  pagos: PagoCliente[];
}

export const PanelRecordatorios: React.FC<PanelRecordatoriosProps> = ({
  clientes,
  pagos
}) => {
  const [activeTab, setActiveTab] = useState<'historial' | 'configuracion' | 'estadisticas'>('historial');
  const [config, setConfig] = useState<ConfiguracionRecordatorios | null>(null);
  const [historial, setHistorial] = useState<Recordatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [configData, historialData] = await Promise.all([
        getConfiguracionRecordatorios(),
        obtenerHistorialRecordatorios()
      ]);
      setConfig(configData);
      setHistorial(historialData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECCIÓN: Función mejorada para que los botones no se bloqueen y respondan al instante
  const handleActualizarConfig = async (updates: Partial<ConfiguracionRecordatorios>) => {
    // Si no hay config (porque falló la carga de Supabase), usamos los valores por defecto
    const baseConfig = config || {
      diasAntes: [7, 3, 1],
      habilitarEmail: true,
      habilitarWhatsApp: true,
      habilitarSMS: false,
      horaEnvio: '09:00',
      felicitarPagoATiempo: true,
      escalarMora: true
    };

    const nuevaConfig = { ...baseConfig, ...updates };
    
    // Actualización optimista del estado para que los botones respondan instantáneamente
    setConfig(nuevaConfig);
    
    const success = await actualizarConfiguracionRecordatorios(updates);
    if (success) {
      console.log('✅ Configuración guardada en base de datos');
    } else {
      // Si falla, mostramos error y recargamos para sincronizar con el estado real
      alert('❌ Error al guardar en la base de datos. Verifica la conexión con Supabase y que las tablas existan.');
      cargarDatos();
    }
  };

  const handleEjecutarManualmente = async () => {
    if (!confirm('¿Ejecutar sistema de recordatorios ahora?')) return;
    
    setEjecutando(true);
    try {
      const resultado = await ejecutarSistemaRecordatorios(clientes, pagos);
      
      if (resultado.success) {
        alert(
          `✅ Recordatorios ejecutados exitosamente\n\n` +
          `📋 Generados: ${resultado.recordatoriosGenerados}\n` +
          `✉️ Enviados: ${resultado.recordatoriosEnviados}\n` +
          `${resultado.errores.length > 0 ? `⚠️ Errores: ${resultado.errores.length}` : ''}`
        );
        await cargarDatos(); // Recargar historial
      } else {
        alert('❌ Error ejecutando recordatorios');
      }
    } catch (error) {
      console.error(error);
      alert('❌ Error inesperado');
    } finally {
      setEjecutando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filtrar historial
  const historialFiltrado = filtroTipo === 'todos'
    ? historial
    : historial.filter(r => r.tipo === filtroTipo);

  // Estadísticas
  const stats = {
    total: historial.length,
    enviados: historial.filter(r => r.enviado).length,
    pendientes: historial.filter(r => !r.enviado).length,
    ultimosDias: historial.filter(r => {
      const diff = Date.now() - new Date(r.createdAt).getTime();
      return diff < 7 * 24 * 60 * 60 * 1000; // 7 días
    }).length
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell size={28} className="text-blue-600" />
            Sistema de Recordatorios
          </h2>
          <p className="text-slate-500 mt-1">
            Gestión automatizada de notificaciones a clientes
          </p>
        </div>
        <button
          onClick={handleEjecutarManualmente}
          disabled={ejecutando}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ejecutando ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Ejecutando...
            </>
          ) : (
            <>
              <Send size={20} />
              Ejecutar Ahora
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Bell size={24} className="text-blue-600" />}
          label="Total Recordatorios"
          value={stats.total}
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={<CheckCircle size={24} className="text-green-600" />}
          label="Enviados"
          value={stats.enviados}
          bgColor="bg-green-50"
        />
        <StatCard
          icon={<Clock size={24} className="text-orange-600" />}
          label="Pendientes"
          value={stats.pendientes}
          bgColor="bg-orange-50"
        />
        <StatCard
          icon={<TrendingUp size={24} className="text-purple-600" />}
          label="Últimos 7 días"
          value={stats.ultimosDias}
          bgColor="bg-purple-50"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <TabButton
          active={activeTab === 'historial'}
          onClick={() => setActiveTab('historial')}
          icon={<Bell size={18} />}
          label="Historial"
        />
        <TabButton
          active={activeTab === 'configuracion'}
          onClick={() => setActiveTab('configuracion')}
          icon={<Settings size={18} />}
          label="Configuración"
        />
        <TabButton
          active={activeTab === 'estadisticas'}
          onClick={() => setActiveTab('estadisticas')}
          icon={<TrendingUp size={18} />}
          label="Estadísticas"
        />
      </div>

      {/* Content */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          
          {/* Filtros */}
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <Filter size={20} className="text-slate-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="todos">Todos los tipos</option>
              <option value="pago_proximo">Pago Próximo</option>
              <option value="pago_vencido">Pago Vencido</option>
              <option value="mora">Mora</option>
              <option value="felicitacion">Felicitación</option>
            </select>
          </div>

          {/* Lista de Recordatorios */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {historialFiltrado.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Bell size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay recordatorios registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historialFiltrado.slice(0, 20).map((recordatorio) => (
                  <RecordatorioItem key={recordatorio.id} recordatorio={recordatorio} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'configuracion' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
          
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Configuración General
          </h3>

          {!config && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 mb-6">
              <AlertCircle size={20} />
              <p className="text-sm">
                No se pudo cargar la configuración desde la base de datos. Se están usando valores por defecto.
              </p>
            </div>
          )}

          {/* Días antes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Días de anticipación para recordatorios
            </label>
            <div className="flex gap-2">
              {[1, 3, 5, 7, 10].map(dia => (
                <button
                  key={dia}
                  onClick={() => {
                    const diasAntes = config?.diasAntes || [7, 3, 1];
                    const dias = diasAntes.includes(dia)
                      ? diasAntes.filter(d => d !== dia)
                      : [...diasAntes, dia].sort((a, b) => b - a);
                    handleActualizarConfig({ diasAntes: dias });
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    config?.diasAntes?.includes(dia)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {dia} día{dia !== 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Seleccionados: {config?.diasAntes?.sort((a, b) => b - a).join(', ') || 'Ninguno'} días antes
            </p>
          </div>

          {/* Canales de envío */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Canales de envío
            </label>
            <div className="space-y-2">
              <ToggleOption
                icon={<Mail size={20} />}
                label="Email"
                description="Enviar recordatorios por correo electrónico"
                checked={config?.habilitarEmail || false}
                onChange={(checked) => handleActualizarConfig({ habilitarEmail: checked })}
              />
              <ToggleOption
                icon={<MessageSquare size={20} />}
                label="WhatsApp"
                description="Enviar recordatorios por WhatsApp"
                checked={config?.habilitarWhatsApp || false}
                onChange={(checked) => handleActualizarConfig({ habilitarWhatsApp: checked })}
              />
              <ToggleOption
                icon={<Smartphone size={20} />}
                label="SMS"
                description="Enviar recordatorios por mensaje de texto"
                checked={config?.habilitarSMS || false}
                onChange={(checked) => handleActualizarConfig({ habilitarSMS: checked })}
              />
            </div>
          </div>

          {/* Opciones adicionales */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Opciones adicionales
            </label>
            <div className="space-y-2">
              <ToggleOption
                label="Felicitar por pagos a tiempo"
                description="Enviar mensaje de agradecimiento cuando cliente paga a tiempo"
                checked={config?.felicitarPagoATiempo || false}
                onChange={(checked) => handleActualizarConfig({ felicitarPagoATiempo: checked })}
              />
              <ToggleOption
                label="Escalar mora automáticamente"
                description="Aumentar frecuencia de recordatorios en caso de mora"
                checked={config?.escalarMora || false}
                onChange={(checked) => handleActualizarConfig({ escalarMora: checked })}
              />
            </div>
          </div>

          {/* Hora de envío */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hora de envío
            </label>
            <input
              type="time"
              value={config?.horaEnvio || '09:00'}
              onChange={(e) => handleActualizarConfig({ horaEnvio: e.target.value })}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-2">
              Los recordatorios se enviarán diariamente a esta hora
            </p>
          </div>
        </div>
      )}

      {activeTab === 'estadisticas' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="text-center text-slate-400 py-12">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Próximamente</p>
            <p className="text-sm">Estadísticas detalladas de recordatorios</p>
          </div>
        </div>
      )}

    </div>
  );
};

// Componentes auxiliares
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  bgColor: string;
}> = ({ icon, label, value, bgColor }) => (
  <div className={`${bgColor} rounded-lg p-6 border border-slate-200`}>
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 bg-white rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
    <p className="text-sm text-slate-600 mb-1">{label}</p>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
      active
        ? 'border-b-2 border-blue-600 text-blue-600'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    {icon}
    {label}
  </button>
);

const ToggleOption: React.FC<{
  icon?: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ icon, label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      {icon && <div className="text-slate-400">{icon}</div>}
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const RecordatorioItem: React.FC<{ recordatorio: Recordatorio }> = ({ recordatorio }) => {
  const tipoColors: Record<string, string> = {
    pago_proximo: 'bg-blue-100 text-blue-700',
    pago_vencido: 'bg-orange-100 text-orange-700',
    mora: 'bg-red-100 text-red-700',
    felicitacion: 'bg-green-100 text-green-700'
  };

  const prioridadColors: Record<string, string> = {
    alta: 'text-red-600',
    media: 'text-orange-600',
    baja: 'text-slate-600'
  };

  return (
    <div className="p-6 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${tipoColors[recordatorio.tipo]}`}>
              {recordatorio.tipo.replace('_', ' ')}
            </span>
            <span className={`text-xs font-medium ${prioridadColors[recordatorio.prioridad]}`}>
              {recordatorio.prioridad.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
            {recordatorio.mensaje}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {new Date(recordatorio.fechaEnvio).toLocaleDateString('es-CO')}
            </span>
            <span className="flex items-center gap-1">
              {recordatorio.medios.includes('email') && <Mail size={14} />}
              {recordatorio.medios.includes('whatsapp') && <MessageSquare size={14} />}
              {recordatorio.medios.join(', ')}
            </span>
          </div>
        </div>
        <div className="ml-4">
          {recordatorio.enviado ? (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle size={16} />
              Enviado
            </div>
          ) : (
            <div className="flex items-center gap-1 text-orange-600 text-sm">
              <Clock size={16} />
              Pendiente
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelRecordatorios;
