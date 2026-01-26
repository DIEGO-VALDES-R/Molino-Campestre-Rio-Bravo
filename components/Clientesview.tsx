import React, { useState } from 'react';
import { ClienteInteresado, ClienteActual, PagoCliente, User } from '../types';
import { Users, UserPlus, DollarSign, FileText, Trash2, Eye, Plus, X, CheckCircle } from 'lucide-react';

interface ClientesViewProps {
  clientesInteresados: ClienteInteresado[];
  clientesActuales: ClienteActual[];
  pagos: PagoCliente[];
  onAddInteresado: (cliente: Omit<ClienteInteresado, 'id' | 'createdAt'>) => void;
  onConvertToActual: (interesadoId: string, clienteData: Omit<ClienteActual, 'id' | 'createdAt'>) => void;
  onAddPago: (pago: Omit<PagoCliente, 'id' | 'createdAt'>) => void;
  onDeleteInteresado: (id: string) => void;
  onDeleteActual: (id: string) => void;
  currentUser: User;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  clientesInteresados,
  clientesActuales,
  pagos,
  onAddInteresado,
  onConvertToActual,
  onAddPago,
  onDeleteInteresado,
  onDeleteActual,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'interesados' | 'actuales'>('interesados');
  const [showModalInteresado, setShowModalInteresado] = useState(false);
  const [showModalActual, setShowModalActual] = useState(false);
  const [showModalPago, setShowModalPago] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteActual | null>(null);
  const [selectedInteresado, setSelectedInteresado] = useState<ClienteInteresado | null>(null);

  // Form states
  const [formInteresado, setFormInteresado] = useState({
    nombre: '',
    email: '',
    telefono: '',
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
    onAddInteresado({
      ...formInteresado,
      fechaContacto: new Date().toISOString(),
      estado: 'activo',
    });
    setFormInteresado({ nombre: '', email: '', telefono: '', notas: '' });
    setShowModalInteresado(false);
  };

  const handleConvertToActual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInteresado) return;

    const saldoRestante = formActual.valorLote - formActual.depositoInicial;
    const valorCuota = saldoRestante / formActual.numeroCuotas;

    onConvertToActual(selectedInteresado.id, {
      ...formActual,
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

    onAddPago({
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
    return pagos.filter((p) => p.clienteId === clienteId);
  };

  const getTotalPagado = (clienteId: string) => {
    return getPagosCliente(clienteId).reduce((sum, p) => sum + p.monto, 0);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
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
            Clientes Interesados ({clientesInteresados.length})
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

      {/* CLIENTES INTERESADOS */}
      {activeTab === 'interesados' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Gestión de Clientes Interesados</h3>
            <button
              onClick={() => setShowModalInteresado(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Plus size={18} /> Agregar Interesado
            </button>
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
                  .filter((c) => c.estado === 'activo')
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
                            onClick={() => onDeleteInteresado(cliente.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {clientesInteresados.filter((c) => c.estado === 'activo').length === 0 && (
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Valor Lote</p>
                        <p className="text-lg font-bold text-slate-900">${cliente.valorLote.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Depósito Inicial</p>
                        <p className="text-lg font-bold text-emerald-600">${cliente.depositoInicial.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Total Pagado</p>
                        <p className="text-lg font-bold text-blue-600">${totalPagado.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-orange-600">${saldoPendiente.toLocaleString()}</p>
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
                        <span className="font-medium">${cliente.valorCuota.toLocaleString()}</span>
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
                      {cliente.documentoCompraventa && (
                        <a
                          href={cliente.documentoCompraventa}
                          download={`compraventa_${cliente.numeroLote}.pdf`}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
                        >
                          <FileText size={16} /> Ver Compraventa
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Historial de pagos */}
                  {getPagosCliente(cliente.id).length > 0 && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50">
                      <h5 className="text-sm font-semibold text-slate-700 mb-2">Historial de Pagos</h5>
                      <div className="space-y-2">
                        {getPagosCliente(cliente.id)
                          .slice(-3)
                          .reverse()
                          .map((pago) => (
                            <div key={pago.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                              <div>
                                <span className="font-medium">${pago.monto.toLocaleString()}</span>
                                <span className="text-slate-500 ml-2">
                                  {new Date(pago.fechaPago).toLocaleDateString()}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 capitalize">{pago.formaPago}</span>
                            </div>
                          ))}
                      </div>
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
              <h3 className="font-semibold text-slate-900">Convertir a Cliente Actual</h3>
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

      {/* MODAL: Registrar Pago */}
      {showModalPago && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900">Registrar Pago - {selectedCliente.nombre}</h3>
              <button onClick={() => setShowModalPago(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPago} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPago.monto}
                  onChange={(e) => setFormPago({ ...formPago, monto: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Pago *</label>
                <select
                  value={formPago.tipoPago}
                  onChange={(e) => setFormPago({ ...formPago, tipoPago: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                >
                  <option value="cuota">Cuota</option>
                  <option value="deposito_inicial">Depósito Inicial</option>
                  <option value="pago_extra">Pago Extra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pago</label>
                <select
                  value={formPago.formaPago}
                  onChange={(e) => setFormPago({ ...formPago, formaPago: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                <textarea
                  value={formPago.notas}
                  onChange={(e) => setFormPago({ ...formPago, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Registrar Pago
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};