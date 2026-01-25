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

export const fetchAllData = async () => {
  try {
    const [txRes, notesRes, usersRes, docsRes, logsRes] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('date', { ascending: false }).limit(100),
    ]);

    return {
      transactions: (txRes.data as Transaction[]) || [],
      notes: (notesRes.data as any[] || []).map(n => ({...n, createdAt: n.created_at})), // map snake_case to camelCase if needed, but keeping simple
      users: (usersRes.data as User[]) || [],
      documents: (docsRes.data as any[] || []).map(d => ({...d, uploadedAt: d.uploaded_at, uploadedBy: d.uploaded_by})),
      logs: (logsRes.data as AuditLog[]) || [],
    };
  } catch (error) {
    console.error("Error fetching data from Supabase", error);
    return { transactions: [], notes: [], users: [], documents: [], logs: [] };
  }
};

// --- Transactions ---

export const apiCreateTransaction = async (transaction: Transaction) => {
  const { id, ...data } = transaction; // Let DB generate ID if desired, or pass it. 
  // Supabase usually generates UUIDs, but our frontend generates them. We can send the ID.
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

// --- Logs ---

export const apiCreateLog = async (log: AuditLog) => {
  const { error } = await supabase.from('audit_logs').insert([log]);
  if (error) console.error("Error logging", error);
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