import React, { useRef, useState } from 'react';
import { DocumentFile, User } from '../types';
import { Upload, FileText, Image as ImageIcon, Trash2, Search, X } from 'lucide-react';
import { fileToBase64 } from '../services/dataService';

interface DocumentsViewProps {
  documents: DocumentFile[];
  onUpload: (doc: Omit<DocumentFile, 'id' | 'uploadedAt'>) => void;
  onDelete: (id: string) => void;
  currentUser: User;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ documents, onUpload, onDelete, currentUser }) => {
  const [filter, setFilter] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("El archivo es demasiado grande. Máximo 2MB.");
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        const category = prompt("Categoría del documento (ej. Facturas, Legal, Varios):", "Varios") || "Varios";
        
        onUpload({
          name: file.name,
          type: file.type,
          data: base64,
          uploadedBy: currentUser.name,
          category: category
        });
      } catch (err) {
        console.error("Error reading file", err);
      }
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(filter.toLowerCase()) || 
    doc.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative w-64">
           <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Buscar documentos..." 
             value={filter}
             onChange={e => setFilter(e.target.value)}
             className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
           />
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,application/pdf"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Upload size={18} /> Subir Documento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="group bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow relative">
             <div 
               className="h-32 bg-slate-100 flex items-center justify-center cursor-pointer"
               onClick={() => setSelectedDoc(doc)}
             >
               {doc.type.includes('image') ? (
                 <img src={doc.data} alt={doc.name} className="w-full h-full object-cover" />
               ) : (
                 <FileText size={48} className="text-slate-400" />
               )}
             </div>
             <div className="p-3">
               <p className="font-medium text-slate-800 text-sm truncate" title={doc.name}>{doc.name}</p>
               <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">{doc.category}</span>
                  <span className="text-[10px] text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
               </div>
               <p className="text-[10px] text-slate-400 mt-1 truncate">Por: {doc.uploadedBy}</p>
             </div>
             <button 
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
             >
               <Trash2 size={14} />
             </button>
          </div>
        ))}
      </div>
      
      {filteredDocs.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No hay documentos guardados</p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-4xl w-full h-[80vh] bg-white rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">{selectedDoc.name}</h3>
              <div className="flex gap-2">
                 <a 
                   href={selectedDoc.data} 
                   download={selectedDoc.name}
                   className="px-3 py-1 bg-brand-100 text-brand-700 rounded text-sm hover:bg-brand-200"
                 >
                   Descargar
                 </a>
                 <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-slate-100 rounded">
                   <X size={24} />
                 </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {selectedDoc.type.includes('image') ? (
                <img src={selectedDoc.data} alt={selectedDoc.name} className="max-w-full max-h-full shadow-lg" />
              ) : (
                 <iframe src={selectedDoc.data} className="w-full h-full bg-white shadow-lg" title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
