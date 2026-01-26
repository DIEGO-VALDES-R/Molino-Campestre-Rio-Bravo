import { supabase } from './supabaseClient';
import { Transaction, Note, User, DocumentFile, AuditLog } from '../types';

// Helper to convert file to Base64 (kept for UI utility)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- Fetch Data ---

export const fetchAllData = async (pageSize = 100, offset = 0) => {
  try {
    const [txRes, notesRes, usersRes, docsRes, logsRes] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);

    return {
      transactions: (txRes.data as Transaction[]) || [],
      notes: (notesRes.data as any[] || []).map(n => ({...n, createdAt: n.created_at})), 
      users: (usersRes.data as User[]) || [],
      documents: (docsRes.data as any[] || []).map(d => ({
        ...d, 
        uploadedAt: d.uploaded_at, 
        uploadedBy: d.uploaded_by
      })),
      // ✅ Mapear correctamente los logs (snake_case de DB a camelCase de UI)
      logs: (logsRes.data as any[] || []).map(l => ({
        id: l.id,
        date: l.date,
        userId: l.user_id,      // ← Cambio aquí
        userName: l.user_name,   // ← Cambio aquí
        action: l.action,
        details: l.details
      })),
      totalLogs: logsRes.count || 0,
    };
  } catch (error) {
    console.error("Error fetching data from Supabase", error);
    return { 
      transactions: [], 
      notes: [], 
      users: [], 
      documents: [], 
      logs: [], 
      totalLogs: 0 
    };
  }
};

// --- Transactions ---

export const apiCreateTransaction = async (transaction: Transaction) => {
  const { id, ...data } = transaction; 
  const { error } = await supabase.from('transactions').insert([transaction]);
  if (error) throw error;
};

export const apiDeleteTransaction = async (id: string) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

// --- Notes ---

export const apiCreateNote = async (note: Note) => {
  const payload = {
    id: note.id,
    title: note.title,
    content: note.content,
    status: note.status,
    category: note.category,
    created_at: note.createdAt
  };
  const { error } = await supabase.from('notes').insert([payload]);
  if (error) throw error;
};

export const apiUpdateNoteStatus = async (id: string, status: 'futuro' | 'tratado') => {
  const { error } = await supabase.from('notes').update({ status }).eq('id', id);
  if (error) throw error;
};

export const apiDeleteNote = async (id: string) => {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
};

// --- Users ---

export const apiCreateUser = async (user: User) => {
  const { error } = await supabase.from('users').insert([user]);
  if (error) throw error;
};

export const apiDeleteUser = async (id: string) => {
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};

// --- Documents ---

export const apiCreateDocument = async (doc: DocumentFile) => {
  const payload = {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    data: doc.data,
    uploaded_by: doc.uploadedBy,
    uploaded_at: doc.uploadedAt,
    category: doc.category
  };
  const { error } = await supabase.from('documents').insert([payload]);
  if (error) throw error;
};

export const apiDeleteDocument = async (id: string) => {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
};

// --- Logs (CORREGIDO) ---

export const apiCreateLog = async (log: AuditLog) => {
  if (!supabase) {
    console.error("❌ Supabase no está inicializado");
    return;
  }

  try {
    console.log("📝 Intentando guardar log:", log);
    
    // ✅ Mapear correctamente los nombres de columnas (camelCase UI a snake_case DB)
    const payload = {
      id: log.id,
      date: log.date,
      user_id: log.userId,      // ← Cambio aquí
      user_name: log.userName,   // ← Cambio aquí
      action: log.action,
      details: log.details
    };
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([payload])
      .select();
    
    if (error) {
      console.error("❌ Error al guardar log en Supabase:", error);
      throw error;
    }
    
    console.log("✅ Log guardado exitosamente:", data);
    return data;
  } catch (error) {
    console.error("❌ Error inesperado al guardar log:", error);
  }
};

// --- CSV Export (Frontend only) ---
export const exportToCSV = (transactions: Transaction[]) => {
  const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Monto', 'Usuario', 'Descripción'];
  const rows = transactions.map(t => [
    t.id,
    t.date,
    t.type,
    t.category,
    t.amount.toString(),
    t.user,
    `"${t.description.replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `molino_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};