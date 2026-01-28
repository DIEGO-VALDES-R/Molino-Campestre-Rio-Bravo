import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Lote } from '../../types';

interface GestionLotesProps {
  onAddLote: (lote: Omit<Lote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditLote: (id: string, lote: Partial<Lote>) => void;
  onDeleteLote: (id: string) => void;
  loteToEdit?: Lote | null;
  closeModal?: () => void;
}

const ESTADOS = [
  { value: 'disponible', label: '🟢 Disponible' },
  { value: 'vendido', label: '🔵 Vendido' },
  { value: 'reservado', label: '🟡 Reservado' },
  { value: 'bloqueado', label: '⚫ Bloqueado' },
];

export const GestionLotes: React.FC<GestionLotesProps> = ({
  onAddLote,
  onEditLote,
  onDeleteLote,
  loteToEdit,
  closeModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Lote>>(
    loteToEdit || {
      numeroLote: '',
      estado: 'disponible',
      area: undefined,
      precio: undefined,
      ubicacion: '',
      descripcion: '',
      bloqueadoPor: '',
    }
  );

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    setIsEditing(false);
    setFormData({
      numeroLote: '',
      estado: 'disponible',
      area: undefined,
      precio: undefined,
      ubicacion: '',
      descripcion: '',
      bloqueadoPor: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numeroLote) {
      alert('Por favor ingrese el número de lote');
      return;
    }

    if (isEditing && loteToEdit) {
      onEditLote(loteToEdit.id, formData);
    } else {
      onAddLote(formData as Omit<Lote, 'id' | 'createdAt' | 'updatedAt'>);
    }

    handleClose();
    closeModal?.();
  };

  const handleDelete = () => {
    if (isEditing && loteToEdit && window.confirm('¿Está seguro de que desea eliminar este lote?')) {
      onDeleteLote(loteToEdit.id);
      handleClose();
      closeModal?.();
    }
  };

  const handleEstadoChange = (estado: string) => {
    setFormData({
      ...formData,
      estado: estado as 'disponible' | 'vendido' | 'reservado' | 'bloqueado',
    });
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-lg font-medium"
        >
          <Plus size={20} />
          Nuevo Lote
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {isEditing ? '✏️ Editar Lote' : '➕ Nuevo Lote'}
              </h3>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Información Básica</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Número de Lote *
                    </label>
                    <input
                      type="text"
                      value={formData.numeroLote || ''}
                      onChange={(e) => setFormData({ ...formData, numeroLote: e.target.value })}
                      placeholder="Ej: 1, 2, 3..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado *</label>
                    <select
                      value={formData.estado || 'disponible'}
                      onChange={(e) => handleEstadoChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                      {ESTADOS.map((estado) => (
                        <option key={estado.value} value={estado.value}>
                          {estado.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Área (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Ej: 500"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Precio ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precio || ''}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="Ej: 50000"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.ubicacion || ''}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ej: Manzana A, Sector 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Agregar notas o características especiales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>

              {/* Razón de bloqueo (si está bloqueado) */}
              {formData.estado === 'bloqueado' && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    🔒 Razón del Bloqueo
                  </label>
                  <input
                    type="text"
                    value={formData.bloqueadoPor || ''}
                    onChange={(e) => setFormData({ ...formData, bloqueadoPor: e.target.value })}
                    placeholder="Ej: Pendiente de documentos, Evaluación legal..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg"
                >
                  {isEditing ? 'Guardar Cambios' : 'Crear Lote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GestionLotes;