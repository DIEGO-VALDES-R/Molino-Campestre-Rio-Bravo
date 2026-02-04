import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Plus, CheckCircle2, Clock, Trash2, Tag, Square, CheckSquare, Mic, MicOff, FileDown, Edit2, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface NotesManagerProps {
  notes: Note[];
  onAdd: (n: Omit<Note, 'id' | 'createdAt'>) => void;
  onEdit: (id: string, updates: Partial<Note>) => Promise<void>; // ✅ NUEVO
  onUpdateStatus: (id: string, status: 'futuro' | 'tratado') => void;
  onDelete: (id: string) => void;
}

export const NotesManager: React.FC<NotesManagerProps> = ({ 
  notes, 
  onAdd, 
  onEdit, // ✅ NUEVO
  onUpdateStatus, 
  onDelete 
}) => {
  const [newNote, setNewNote] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [category, setCategory] = useState<Note['category']>('General');
  const [initialStatus, setInitialStatus] = useState<'futuro' | 'tratado'>('futuro');
  
  // ✅ NUEVO: Estados para edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<Note['category']>('General');
  const [editingIsRecording, setEditingIsRecording] = useState(false);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const editRecognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (editRecognitionRef.current) {
        editRecognitionRef.current.stop();
      }
    };
  }, []);

  // ✅ NUEVO: Función para abrir modal de edición
  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setIsEditModalOpen(true);
  };

  // ✅ NUEVO: Función para cerrar modal de edición
  const closeEditModal = () => {
    setEditingNote(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('General');
    setEditingIsRecording(false);
    setIsEditModalOpen(false);
    if (editRecognitionRef.current) {
      editRecognitionRef.current.stop();
    }
  };

  // ✅ NUEVO: Función para guardar edición
  const handleEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingNote || !editTitle.trim()) {
      alert('El título es requerido');
      return;
    }

    try {
      await onEdit(editingNote.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
      });
      closeEditModal();
    } catch (error) {
      console.error('Error editando nota:', error);
      alert('Error al editar la nota');
    }
  };

  // ✅ NUEVO: Toggle de grabación para modal de edición
  const toggleEditRecording = () => {
    if (editingIsRecording) {
      if (editRecognitionRef.current) {
        editRecognitionRef.current.stop();
      }
      setEditingIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Su navegador no soporta reconocimiento de voz. Por favor, intente usar Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setEditContent(prev => {
        const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Error de reconocimiento de voz:", event.error);
      if (event.error === 'not-allowed') {
        alert("Acceso al micrófono denegado. Por favor, permita el acceso al micrófono en su navegador para usar el dictado por voz.");
      }
      setEditingIsRecording(false);
    };

    recognition.onend = () => {
      setEditingIsRecording(false);
    };

    editRecognitionRef.current = recognition;
    recognition.start();
    setEditingIsRecording(true);
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Su navegador no soporta reconocimiento de voz. Por favor, intente usar Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setNewNote(prev => {
        const spacer = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
        return prev + spacer + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error("Error de reconocimiento de voz:", event.error);
      if (event.error === 'not-allowed') {
        alert("Acceso al micrófono denegado. Por favor, permita el acceso al micrófono en su navegador para usar el dictado por voz.");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    
    onAdd({
      title: newNoteTitle,
      content: newNote,
      status: initialStatus,
      category: category
    });

    setNewNoteTitle('');
    setNewNote('');
    setCategory('General');
    setInitialStatus('futuro');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(14, 165, 233);
    doc.text("Reporte de Temas y Notas", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de reporte: ${new Date().toLocaleDateString()}`, 14, 28);

    // Data preparation
    const tableData = notes.map(note => [
      note.title,
      note.status.toUpperCase(),
      note.category,
      new Date(note.createdAt).toLocaleDateString(),
      note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '')
    ]);

    // Summary stats
    const total = notes.length;
    const tratados = notes.filter(n => n.status === 'tratado').length;
    const futuros = notes.filter(n => n.status === 'futuro').length;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Resumen: ${total} Temas | ${tratados} Tratados (Cumplidos) | ${futuros} Futuros (Pendientes)`, 14, 40);

    // Table
    (doc as any).autoTable({
      startY: 45,
      head: [['Título', 'Estado', 'Categoría', 'Fecha', 'Contenido']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save('reporte_temas.pdf');
  };

  const futureNotes = notes.filter(n => n.status === 'futuro');
  const treatedNotes = notes.filter(n => n.status === 'tratado');

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'Financiero': return 'bg-emerald-100 text-emerald-700';
      case 'Operativo': return 'bg-blue-100 text-blue-700';
      case 'Urgente': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-140px)]">
      {/* Create Column */}
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 overflow-y-auto">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-brand-500" />
          Nueva Nota
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Título</label>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Ej: Revisar presupuesto anual"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tipo de Tema</label>
            <div className="grid grid-cols-2 gap-2">
              {['General', 'Operativo', 'Financiero', 'Urgente'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat as any)}
                  className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                    category === cat 
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Destino Inicial</label>
            <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status" 
                  checked={initialStatus === 'futuro'} 
                  onChange={() => setInitialStatus('futuro')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="text-sm text-slate-700 font-medium">Temas Futuros</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status" 
                  checked={initialStatus === 'tratado'} 
                  onChange={() => setInitialStatus('tratado')}
                  className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span className="text-sm text-slate-700 font-medium">Temas Tratados</span>
              </label>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Contenido</label>
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                  isRecording 
                    ? 'bg-red-100 text-red-600 animate-pulse ring-1 ring-red-500' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                {isRecording ? 'Detener Voz' : 'Dictar por Voz'}
              </button>
            </div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className={`w-full h-full min-h-[100px] p-3 rounded-lg border focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-colors ${
                isRecording ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
              }`}
              placeholder={isRecording ? "Escuchando... Hable ahora." : "Detalles del tema a tratar..."}
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="submit"
              className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Agregar Nota
            </button>
            <button
              type="button"
              onClick={exportToPDF}
              className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center justify-center"
              title="Exportar Reporte PDF"
            >
              <FileDown size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Future Column */}
      <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-4 overflow-hidden">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 px-2">
          <Clock className="w-5 h-5 text-orange-500" />
          Temas Futuros
          <span className="ml-auto bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{futureNotes.length}</span>
        </h3>
        <div className="overflow-y-auto space-y-3 pr-2 flex-1">
          {futureNotes.map(note => (
            <div key={note.id} className="group bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:border-orange-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-1 ${getCategoryColor(note.category)}`}>
                    {note.category}
                  </span>
                  <h4 className="font-semibold text-slate-800">{note.title}</h4>
                </div>
                <div className="flex gap-2">
                  {/* ✅ NUEVO: Botón Editar */}
                  <button 
                    onClick={() => openEditModal(note)}
                    className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar nota"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(note.id, 'tratado')}
                    className="text-slate-300 hover:text-emerald-500 transition-colors"
                    title="Marcar como cumplido"
                  >
                    <Square size={20} />
                  </button>
                  <button 
                    onClick={() => onDelete(note.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
              <span className="text-xs text-slate-400 mt-3 block">{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {futureNotes.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No hay temas pendientes</p>}
        </div>
      </div>

      {/* Treated Column */}
      <div className="lg:col-span-1 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-4 overflow-hidden">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 px-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Temas Tratados
          <span className="ml-auto bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{treatedNotes.length}</span>
        </h3>
        <div className="overflow-y-auto space-y-3 pr-2 flex-1">
          {treatedNotes.map(note => (
            <div key={note.id} className="group bg-white p-4 rounded-lg shadow-sm border border-slate-100 opacity-75 hover:opacity-100 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-1 ${getCategoryColor(note.category)}`}>
                    {note.category}
                  </span>
                  <h4 className="font-semibold text-slate-800 line-through decoration-slate-400">{note.title}</h4>
                </div>
                <div className="flex gap-2">
                  {/* ✅ NUEVO: Botón Editar */}
                  <button 
                    onClick={() => openEditModal(note)}
                    className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar nota"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => onUpdateStatus(note.id, 'futuro')}
                    className="text-emerald-500 hover:text-slate-400 transition-colors"
                    title="Marcar como pendiente"
                  >
                    <CheckSquare size={20} />
                  </button>
                  <button 
                    onClick={() => onDelete(note.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">{note.content}</p>
              <span className="text-xs text-slate-400 mt-3 block">Finalizado el {new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {treatedNotes.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No hay temas tratados aún</p>}
        </div>
      </div>

      {/* ✅ NUEVO: MODAL: Editar Nota */}
      {isEditModalOpen && editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-900">Editar Nota</h3>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditNote} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título de la nota..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Operativo">Operativo</option>
                    <option value="Financiero">Financiero</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Contenido
                  </label>
                  <button
                    type="button"
                    onClick={toggleEditRecording}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                      editingIsRecording 
                        ? 'bg-red-100 text-red-600 animate-pulse ring-1 ring-red-500' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {editingIsRecording ? <MicOff size={14} /> : <Mic size={14} />}
                    {editingIsRecording ? 'Detener Voz' : 'Dictar por Voz'}
                  </button>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Detalles..."
                  rows={8}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-colors ${
                    editingIsRecording ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};