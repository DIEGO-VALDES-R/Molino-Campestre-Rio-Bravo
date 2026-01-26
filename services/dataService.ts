import { supabase } from './supabaseClient';
import { 
  Transaction, 
  Note, 
  User, 
  DocumentFile, 
  AuditLog,
  ClienteInteresado,
  ClienteActual,
  PagoCliente,
  EgresoFuturo
} from '../types';

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
    const [
      txRes, 
      notesRes, 
      usersRes, 
      docsRes, 
      logsRes,
      clientesInteresadosRes,
      clientesActualesRes,
      pagosRes,
      egresosFuturosRes
    ] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + pageSize - 1),
      supabase.from('clientes_interesados').select('*').order('fecha_contacto', { ascending: false }),
      supabase.from('clientes_actuales').select('*').order('created_at', { ascending: false }),
      supabase.from('pagos_clientes').select('*').order('fecha_pago', { ascending: false }),
      supabase.from('egresos_futuros').select('*').order('fecha', { ascending: true }),
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
      logs: (logsRes.data as any[] || []).map(l => ({
        id: l.id,
        date: l.date,
        userId: l.user_id,
        userName: l.user_name,
        action: l.action,
        details: l.details
      })),
      totalLogs: logsRes.count || 0,
      // Nuevas entidades
      clientesInteresados: (clientesInteresadosRes.data as any[] || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email,
        telefono: c.telefono,
        fechaContacto: c.fecha_contacto,
        notas: c.notas,
        estado: c.estado,
        createdAt: c.created_at
      })),
      clientesActuales: (clientesActualesRes.data as any[] || []).map(c => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email,
        telefono: c.telefono,
        numeroLote: c.numero_lote,
        valorLote: c.valor_lote,
        depositoInicial: c.deposito_inicial,
        saldoRestante: c.saldo_restante,
        numeroCuotas: c.numero_cuotas,
        valorCuota: c.valor_cuota,
        saldoFinal: c.saldo_final,
        formaPagoInicial: c.forma_pago_inicial,
        formaPagoCuotas: c.forma_pago_cuotas,
        documentoCompraventa: c.documento_compraventa,
        estado: c.estado,
        createdAt: c.created_at
      })),
      pagosClientes: (pagosRes.data as any[] || []).map(p => ({
        id: p.id,
        clienteId: p.cliente_id,
        fechaPago: p.fecha_pago,
        monto: p.monto,
        tipoPago: p.tipo_pago,
        formaPago: p.forma_pago,
        documentoAdjunto: p.documento_adjunto,
        notas: p.notas,
        createdAt: p.created_at
      })),
      egresosFuturos: (egresosFuturosRes.data as any[] || []).map(e => ({
        id: e.id,
        fecha: e.fecha,
        tipo: e.tipo,
        categoria: e.categoria,
        descripcion: e.descripcion,
        monto: e.monto,
        usuario: e.usuario,
        adjuntos: e.adjuntos,
        estado: e.estado,
        createdAt: e.created_at
      })),
    };
  } catch (error) {
    console.error("Error fetching data from Supabase", error);
    return { 
      transactions: [], 
      notes: [], 
      users: [], 
      documents: [], 
      logs: [], 
      totalLogs: 0,
      clientesInteresados: [],
      clientesActuales: [],
      pagosClientes: [],
      egresosFuturos: []
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

// --- Logs ---

export const apiCreateLog = async (log: AuditLog) => {
  if (!supabase) {
    console.error("❌ Supabase no está inicializado");
    return;
  }

  try {
    console.log("📝 Intentando guardar log:", log);
    
    const payload = {
      id: log.id,
      date: log.date,
      user_id: log.userId,
      user_name: log.userName,
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

// ==================== CLIENTES ====================

export const apiCreateClienteInteresado = async (cliente: ClienteInteresado) => {
  const payload = {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    fecha_contacto: cliente.fechaContacto,
    notas: cliente.notas,
    estado: cliente.estado,
    created_at: cliente.createdAt
  };
  const { error } = await supabase.from('clientes_interesados').insert([payload]);
  if (error) throw error;
};

export const apiDeleteClienteInteresado = async (id: string) => {
  const { error } = await supabase.from('clientes_interesados').delete().eq('id', id);
  if (error) throw error;
};

export const apiUpdateClienteInteresadoEstado = async (id: string, estado: 'activo' | 'convertido' | 'descartado') => {
  const { error } = await supabase.from('clientes_interesados').update({ estado }).eq('id', id);
  if (error) throw error;
};

export const apiCreateClienteActual = async (cliente: ClienteActual) => {
  const payload = {
    id: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    numero_lote: cliente.numeroLote,
    valor_lote: cliente.valorLote,
    deposito_inicial: cliente.depositoInicial,
    saldo_restante: cliente.saldoRestante,
    numero_cuotas: cliente.numeroCuotas,
    valor_cuota: cliente.valorCuota,
    saldo_final: cliente.saldoFinal,
    forma_pago_inicial: cliente.formaPagoInicial,
    forma_pago_cuotas: cliente.formaPagoCuotas,
    documento_compraventa: cliente.documentoCompraventa,
    estado: cliente.estado,
    created_at: cliente.createdAt
  };
  const { error } = await supabase.from('clientes_actuales').insert([payload]);
  if (error) throw error;
};

export const apiDeleteClienteActual = async (id: string) => {
  const { error } = await supabase.from('clientes_actuales').delete().eq('id', id);
  if (error) throw error;
};

export const apiCreatePagoCliente = async (pago: PagoCliente) => {
  const payload = {
    id: pago.id,
    cliente_id: pago.clienteId,
    fecha_pago: pago.fechaPago,
    monto: pago.monto,
    tipo_pago: pago.tipoPago,
    forma_pago: pago.formaPago,
    documento_adjunto: pago.documentoAdjunto,
    notas: pago.notas,
    created_at: pago.createdAt
  };
  const { error } = await supabase.from('pagos_clientes').insert([payload]);
  if (error) throw error;
};

// ==================== EGRESOS FUTUROS ====================

export const apiCreateEgresoFuturo = async (egreso: EgresoFuturo) => {
  const payload = {
    id: egreso.id,
    fecha: egreso.fecha,
    tipo: egreso.tipo,
    categoria: egreso.categoria,
    descripcion: egreso.descripcion,
    monto: egreso.monto,
    usuario: egreso.usuario,
    adjuntos: egreso.adjuntos,
    estado: egreso.estado,
    created_at: egreso.createdAt
  };
  const { error } = await supabase.from('egresos_futuros').insert([payload]);
  if (error) throw error;
};

export const apiDeleteEgresoFuturo = async (id: string) => {
  const { error } = await supabase.from('egresos_futuros').delete().eq('id', id);
  if (error) throw error;
};

export const apiUpdateEgresoFuturoEstado = async (id: string, estado: 'pendiente' | 'pagado' | 'cancelado') => {
  const { error } = await supabase.from('egresos_futuros').update({ estado }).eq('id', id);
  if (error) throw error;
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