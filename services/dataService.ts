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

// Helper to convert file to Base64
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

// ==================== CLIENTES INTERESADOS ====================

export const getAllClientesInteresados = async (): Promise<ClienteInteresado[]> => {
  try {
    const { data, error } = await supabase
      .from('clientes_interesados')
      .select('*')
      .order('fecha_contacto', { ascending: false });

    if (error) {
      console.warn('Error fetching clientes interesados:', error.message);
      return [];
    }

    return (data as any[] || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      fechaContacto: c.fecha_contacto,
      notas: c.notas,
      estado: c.estado,
      createdAt: c.created_at
    }));
  } catch (error) {
    console.error('Error in getAllClientesInteresados:', error);
    return [];
  }
};

export const createClienteInteresado = async (cliente: ClienteInteresado): Promise<ClienteInteresado> => {
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

  const { data, error } = await supabase.from('clientes_interesados').insert([payload]).select();
  
  if (error) throw new Error('Failed to create cliente interesado');
  
  const c = (data as any[])?.[0];
  return {
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    fechaContacto: c.fecha_contacto,
    notas: c.notas,
    estado: c.estado,
    createdAt: c.created_at
  };
};

export const updateClienteInteresado = async (id: string, updates: Partial<ClienteInteresado>): Promise<ClienteInteresado> => {
  const payload: any = {};
  
  if (updates.nombre !== undefined) payload.nombre = updates.nombre;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.telefono !== undefined) payload.telefono = updates.telefono;
  if (updates.fechaContacto !== undefined) payload.fecha_contacto = updates.fechaContacto;
  if (updates.notas !== undefined) payload.notas = updates.notas;
  if (updates.estado !== undefined) payload.estado = updates.estado;

  const { data, error } = await supabase
    .from('clientes_interesados')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw new Error('Failed to update cliente interesado');
  
  const c = (data as any[])?.[0];
  return {
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    fechaContacto: c.fecha_contacto,
    notas: c.notas,
    estado: c.estado,
    createdAt: c.created_at
  };
};

export const deleteClienteInteresado = async (id: string): Promise<void> => {
  const { error } = await supabase.from('clientes_interesados').delete().eq('id', id);
  if (error) throw new Error('Failed to delete cliente interesado');
};

// ==================== CONVERSIÓN A CLIENTE ACTUAL ====================

export const convertInteresadoToActual = async (
  interesadoId: string,
  clienteData: Omit<ClienteActual, 'id' | 'createdAt'>
): Promise<ClienteActual> => {
  try {
    // 1. Crear cliente actual
    const nuevoCliente: ClienteActual = {
      id: crypto.randomUUID(),
      ...clienteData,
      createdAt: new Date().toISOString()
    };

    const payload = {
      id: nuevoCliente.id,
      nombre: nuevoCliente.nombre,
      email: nuevoCliente.email,
      telefono: nuevoCliente.telefono,
      numero_lote: nuevoCliente.numeroLote,
      valor_lote: nuevoCliente.valorLote,
      deposito_inicial: nuevoCliente.depositoInicial,
      saldo_restante: nuevoCliente.saldoRestante,
      numero_cuotas: nuevoCliente.numeroCuotas,
      valor_cuota: nuevoCliente.valorCuota,
      saldo_final: nuevoCliente.saldoFinal,
      forma_pago_inicial: nuevoCliente.formaPagoInicial,
      forma_pago_cuotas: nuevoCliente.formaPagoCuotas,
      documento_compraventa: nuevoCliente.documentoCompraventa,
      estado: nuevoCliente.estado,
      created_at: nuevoCliente.createdAt
    };

    const { error: insertError } = await supabase
      .from('clientes_actuales')
      .insert([payload]);

    if (insertError) throw insertError;

    // 2. Marcar como convertido en clientes_interesados
    const { error: updateError } = await supabase
      .from('clientes_interesados')
      .update({ estado: 'convertido' })
      .eq('id', interesadoId);

    if (updateError) throw updateError;

    return nuevoCliente;
  } catch (error) {
    throw new Error('Failed to convert cliente');
  }
};

// ==================== CLIENTES ACTUALES ====================

export const getAllClientesActuales = async (): Promise<ClienteActual[]> => {
  try {
    const { data, error } = await supabase
      .from('clientes_actuales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching clientes actuales:', error.message);
      return [];
    }

    return (data as any[] || []).map(c => ({
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
    }));
  } catch (error) {
    console.error('Error in getAllClientesActuales:', error);
    return [];
  }
};

export const updateClienteActual = async (id: string, updates: Partial<ClienteActual>): Promise<ClienteActual> => {
  const payload: any = {};
  
  if (updates.nombre !== undefined) payload.nombre = updates.nombre;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.telefono !== undefined) payload.telefono = updates.telefono;
  if (updates.numeroLote !== undefined) payload.numero_lote = updates.numeroLote;
  if (updates.valorLote !== undefined) payload.valor_lote = updates.valorLote;
  if (updates.depositoInicial !== undefined) payload.deposito_inicial = updates.depositoInicial;
  if (updates.saldoRestante !== undefined) payload.saldo_restante = updates.saldoRestante;
  if (updates.numeroCuotas !== undefined) payload.numero_cuotas = updates.numeroCuotas;
  if (updates.valorCuota !== undefined) payload.valor_cuota = updates.valorCuota;
  if (updates.saldoFinal !== undefined) payload.saldo_final = updates.saldoFinal;
  if (updates.formaPagoInicial !== undefined) payload.forma_pago_inicial = updates.formaPagoInicial;
  if (updates.formaPagoCuotas !== undefined) payload.forma_pago_cuotas = updates.formaPagoCuotas;
  if (updates.documentoCompraventa !== undefined) payload.documento_compraventa = updates.documentoCompraventa;
  if (updates.estado !== undefined) payload.estado = updates.estado;

  const { data, error } = await supabase
    .from('clientes_actuales')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw new Error('Failed to update cliente actual');
  
  const c = (data as any[])?.[0];
  return {
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
  };
};

export const deleteClienteActual = async (id: string): Promise<void> => {
  // Eliminar primero los pagos asociados
  await supabase.from('pagos_clientes').delete().eq('cliente_id', id);
  
  // Luego eliminar el cliente
  const { error } = await supabase.from('clientes_actuales').delete().eq('id', id);
  if (error) throw new Error('Failed to delete cliente actual');
};

// ==================== PAGOS CLIENTES ====================

export const getAllPagosClientes = async (): Promise<PagoCliente[]> => {
  try {
    const { data, error } = await supabase
      .from('pagos_clientes')
      .select('*')
      .order('fecha_pago', { ascending: false });

    if (error) {
      console.warn('Error fetching pagos clientes:', error.message);
      return [];
    }

    return (data as any[] || []).map(p => ({
      id: p.id,
      clienteId: p.cliente_id,
      fechaPago: p.fecha_pago,
      monto: p.monto,
      tipoPago: p.tipo_pago,
      formaPago: p.forma_pago,
      documentoAdjunto: p.documento_adjunto,
      notas: p.notas,
      createdAt: p.created_at
    }));
  } catch (error) {
    console.error('Error in getAllPagosClientes:', error);
    return [];
  }
};

export const createPagoCliente = async (pago: PagoCliente): Promise<PagoCliente> => {
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

  const { data, error } = await supabase.from('pagos_clientes').insert([payload]).select();
  
  if (error) throw new Error('Failed to create pago cliente');
  
  const p = (data as any[])?.[0];
  return {
    id: p.id,
    clienteId: p.cliente_id,
    fechaPago: p.fecha_pago,
    monto: p.monto,
    tipoPago: p.tipo_pago,
    formaPago: p.forma_pago,
    documentoAdjunto: p.documento_adjunto,
    notas: p.notas,
    createdAt: p.created_at
  };
};

export const deletePagoCliente = async (id: string): Promise<void> => {
  const { error } = await supabase.from('pagos_clientes').delete().eq('id', id);
  if (error) throw new Error('Failed to delete pago cliente');
};

// ==================== EGRESOS FUTUROS ====================

export const getAllEgresosFuturos = async (): Promise<EgresoFuturo[]> => {
  try {
    const { data, error } = await supabase
      .from('egresos_futuros')
      .select('*')
      .order('fecha', { ascending: true });

    if (error) {
      console.warn('Error fetching egresos futuros:', error.message);
      return [];
    }

    return (data as any[] || []).map(e => ({
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
    }));
  } catch (error) {
    console.error('Error in getAllEgresosFuturos:', error);
    return [];
  }
};

export const createEgresoFuturo = async (egreso: EgresoFuturo): Promise<EgresoFuturo> => {
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

  const { data, error } = await supabase.from('egresos_futuros').insert([payload]).select();
  
  if (error) throw new Error('Failed to create egreso futuro');
  
  const e = (data as any[])?.[0];
  return {
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
  };
};

export const updateEgresoFuturo = async (id: string, updates: Partial<EgresoFuturo>): Promise<EgresoFuturo> => {
  const payload: any = {};
  
  if (updates.fecha !== undefined) payload.fecha = updates.fecha;
  if (updates.tipo !== undefined) payload.tipo = updates.tipo;
  if (updates.categoria !== undefined) payload.categoria = updates.categoria;
  if (updates.descripcion !== undefined) payload.descripcion = updates.descripcion;
  if (updates.monto !== undefined) payload.monto = updates.monto;
  if (updates.usuario !== undefined) payload.usuario = updates.usuario;
  if (updates.adjuntos !== undefined) payload.adjuntos = updates.adjuntos;
  if (updates.estado !== undefined) payload.estado = updates.estado;

  const { data, error } = await supabase
    .from('egresos_futuros')
    .update(payload)
    .eq('id', id)
    .select();

  if (error) throw new Error('Failed to update egreso futuro');
  
  const e = (data as any[])?.[0];
  return {
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
  };
};

export const deleteEgresoFuturo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('egresos_futuros').delete().eq('id', id);
  if (error) throw new Error('Failed to delete egreso futuro');
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