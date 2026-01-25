import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, User, Attachment } from '../types';
import { Plus, Trash2, Search, FileDown, Printer, Paperclip, FileText, Image as ImageIcon, X } from 'lucide-react';
import { exportToCSV, fileToBase64 } from '../services/dataService';

interface TransactionListProps {
  transactions: Transaction[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  users: User[];
  currentUser: User;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onAdd, onDelete, users, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      // Limit size to ~1MB for demo purposes
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      date,
      type,
      amount: parseFloat(amount),
      category,
      description,
      user: currentUser.name, // Logged in user
      attachments: attachments.length > 0 ? attachments : undefined
    });
    setIsModalOpen(false);
    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setAttachments([]);
  };

  const handlePrint = () => {
    window.print();
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
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button 
             onClick={handlePrint}
             className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
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
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
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

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Nueva Transacción</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
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
                  Guardar Transacción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};