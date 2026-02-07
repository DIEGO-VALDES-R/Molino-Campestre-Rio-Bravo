/**
 * 🌐 PORTAL DEL CLIENTE - Vista Web Completa
 * Los clientes pueden consultar su estado de cuenta, historial de pagos y documentos
 */

import React, { useState, useEffect } from 'react';
import { ClienteActual, PagoCliente } from '../types';
import {
  CreditCard, Download, FileText, TrendingUp,
  Calendar, DollarSign, CheckCircle, AlertCircle,
  MessageSquare, Phone, Mail, LogOut
} from 'lucide-react';

interface PortalClienteProps {
  clienteId: string;
  onLogout: () => void;
}

export const PortalCliente: React.FC<PortalClienteProps> = ({ clienteId, onLogout }) => {
  const [cliente, setCliente] = useState<ClienteActual | null>(null);
  const [pagos, setPagos] = useState<PagoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resumen' | 'pagos' | 'documentos' | 'contacto'>('resumen');

  useEffect(() => {
    cargarDatosCliente();
  }, [clienteId]);

  const cargarDatosCliente = async () => {
    setLoading(true);
    try {
      // Implementar llamada a API
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !cliente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
  const saldoPendiente = cliente.saldoFinal - totalPagado;
  const progresoPago = ((totalPagado / cliente.saldoFinal) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                🌾
              </div>
              <div>
                <h1 className="text-xl font-bold">Mi Portal</h1>
                <p className="text-sm text-slate-500">Molino Campestre Rio Bravo</p>
              </div>
            </div>
            <button onClick={onLogout} className="px-4 py-2 text-sm hover:bg-slate-100 rounded-lg">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h2 className="text-3xl font-bold mb-2">¡Hola, {cliente.nombre}! 👋</h2>
          <p className="text-blue-100">Bienvenido a tu portal</p>
          <div className="mt-4 flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Lote #{cliente.numeroLote}</span>
            <span className="bg-green-500/30 px-3 py-1 rounded-full text-sm">{cliente.estado.toUpperCase()}</span>
          </div>
        </div>

        {/* Resumen */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Cards de estado */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-sm text-slate-600 mb-4">Valor del Lote</h3>
                <p className="text-3xl font-bold">${(cliente.valorLote / 1000).toFixed(0)}k</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-sm text-slate-600 mb-4">Total Pagado</h3>
                <p className="text-3xl font-bold text-green-600">${(totalPagado / 1000).toFixed(0)}k</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-sm text-slate-600 mb-4">Saldo Pendiente</h3>
                <p className="text-3xl font-bold text-orange-600">${(saldoPendiente / 1000).toFixed(0)}k</p>
              </div>
            </div>

            {/* Progreso */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-semibold">Progreso de Pago</h3>
                <span className="text-2xl font-bold text-blue-600">{progresoPago}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-6">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                  style={{ width: `${progresoPago}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalCliente;
