import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, User, Attachment } from '../types';
import { Plus, Trash2, Search, FileDown, Printer, Paperclip, FileText, Image as ImageIcon, X, Edit2 } from 'lucide-react';
import { exportToCSV, fileToBase64 } from '../services/dataService';
import jsPDF from 'jspdf';

interface TransactionListProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<Transaction>) => Promise<void>; // ✅ AJUSTE 1: SOLO ESTE
  users: User[];
  currentUser: User;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  onAdd, 
  onDelete, 
  onEdit, // ✅ AJUSTE 1: DESTRUCTURAR SOLO ESTE
  users, 
  currentUser 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState('');
  
  // Form State
  const [type, setType] = useState<TransactionType>('ingreso');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTransactions = transactions
    .filter(t => t.description.toLowerCase().includes(filter.toLowerCase()) || t.category.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        alert("El archivo es demasiado grande. Máximo 1MB.");
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        const newAttachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data: base64
        };
        setAttachments([...attachments, newAttachment]);
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  // ✅ AJUSTE 2: COMPLETAR openEditModal CON description
  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setCategory(transaction.category);
    setDescription(transaction.description); // ✅ ESTA LÍNEA ES IMPORTANTE
    setDate(transaction.date);
    setAttachments(transaction.attachments || []);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setType('ingreso');
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setAttachments([]);
    setIsModalOpen(false);
  };

  // ✅ AJUSTE 3: CONVERTIR handleSubmit A ASYNC Y USAR onEdit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingTransaction) {
        // Editar transacción existente - USAR onEdit (async)
        await onEdit(editingTransaction.id, {
          date,
          type,
          amount: parseFloat(amount),
          category,
          description,
          attachments: attachments  // ✅ Siempre incluir (no usar condicional)
        });
      } else {
        // Crear nueva transacción
        onAdd({
          date,
          type,
          amount: parseFloat(amount),
          category,
          description,
          user: currentUser.name,
          attachments: attachments.length > 0 ? attachments : undefined
        });
      }
      
      resetForm();
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      alert('Error al guardar la transacción');
    }
  };

  const handlePrint = () => {
    try {
      const doc = new jsPDF();
      
      const totalIngresos = filteredTransactions
        .filter(t => t.type === 'ingreso')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalEgresos = filteredTransactions
        .filter(t => t.type === 'egreso')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const balance = totalIngresos - totalEgresos;

      const brandColor = [79, 70, 229];
      const greenColor = [16, 185, 129];
      const redColor = [239, 68, 68];

      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte de Transacciones', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 105, 25, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Financiero', 14, 45);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, 50, 58, 20, 3, 3, 'FD');
      doc.setTextColor(100, 100, 100);
      doc.text('Total Ingresos', 43, 57, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(`$${totalIngresos.toLocaleString()}`, 43, 66, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(76, 50, 58, 20, 3, 3, 'FD');
      doc.setTextColor(100, 100, 100);
      doc.text('Total Egresos', 105, 57, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(redColor[0], redColor[1], redColor[2]);
      doc.text(`$${totalEgresos.toLocaleString()}`, 105, 66, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(138, 50, 58, 20, 3, 3, 'FD');
      doc.setTextColor(100, 100, 100);
      doc.text('Balance', 167, 57, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.text(`$${balance.toLocaleString()}`, 167, 66, { align: 'center' });

      let y = 80;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Detalle de Transacciones', 14, y);
      
      y += 8;
      
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Fecha', 16, y + 5);
      doc.text('Tipo', 40, y + 5);
      doc.text('Categoría', 65, y + 5);
      doc.text('Descripción', 100, y + 5);
      doc.text('Monto', 176, y + 5, { align: 'right' });

      y += 10;

      doc.setFont('helvetica', 'normal');
      const maxTransactions = Math.min(filteredTransactions.length, 20);
      
      for (let i = 0; i < maxTransactions; i++) {
        const t = filteredTransactions[i];
        
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 253);
          doc.rect(14, y - 3, 182, 7, 'F');
        }

        doc.setTextColor(0, 0, 0);
        doc.text(t.date, 16, y + 2);

        if (t.type === 'ingreso') {
          doc.setFillColor(209, 250, 229);
          doc.setTextColor(6, 95, 70);
        } else {
          doc.setFillColor(254, 226, 226);
          doc.setTextColor(153, 27, 27);
        }
        doc.roundedRect(38, y - 2, 18, 5, 1, 1, 'F');
        doc.setFontSize(7);
        doc.text(t.type === 'ingreso' ? 'Ingreso' : 'Egreso', 47, y + 1.5, { align: 'center' });
        doc.setFontSize(8);

        doc.setTextColor(0, 0, 0);
        doc.text(t.category.substring(0, 20), 65, y + 2);

        const desc = t.description.length > 30 ? t.description.substring(0, 27) + '...' : t.description;
        doc.setTextColor(71, 85, 105);
        doc.text(desc, 100, y + 2);

        doc.setFont('helvetica', 'bold');
        if (t.type === 'ingreso') {
          doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.text(`+$${t.amount.toLocaleString()}`, 194, y + 2, { align: 'right' });
        } else {
          doc.setTextColor(redColor[0], redColor[1], redColor[2]);
          doc.text(`-$${t.amount.toLocaleString()}`, 194, y + 2, { align: 'right' });
        }
        doc.setFont('helvetica', 'normal');

        y += 7;
        
        if (y > 270) break;
      }

      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Total de transacciones mostradas: ${maxTransactions} de ${filteredTransactions.length}`, 105, 285, { align: 'center' });
      doc.text('Molino Campestre Rio Bravo - Sistema de Gestión Integral', 105, 290, { align: 'center' });

      const fileName = `transacciones_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar transacción..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => exportToCSV(transactions)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-700 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            title="Exportar a Excel"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 border border-red-700 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            title="Exportar a PDF"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nuevo
          </button>
        </div>
      </div>

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
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{t.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{t.category}</td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      <div title={t.description}>{t.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      {t.attachments && t.attachments.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {t.attachments.map((att, idx) => (
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
                    <td className="px-6 py-4">{t.user}</td>
                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.type === 'egreso' ? '-' : '+'}${t.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* ✅ AJUSTE 4: ELIMINAR CONDICIÓN {onUpdate &&} */}
                        <button
                          onClick={() => openEditModal(t)}
                          className="text-slate-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(t.id)}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No se encontraron transacciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Agregar/Editar Transacción */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">
                {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="ingreso">Ingreso (+)</option>
                    <option value="egreso">Egreso (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Monto ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Categoría</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Ventas, Alquiler, Compras..."
                  required
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none"
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
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                        <span className="truncate max-w-[200px] flex items-center gap-1">
                          {att.type.includes('image') ? <ImageIcon size={12}/> : <FileText size={12}/>}
                          {att.name}
                        </span>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="text-red-400 hover:text-red-600">
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Detalle</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción adicional..."
                  rows={3}
                  className="w-full rounded-lg border-slate-200 border p-2 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/30"
                >
                  {editingTransaction ? 'Guardar Cambios' : 'Guardar Transacción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};