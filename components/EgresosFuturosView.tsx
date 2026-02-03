import React, { useState, useRef } from 'react';
import { EgresoFuturo, User } from '../types';
import { Calendar, Plus, Trash2, Search, X, Paperclip, FileText, Image as ImageIcon, Edit2 } from 'lucide-react';
import { fileToBase64 } from '../services/dataService';

interface EgresosFuturosViewProps {
  egresosFuturos: EgresoFuturo[];
  onAddEgreso: (egreso: Omit<EgresoFuturo, 'id' | 'createdAt'>) => void;
  onUpdateEgreso: (id: string, updates: Partial<EgresoFuturo>) => void;
  onDeleteEgreso: (id: string) => void;
  currentUser: User;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string;
}

export const EgresosFuturosView: React.FC<EgresosFuturosViewProps> = ({
  egresosFuturos,
  onAddEgreso,
  onUpdateEgreso,
  onDeleteEgreso,
  currentUser,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEgreso, setEditingEgreso] = useState<EgresoFuturo | null>(null);
  const [filter, setFilter] = useState('');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'pendiente' | 'pagado' | 'cancelado'>('todos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'planificado' as 'planificado' | 'recurrente' | 'extraordinario',
    categoria: '',
    descripcion: '',
    monto: 0,
  });
  const [adjuntos, setAdjuntos] = useState<Attachment[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 2MB.');
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data: base64,
        };
        setAdjuntos([...adjuntos, newAttachment]);
      } catch (err) {
        console.error('Error reading file', err);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAdjuntos(adjuntos.filter((a) => a.id !== id));
  };

  const openEditModal = (egreso: EgresoFuturo) => {
    setEditingEgreso(egreso);
    setForm({
      fecha: egreso.fecha,
      tipo: egreso.tipo,
      categoria: egreso.categoria,
      descripcion: egreso.descripcion || '',
      monto: egreso.monto,
    });
    setAdjuntos(egreso.adjuntos || []);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEgreso) {
      // Editar egreso existente
      onUpdateEgreso(editingEgreso.id, {
        ...form,
        adjuntos: adjuntos.length > 0 ? adjuntos : undefined,
      });
    } else {
      // Crear nuevo egreso
      onAddEgreso({
        ...form,
        usuario: currentUser.name,
        adjuntos: adjuntos.length > 0 ? adjuntos : undefined,
        estado: 'pendiente',
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'planificado',
      categoria: '',
      descripcion: '',
      monto: 0,
    });
    setAdjuntos([]);
    setEditingEgreso(null);
    setShowModal(false);
  };

  const filteredEgresos = egresosFuturos
    .filter((e) => {
      const matchesSearch =
        e.descripcion?.toLowerCase().includes(filter.toLowerCase()) ||
        e.categoria.toLowerCase().includes(filter.toLowerCase());
      const matchesEstado = filterEstado === 'todos' || e.estado === filterEstado;
      return matchesSearch && matchesEstado;
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'recurrente':
        return 'bg-blue-100 text-blue-800';
      case 'extraordinario':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalPendiente = filteredEgresos
    .filter((e) => e.estado === 'pendiente')
    .reduce((sum, e) => sum + e.monto, 0);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Egresos Futuros Planificados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Total pendiente: <span className="font-bold text-orange-600">${totalPendiente.toLocaleString()}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEgreso(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} /> Nuevo Egreso Futuro
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar egresos..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as any)}
          className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Pagados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Adjuntos</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEgresos.length > 0 ? (
                filteredEgresos.map((egreso) => (
                  <tr key={egreso.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(egreso.fecha).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(egreso.tipo)}`}>
                        {egreso.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{egreso.categoria}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={egreso.descripcion}>
                      {egreso.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {egreso.adjuntos && egreso.adjuntos.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {egreso.adjuntos.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.data}
                              download={att.name}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300 z-10"
                              title={att.name}
                            >
                              <Paperclip size={12} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{egreso.usuario || '-'}</td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600">${egreso.monto.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <select
                        value={egreso.estado}
                        onChange={(e) => onUpdateEgreso(egreso.id, { estado: e.target.value as any })}
                        className={`text-xs font-medium px-2 py-1 rounded border-none outline-none cursor-pointer ${getEstadoColor(
                          egreso.estado
                        )}`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="pagado">Pagado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(egreso)}
                          className="text-slate-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeleteEgreso(egreso.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron egresos futuros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Agregar/Editar Egreso Futuro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">
                {editingEgreso ? 'Editar Egreso Futuro' : 'Nuevo Egreso Futuro'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                    className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo *</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                    className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="planificado">Planificado</option>
                    <option value="recurrente">Recurrente</option>
                    <option value="extraordinario">Extraordinario</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Categoría *</label>
                <input
                  type="text"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ej: Mantenimiento, Proveedores, Servicios..."
                  required
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monto ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.monto}
                  onChange={(e) => setForm({ ...form, monto: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Detalles adicionales del egreso..."
                  rows={3}
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Adjuntar Archivos (Img/PDF)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
                  >
                    <Paperclip size={14} /> Adjuntar
                  </button>
                </div>
                {adjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {adjuntos.map((att) => (
                      <div key={att.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                        <span className="truncate max-w-[200px] flex items-center gap-1">
                          {att.type.includes('image') ? <ImageIcon size={12} /> : <FileText size={12} />}
                          {att.name}
                        </span>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
                >
                  {editingEgreso ? 'Guardar Cambios' : 'Guardar Egreso Futuro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EgresosFuturosView;