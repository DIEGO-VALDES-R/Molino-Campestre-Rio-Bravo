import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  StickyNote, 
  Users as UsersIcon, 
  Bot, 
  Menu, 
  X,
  Plus,
  FileText,
  Activity,
  LogOut,
  Lock,
  UserCheck,
  Calendar,
  MapPin,
  Building2,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { NotesManager } from './components/NotesManager';
import { DocumentsView } from './components/DocumentsView';
import { AuditLogView } from './components/AuditLogView';
import ClientesView from './components/ClientesView';
import EgresosFuturosView from './components/EgresosFuturosView';
import MapaLotes from './components/MapaLotes';
import { GestionObrasView } from './components/GestionObrasView';
import { Obra, EtapaObra } from './obra-tipos';
import { Lote } from './types';
import PanelRecordatorios from './components/PanelRecordatorios';
import { 
  fetchAllData,
  apiCreateTransaction,
  apiUpdateTransaction,
  apiDeleteTransaction,
  apiCreateNote,
  apiUpdateNoteStatus,
  apiDeleteNote,
  apiCreateUser,
  apiDeleteUser,
  apiUpdateUser, // ← AGREGADO NECESARIO
  apiCreateDocument,
  apiDeleteDocument,
  apiCreateLog,
  getAllClientesInteresados,
  createClienteInteresado,
  updateClienteInteresado,
  deleteClienteInteresado,
  convertInteresadoToActual,
  getAllClientesActuales,
  createClienteActual,
  updateClienteActual,
  deleteClienteActual,
  getAllPagosClientes,
  createPagoCliente,
  deletePagoCliente,
  getAllEgresosFuturos,
  createEgresoFuturo,
  updateEgresoFuturo,
  deleteEgresoFuturo,
  getAllLotes,        
  createLote,
  updateLote,
  deleteLote,
  getAllObras,        
  createObra,
  updateObra,
  deleteObra
} from './services/dataService';
import { getFinancialAdvice } from './services/geminiService';
import { 
  Transaction, 
  Note, 
  User, 
  FinancialSummary, 
  DocumentFile, 
  AuditLog,
  ClienteInteresado,
  ClienteActual,
  PagoCliente,
  EgresoFuturo
} from './types';

const App = () => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'notes' | 'users' | 'documents' | 'logs' | 'clientes' | 'egresos-futuros' | 'lotes' | 'obras' | 'recordatorios'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [obras, setObras] = useState<Obra[]>([]);

  // --- Data ---
  const [data, setData] = useState<{
    transactions: Transaction[];
    notes: Note[];
    users: User[];
    documents: DocumentFile[];
    logs: AuditLog[];
    clientesInteresados: ClienteInteresado[];
    clientesActuales: ClienteActual[];
    pagosClientes: PagoCliente[];
    egresosFuturos: EgresoFuturo[];
    lotes: Lote[];
  }>({
    transactions: [],
    notes: [],
    users: [],
    documents: [],
    logs: [],
    clientesInteresados: [],
    clientesActuales: [],
    pagosClientes: [],
    egresosFuturos: [],
    lotes: []
  });

  // --- Initial Load ---
  useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      console.log('Iniciando carga de datos...');
      
      // Agregar esta línea con los demás await Promise.all
      const [basedData, clientesInt, clientesAct, pagos, egresos, lotes, obrasData] = await Promise.all([
        fetchAllData(),
        getAllClientesInteresados(),
        getAllClientesActuales(),
        getAllPagosClientes(),
        getAllEgresosFuturos(),
        getAllLotes(),
        getAllObras()
      ]);

      const nuevoData = {
        ...basedData,
        clientesInteresados: clientesInt || [],
        clientesActuales: clientesAct || [],
        pagosClientes: pagos || [],
        egresosFuturos: egresos || [],
        lotes: lotes || []
      };

      setData(nuevoData);
      setObras(obrasData || []);  
      
    } catch (error) {
      console.error('Error loading data:', error);
      setData(prev => ({
        ...prev,
        clientesInteresados: [],
        clientesActuales: [],
        pagosClientes: [],
        egresosFuturos: [],
        lotes: []
      }));
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);

  // --- Computed ---
  const summary: FinancialSummary = useMemo(() => {
    const totalIncome = data.transactions
      .filter(t => t.type === 'ingreso')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = data.transactions
      .filter(t => t.type === 'egreso')
      .reduce((acc, curr) => acc + curr.amount, 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [data.transactions]);

  // --- Logging Helper ---
  const logAction = async (action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      details
    };
    setData(prev => ({ ...prev, logs: [newLog, ...prev.logs] }));
    await apiCreateLog(newLog);
  };

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dbUser = data.users.find(u => u.name === loginEmail || u.email === loginEmail);
    
    if (dbUser) {
      if (dbUser.password === loginPassword || (!dbUser.password && loginPassword === '')) {
        setCurrentUser(dbUser);
        setAuthError('');
        return;
      } else {
        setAuthError('Contraseña incorrecta');
        return;
      }
    }

    if ((loginEmail === 'Administrador' || loginEmail === 'admin') && loginPassword === 'admin') {
       const demoUser: User = {
         id: 'demo-admin-id',
         name: 'Administrador',
         role: 'admin',
         email: 'admin@molino.com'
       };
       setCurrentUser(demoUser);
       setAuthError('');
       return;
    }

    setAuthError('Usuario no encontrado');
  };

  const handleRecoverPassword = () => {
    const email = prompt("Ingrese su correo electrónico o nombre de usuario:");
    if (!email) return;
    const user = data.users.find(u => u.name === email || u.email === email);
    if (user) {
      alert(`Simulación de recuperación: Se ha enviado un correo a ${user.email || 'correo registrado'}.`);
    } else {
      alert("Usuario no encontrado.");
    }
  };

  const handleLogout = () => {
    logAction("Cierre de sesión", "El usuario cerró sesión");
    setCurrentUser(null);
    setActiveTab('dashboard');
    setLoginEmail('');
    setLoginPassword('');
  };

  const addTransaction = async (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...t, id: crypto.randomUUID() };
    setData(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
    try {
      await apiCreateTransaction(newTransaction);
      logAction("Crear Transacción", `${t.type.toUpperCase()} de $${t.amount} - ${t.category}`);
    } catch (e) {
      console.error(e);
      alert("Error guardando en base de datos");
    }
  };

  const deleteTransaction = async (id: string) => {
    if(window.confirm('¿Seguro que desea eliminar esta transacción?')) {
      const tx = data.transactions.find(t => t.id === id);
      setData(prev => ({ ...prev, transactions: prev.transactions.filter(t => t.id !== id) }));
      try {
        await apiDeleteTransaction(id);
        logAction("Eliminar Transacción", tx ? `ID: ${tx.id} - ${tx.amount}` : id);
      } catch (e) {
        console.error(e);
        alert("Error eliminando de base de datos");
      }
    }
  };

  const addNote = async (n: Omit<Note, 'id' | 'createdAt'>) => {
    const newNote: Note = { 
      ...n, 
      id: crypto.randomUUID(), 
      createdAt: new Date().toISOString() 
    };
    setData(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
    try {
      await apiCreateNote(newNote);
      logAction("Crear Nota", `Título: ${n.title} - ${n.category}`);
    } catch (e) {
      console.error(e);
    }
  };


  const updateNoteStatus = async (id: string, status: 'futuro' | 'tratado') => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, status } : n)
    }));
    try {
      await apiUpdateNoteStatus(id, status);
      logAction("Actualizar Nota", `Nota ${id} cambiada a ${status}`);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (id: string) => {
     setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
     try {
       await apiDeleteNote(id);
       logAction("Eliminar Nota", `Nota eliminada: ${id}`);
     } catch (e) {
       console.error(e);
     }
  };

// ✅ NUEVO: Handler para editar notas
const editNote = async (id: string, updates: Partial<Note>) => {
  setData(prev => ({
    ...prev,
    notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n)
  }));
  try {
    // Aquí irría la llamada a API si existe
    // await apiUpdateNote(id, updates);
    logAction("Editar Nota", `ID: ${id} - Actualizada`);
  } catch (e) {
    console.error(e);
    alert("Error actualizando nota");
  }
};

  const addUser = async (name: string, pass: string, email: string) => {
    const newUser: User = { 
      id: crypto.randomUUID(), 
      name, 
      role: 'viewer', 
      password: pass, 
      email 
    };
    setData(prev => ({ ...prev, users: [...prev.users, newUser] }));
    try {
      await apiCreateUser(newUser);
      logAction("Crear Usuario", `Usuario agregado: ${name}`);
    } catch (e) {
      console.error(e);
    }
  };
  
  const deleteUser = async (id: string) => {
      const user = data.users.find(u => u.id === id);
      setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
      try {
        await apiDeleteUser(id);
        logAction("Eliminar Usuario", `Usuario eliminado: ${user?.name}`);
      } catch (e) {
        console.error(e);
      }
  };

  // --- NUEVAS FUNCIONES PARA CONTRASEÑAS ---
  const updateUserPassword = async (userId: string, newPass: string) => {
    if (!newPass || newPass.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      // Actualizar en el estado local
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === userId ? { ...u, password: newPass } : u)
      }));

      // Actualizar en la base de datos
      await apiUpdateUser(userId, { password: newPass });
      
      await logAction('Cambio de contraseña', `Admin cambió contraseña de usuario ${changingPasswordUser?.name}`);
      
      alert('✅ Contraseña actualizada exitosamente');
      
      // Limpiar formulario
      setChangingPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('❌ Error al cambiar contraseña');
    }
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('⚠️ Las contraseñas no coinciden');
      return;
    }
    
    if (!changingPasswordUser) return;
    
    updateUserPassword(changingPasswordUser.id, newPassword);
  };
  // ----------------------------------------

  const addDocument = async (doc: Omit<DocumentFile, 'id' | 'uploadedAt'>) => {
    const newDoc: DocumentFile = {
      ...doc,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, documents: [newDoc, ...prev.documents] }));
    try {
      await apiCreateDocument(newDoc);
      logAction("Subir Documento", `Archivo: ${doc.name} (${doc.category})`);
    } catch (e) {
      console.error(e);
      alert("Error subiendo documento. Verifique el tamaño.");
    }
  };

  const deleteDocument = async (id: string) => {
    if (window.confirm("¿Eliminar este documento?")) {
      const doc = data.documents.find(d => d.id === id);
      setData(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
      try {
        await apiDeleteDocument(id);
        logAction("Eliminar Documento", `Archivo: ${doc?.name}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    const advice = await getFinancialAdvice(data.transactions, data.notes, summary);
    setAiAnalysis(advice);
    setIsAnalyzing(false);
    logAction("Consulta IA", "Se solicitó análisis financiero");
  };

  // --- Handlers para Clientes ---
  // DESPUÉS
const handleAddClienteInteresado = async (cliente: Omit<ClienteInteresado, 'id' | 'createdAt'>) => {
  const nuevoCliente: ClienteInteresado = {
    ...cliente,
    id: crypto.randomUUID(),
    estado: cliente.estado || 'activo',
    fechaContacto: cliente.fechaContacto || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  setData(prev => ({ ...prev, clientesInteresados: [nuevoCliente, ...prev.clientesInteresados] }));
  try {
    await createClienteInteresado(nuevoCliente);
    logAction('Agregar cliente interesado', `Cliente: ${cliente.nombre}`);
  } catch (e) {
    console.error('Error guardando cliente interesado:', e);
    alert(`Error guardando cliente: ${(e as Error).message}`);
  }
};

  const handleConvertToClienteActual = async (
    interesadoId: string,
    clienteData: Omit<ClienteActual, 'id' | 'createdAt'>
  ) => {
    try {
      const nuevoCliente = await convertInteresadoToActual(interesadoId, clienteData);
      setData(prev => ({
        ...prev,
        clientesInteresados: prev.clientesInteresados.filter(c => c.id !== interesadoId),
        clientesActuales: [nuevoCliente, ...prev.clientesActuales]
      }));
      logAction('Convertir cliente', `${clienteData.nombre} - Lote ${clienteData.numeroLote}`);
    } catch (e) {
      console.error(e);
      alert('Error convirtiendo cliente');
    }
  };

  const handleUpdateClienteInteresado = async (id: string, updates: Partial<ClienteInteresado>) => {
    setData(prev => ({
      ...prev,
      clientesInteresados: prev.clientesInteresados.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
    try {
      await updateClienteInteresado(id, updates);
      logAction('Actualizar cliente interesado', `ID: ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClienteInteresado = async (id: string) => {
    setData(prev => ({ ...prev, clientesInteresados: prev.clientesInteresados.filter(c => c.id !== id) }));
    try {
      await deleteClienteInteresado(id);
      logAction('Eliminar cliente interesado', `ID: ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateClienteActual = async (id: string, updates: Partial<ClienteActual>) => {
    setData(prev => ({
      ...prev,
      clientesActuales: prev.clientesActuales.map(c => c.id === id ? { ...c, ...updates } : c)
    }));
    try {
      await updateClienteActual(id, updates);
      logAction('Actualizar cliente actual', `ID: ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClienteActual = async (id: string) => {
    if (window.confirm('¿Eliminar este cliente? Se eliminarán también todos sus pagos.')) {
      try {
        await deleteClienteActual(id);
        setData(prev => ({
          ...prev,
          clientesActuales: prev.clientesActuales.filter(c => c.id !== id),
          pagosClientes: prev.pagosClientes.filter(p => p.clienteId !== id)
        }));
        logAction('Eliminar cliente actual', `ID: ${id}`);
      } catch (e) {
        console.error(e);
        alert('Error eliminando cliente');
      }
    }
  };

  const handleAddPagoCliente = async (pago: Omit<PagoCliente, 'id' | 'createdAt'>) => {
    const nuevoPago: PagoCliente = {
      ...pago,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, pagosClientes: [nuevoPago, ...prev.pagosClientes] }));
    try {
      await createPagoCliente(nuevoPago);
      const clientesAct = await getAllClientesActuales();
      setData(prev => ({ ...prev, clientesActuales: clientesAct || [] }));
      logAction('Registrar pago', `Monto: $${pago.monto}`);
    } catch (e) {
      console.error(e);
      alert('Error registrando pago');
    }
  };

  const handleDeletePagoCliente = async (id: string) => {
    if (window.confirm('¿Eliminar este pago?')) {
      setData(prev => ({ ...prev, pagosClientes: prev.pagosClientes.filter(p => p.id !== id) }));
      try {
        await deletePagoCliente(id);
        const clientesAct = await getAllClientesActuales();
        setData(prev => ({ ...prev, clientesActuales: clientesAct || [] }));
        logAction('Eliminar pago', `ID: ${id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- Handlers para Egresos Futuros ---
  const handleAddEgresoFuturo = async (egreso: Omit<EgresoFuturo, 'id' | 'createdAt'>) => {
    const nuevoEgreso: EgresoFuturo = {
      ...egreso,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, egresosFuturos: [nuevoEgreso, ...prev.egresosFuturos] }));
    try {
      await createEgresoFuturo(nuevoEgreso);
      logAction('Agregar egreso futuro', `${egreso.descripcion || egreso.categoria} - $${egreso.monto}`);
    } catch (e) {
      console.error(e);
      alert('Error guardando egreso futuro');
    }
  };

 const handleUpdateEgresoFuturo = async (id: string, updates: Partial<EgresoFuturo>) => {
  console.log('🔵 Iniciando handleUpdateEgresoFuturo');
  console.log('📋 ID:', id);
  console.log('📋 Updates:', updates);
  
  const egresoActual = data.egresosFuturos.find(e => e.id === id);
  console.log('📋 Egreso actual:', egresoActual);
  
  if (!egresoActual) {
    console.error('❌ No se encontró el egreso');
    alert('Error: No se encontró el egreso');
    return;
  }
  
  try {
    // ✅ DETECTAR SI ES CAMBIO A PAGADO
    const esCambioAPagado = updates.estado === 'pagado' && egresoActual.estado !== 'pagado';
    console.log('💡 ¿Es cambio a pagado?', esCambioAPagado);
    
    if (esCambioAPagado) {
      console.log('💰 Creando transacción de egreso...');
      
      const nuevaTransaccion: Transaction = {
        id: crypto.randomUUID(),
        date: egresoActual.fecha,
        type: 'egreso',
        amount: egresoActual.monto,
        category: egresoActual.categoria,
        description: egresoActual.descripcion || `Egreso futuro pagado: ${egresoActual.categoria}`,
        user: currentUser?.name || 'Sistema',
        attachments: egresoActual.adjuntos
      };
      
      console.log('💰 Nueva transacción creada:', nuevaTransaccion);
      
      // 1. Guardar transacción en BD
      await apiCreateTransaction(nuevaTransaccion);
      console.log('✅ Transacción guardada en BD');
      
      // 2. Actualizar egreso en BD
      await updateEgresoFuturo(id, updates);
      console.log('✅ Egreso actualizado en BD');
      
      // 3. Actualizar estado local (TODO junto)
      setData(prev => ({ 
        ...prev, 
        transactions: [nuevaTransaccion, ...prev.transactions],
        egresosFuturos: prev.egresosFuturos.map(e => 
          e.id === id ? { ...e, ...updates } : e
        )
      }));
      console.log('✅ Estado local actualizado');
      
      // 4. Log de auditoría
      await logAction(
        'Egreso futuro pagado', 
        `${egresoActual.categoria} - $${egresoActual.monto.toLocaleString()}`
      );
      console.log('✅ Log de auditoría creado');
      
      alert(
        `✅ EGRESO REGISTRADO COMO PAGADO\n\n` +
        `Categoría: ${egresoActual.categoria}\n` +
        `Monto: $${egresoActual.monto.toLocaleString()}\n` +
        `Fecha: ${egresoActual.fecha}\n\n` +
        `Se ha creado una transacción de egreso y el saldo ha sido actualizado.`
      );
      
    } else {
      // Solo actualizar sin crear transacción
      console.log('📝 Actualizando egreso sin crear transacción');
      
      await updateEgresoFuturo(id, updates);
      
      setData(prev => ({
        ...prev,
        egresosFuturos: prev.egresosFuturos.map(e => 
          e.id === id ? { ...e, ...updates } : e
        )
      }));
      
      await logAction('Actualizar egreso futuro', `ID: ${id}`);
      console.log('✅ Egreso actualizado (sin transacción)');
    }
    
  } catch (error) {
    console.error('❌ ERROR en handleUpdateEgresoFuturo:', error);
    alert(`Error: ${(error as Error).message}`);
    
    // Recargar datos
    try {
      const allData = await fetchAllData();
      setData(prev => ({
        ...prev,
        egresosFuturos: allData.egresosFuturos,
        transactions: allData.transactions
      }));
    } catch (reloadError) {
      console.error('❌ Error recargando:', reloadError);
    }
  }
};

// ... (tu función handleUpdateEgresoFuturo) ...

const handleDeleteEgresoFuturo = async (id: string) => {
  if (window.confirm('¿Está seguro de que desea eliminar este egreso futuro?')) {
    setData(prev => ({ 
      ...prev, 
      egresosFuturos: prev.egresosFuturos.filter(e => e.id !== id) 
    }));
    
    try {
      await deleteEgresoFuturo(id);
      await logAction('Eliminar egreso futuro', `ID: ${id}`);
    } catch (e) {
      console.error('Error eliminando egreso futuro:', e);
      alert('Error al eliminar el egreso futuro');
    }
  }
};

  // --- Handlers para Lotes ---
  const handleAddLote = async (lote: Omit<Lote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nuevoLote: Lote = {
      ...lote,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, lotes: [nuevoLote, ...prev.lotes] }));
    try {
      await createLote(nuevoLote);
      logAction('Agregar lote', `Lote #${lote.numeroLote} - Estado: ${lote.estado}`);
    } catch (e) {
      console.error(e);
      alert('Error guardando lote');
    }
  };

  const handleEditLote = async (id: string, updates: Partial<Lote>) => {
    setData(prev => ({
      ...prev,
      lotes: prev.lotes.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
    try {
      await updateLote(id, updates);
      logAction('Actualizar lote', `ID: ${id}`);
    } catch (e) {
      console.error(e);
      alert('Error actualizando lote');
    }
  };

  const handleDeleteLote = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este lote?')) {
      setData(prev => ({ ...prev, lotes: prev.lotes.filter(l => l.id !== id) }));
      try {
        await deleteLote(id);
        logAction('Eliminar lote', `ID: ${id}`);
      } catch (e) {
        console.error(e);
        alert('Error eliminando lote');
      }
    }
  };

  const handleReservarVenderLote = async (
    loteId: string,
    numeroLote: string,
    clienteData: any,
    pagoInicial: number,
    estado: 'reservado' | 'vendido'
  ) => {
    try {
     // DESPUÉS
const nuevoCliente: ClienteActual = {
  id: crypto.randomUUID(),
  nombre: clienteData.nombre,
  cedula: clienteData.cedula || '',                    // ← AGREGADO
  email: clienteData.email || '',
  telefono: clienteData.telefono || '',
  numeroLote: numeroLote,
  valorLote: clienteData.valorLote,
  depositoInicial: clienteData.depositoInicial,
  saldoRestante: clienteData.saldoRestante,
  numeroCuotas: clienteData.numeroCuotas,
  valorCuota: clienteData.valorCuota,
  saldoFinal: clienteData.saldoFinal,
  formaPagoInicial: clienteData.formaPagoInicial,
  formaPagoCuotas: clienteData.formaPagoCuotas,
  documentoCompraventa: clienteData.documentoCompraventa,
  estado: clienteData.estado,
  tipoPlanPago: clienteData.tipoPlanPago || 'automatico',           // ← AGREGADO
  cuotasPersonalizadas: clienteData.cuotasPersonalizadas || undefined, // ← AGREGADO
  notasEspeciales: clienteData.notasEspeciales || '',               // ← AGREGADO
  createdAt: new Date().toISOString()
};

      await createClienteActual(nuevoCliente);

      const updateLoteData: Partial<Lote> = {
        estado: estado,
        clienteId: nuevoCliente.id,
        descripcion: `${estado === 'reservado' ? 'Reservado' : 'Vendido'} a ${clienteData.nombre} - Inicial: $${pagoInicial.toLocaleString()}`,
        updatedAt: new Date().toISOString()
      };

      await updateLote(loteId, updateLoteData);

      if (pagoInicial > 0) {
        const nuevoPago: PagoCliente = {
          id: crypto.randomUUID(),
          clienteId: nuevoCliente.id,
          fechaPago: new Date().toISOString(),
          monto: pagoInicial,
          tipoPago: estado === 'reservado' ? 'Depósito de Reserva' : 'Cuota Inicial',
          formaPago: clienteData.formaPagoInicial || 'Efectivo',
          documentoAdjunto: null,
          notas: `Pago inicial por ${estado === 'reservado' ? 'reserva' : 'compra'} del Lote #${numeroLote}`,
          createdAt: new Date().toISOString()
        };

        await createPagoCliente(nuevoPago);

        setData(prev => ({
          ...prev,
          pagosClientes: [nuevoPago, ...prev.pagosClientes]
        }));
      }

      setData(prev => ({
        ...prev,
        clientesActuales: [nuevoCliente, ...prev.clientesActuales],
        lotes: prev.lotes.map(l => l.id === loteId ? { ...l, ...updateLoteData } : l)
      }));

      await logAction(
        `${estado === 'reservado' ? 'Reservar' : 'Vender'} Lote`,
        `Lote #${numeroLote} ${estado} a ${clienteData.nombre} - Inicial: $${pagoInicial.toLocaleString()}`
      );

      return { success: true, clienteId: nuevoCliente.id };

    } catch (error) {
      console.error('Error en handleReservarVenderLote:', error);
      throw error;
    }
  };

  // --- HANDLERS PARA OBRAS ---
const handleAddObra = async (obra: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const nuevaObra = await createObra(obra);
    if (nuevaObra) {
      setObras([...obras, nuevaObra]);
      await logAction('Crear Obra', `Obra: ${obra.nombre}`);
    }
  } catch (e) {
    console.error(e);
    alert('Error creando obra');
  }
};

const handleUpdateObra = async (id: string, updates: Partial<Obra>) => {
  try {
    const obraActualizada = await updateObra(id, updates);
    if (obraActualizada) {
      setObras(obras.map(o => o.id === id ? obraActualizada : o));
      await logAction('Actualizar Obra', `Obra ID: ${id}`);
    }
  } catch (e) {
    console.error(e);
    alert('Error actualizando obra');
  }
};

const handleDeleteObra = async (id: string) => {
  if (window.confirm('¿Está seguro de que desea eliminar esta obra?')) {
    try {
      const deleted = await deleteObra(id);
      if (deleted) {
        const obra = obras.find(o => o.id === id);
        setObras(obras.filter(o => o.id !== id));
        await logAction('Eliminar Obra', `Obra: ${obra?.nombre}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error eliminando obra');
    }
  }
};

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-blue-700 font-medium">Cargando datos...</span>
      </div>
    );
  }

  // --- Login View ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-lg">
              🌾
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Molino Campestre</h1>
            <h2 className="text-lg text-blue-600 font-medium">Rio Bravo</h2>
            <p className="text-slate-500 text-sm mt-2">Sistema de Gestión Integral</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email</label>
              <input 
                type="text" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ingrese su usuario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ingrese su contraseña"
              />
            </div>
            
            {authError && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{authError}</p>
            )}

            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg">
              Iniciar Sesión
            </button>
            
            <button type="button" onClick={handleRecoverPassword} className="w-full text-slate-500 text-sm hover:text-blue-600 transition-colors">
              ¿Olvidó su contraseña?
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-slate-400">
             <p>Usuario demo: <span className="font-mono bg-slate-100 px-1 rounded">Administrador</span></p>
             <p>Contraseña: <span className="font-mono bg-slate-100 px-1 rounded">admin</span></p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main App ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10 shadow-xl">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-lg">🌾</span>
            </div>
            Molino Campestre
          </h1>
          <p className="text-slate-400 text-xs mt-1 pl-10">Rio Bravo</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Receipt size={20}/>} label="Transacciones" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} />
          <SidebarItem icon={<UserCheck size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <SidebarItem icon={<MapPin size={20}/>} label="Mapa de Lotes" active={activeTab === 'lotes'} onClick={() => setActiveTab('lotes')} />
          <SidebarItem icon={<Calendar size={20}/>} label="Egresos Futuros" active={activeTab === 'egresos-futuros'} onClick={() => setActiveTab('egresos-futuros')} />
          <SidebarItem icon={<Building2 size={20}/>} label="Gestión de Obras" active={activeTab === 'obras'} onClick={() => setActiveTab('obras')} />
          <SidebarItem icon={<FileText size={20}/>} label="Documentos" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <SidebarItem icon={<StickyNote size={20}/>} label="Notas & Temas" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
          <SidebarItem icon={<Activity size={20}/>} label="Bitácora" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <SidebarItem icon={<Bell size={20}/>} label="Recordatorios" active={activeTab === 'recordatorios'} onClick={() => setActiveTab('recordatorios')} />
          {currentUser.role === 'admin' && (
             <SidebarItem icon={<UsersIcon size={20}/>} label="Usuarios" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
           <div className="bg-slate-800 rounded-lg p-4">
             <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-500/20 rounded-full text-blue-400">
                 <Bot size={18} />
               </div>
               <span className="font-semibold text-sm">Asesor IA</span>
             </div>
             <p className="text-xs text-slate-400 mb-3">Obtén análisis instantáneo.</p>
             <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded text-white transition-colors disabled:opacity-50"
             >
               {isAnalyzing ? 'Analizando...' : 'Analizar Ahora'}
             </button>
           </div>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-2 text-slate-400 hover:text-white text-sm px-2 py-1"
           >
             <LogOut size={16} /> Cerrar Sesión
           </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-20 px-4 py-3 flex justify-between items-center shadow-md">
        <span className="font-bold flex items-center gap-2">
           <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
              <span className="text-xs">🌾</span>
            </div>
          Molino Rio Bravo
        </span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900 z-10 pt-16 px-4 pb-8 space-y-4 md:hidden animate-fade-in overflow-y-auto">
           <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Receipt size={20}/>} label="Transacciones" active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<UserCheck size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => { setActiveTab('clientes'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<MapPin size={20}/>} label="Mapa de Lotes" active={activeTab === 'lotes'} onClick={() => { setActiveTab('lotes'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Calendar size={20}/>} label="Egresos Futuros" active={activeTab === 'egresos-futuros'} onClick={() => { setActiveTab('egresos-futuros'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Building2 size={20}/>} label="Gestión de Obras" active={activeTab === 'obras'} onClick={() => { setActiveTab('obras'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<FileText size={20}/>} label="Documentos" active={activeTab === 'documents'} onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<StickyNote size={20}/>} label="Notas & Temas" active={activeTab === 'notes'} onClick={() => { setActiveTab('notes'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Activity size={20}/>} label="Bitácora" active={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }} />
           {currentUser.role === 'admin' && (
             <SidebarItem icon={<UsersIcon size={20}/>} label="Usuarios" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} />
           )}
           <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 text-red-400 font-medium">
             <LogOut size={20} /> Salir
           </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 pt-20 md:pt-6 overflow-x-hidden">
        {/* Header */}
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Resumen Financiero'}
              {activeTab === 'transactions' && 'Movimientos'}
              {activeTab === 'clientes' && 'Gestión de Clientes'}
              {activeTab === 'lotes' && 'Mapa de Lotes'}
              {activeTab === 'egresos-futuros' && 'Egresos Futuros'}
              {activeTab === 'obras' && '🏗️ Gestión de Obras'}
              {activeTab === 'notes' && 'Gestión de Temas'}
              {activeTab === 'documents' && 'Gestión Documental'}
              {activeTab === 'logs' && 'Registro de Actividad'}
              {activeTab === 'users' && 'Usuarios del Sistema'}
	      {activeTab === 'recordatorios' && 'Sistema de Recordatorios'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Hola, {currentUser.name} | <span className="capitalize">{currentUser.role}</span>
            </p>
          </div>
        </header>

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-xl relative">
            <button 
              onClick={() => setAiAnalysis(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <div className="flex items-start gap-4">
               <div className="p-2 bg-white rounded-full shadow-sm text-blue-600 mt-1">
                 <Bot size={24} />
               </div>
               <div className="flex-1">
                 <h3 className="font-bold text-slate-800 mb-2">Análisis de Asesor Inteligente</h3>
                 <div className="prose prose-sm text-slate-600 max-w-none">
                    {aiAnalysis.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">{line}</p>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Dynamic Content */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <Dashboard 
  transactions={data.transactions} 
  summary={summary}
  clientesActuales={data.clientesActuales}
  pagosClientes={data.pagosClientes}
  egresosFuturos={data.egresosFuturos}
/>
          )}

          {activeTab === 'transactions' && (
  <TransactionList 
    transactions={data.transactions} 
    onAdd={addTransaction} 
    onDelete={deleteTransaction}
    onEdit={async (id, updates) => {  // ✅ AGREGAR ESTA FUNCIÓN
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
      try {
        await apiUpdateTransaction(id, updates);
        await logAction('Editar Transacción', `ID: ${id}`);
      } catch (e) {
        console.error(e);
        alert('Error actualizando transacción');
      }
    }}
    users={data.users}
    currentUser={currentUser}
  />
)}

          {activeTab === 'clientes' && (
            <ClientesView
              clientesInteresados={data.clientesInteresados}
              clientesActuales={data.clientesActuales}
              pagosClientes={data.pagosClientes}
              onAddClienteInteresado={handleAddClienteInteresado}
              onConvertToClienteActual={handleConvertToClienteActual}
onAddClienteActual={async (clienteData) => {
  const nuevoCliente: ClienteActual = {
    ...clienteData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  setData(prev => ({ ...prev, clientesActuales: [nuevoCliente, ...prev.clientesActuales] }));
  try {
    await createClienteActual(nuevoCliente);
    logAction('Agregar cliente actual', `${clienteData.nombre} - Lote ${clienteData.numeroLote}`);
  } catch (e) {
    console.error(e);
    alert('Error guardando cliente actual');
  }
}}
onUpdateClienteInteresado={handleUpdateClienteInteresado}
              onDeleteClienteInteresado={handleDeleteClienteInteresado}
              onUpdateClienteActual={handleUpdateClienteActual}
              onDeleteClienteActual={handleDeleteClienteActual}
              onAddPagoCliente={handleAddPagoCliente}
              onDeletePagoCliente={handleDeletePagoCliente}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'lotes' && (
            <MapaLotes
              lotes={data.lotes}
              clientesActuales={data.clientesActuales}
              pagosClientes={data.pagosClientes}
              onSelectLote={(lote) => console.log('Lote seleccionado:', lote)}
              onEditLote={handleEditLote}
              onDeleteLote={handleDeleteLote}
              onAddLote={handleAddLote}
              onReservarVenderLote={handleReservarVenderLote}
              editMode={currentUser?.role === 'admin'}
            />
          )}

          {activeTab === 'egresos-futuros' && (
            <EgresosFuturosView
              egresosFuturos={data.egresosFuturos}
              onAddEgreso={handleAddEgresoFuturo}
              onUpdateEgreso={handleUpdateEgresoFuturo}
              onDeleteEgreso={handleDeleteEgresoFuturo}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'obras' && (
            <GestionObrasView
              obras={obras}
              onAddObra={handleAddObra}
              onUpdateObra={handleUpdateObra}
              onDeleteObra={handleDeleteObra}
              currentUser={currentUser}
            />
          )}

	  {activeTab === 'recordatorios' && (
  <PanelRecordatorios 
    clientes={data.clientesActuales}
    pagos={data.pagosClientes}
  />
)}

          {activeTab === 'documents' && (
            <DocumentsView 
              documents={data.documents}
              onUpload={addDocument}
              onDelete={deleteDocument}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'notes' && (
  <NotesManager 
    notes={data.notes}
    onAdd={addNote}
    onEdit={editNote}  // ← AGREGAR ESTA LÍNEA
    onUpdateStatus={updateNoteStatus}
    onDelete={deleteNote}
  />
)}
          {activeTab === 'logs' && (
            <AuditLogView logs={data.logs} />
          )}

          {activeTab === 'users' && (
  <>
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 max-w-2xl mx-auto overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">Lista de Usuarios</h3>
        <button 
          onClick={() => {
            const name = prompt("Nombre del usuario:");
            if(!name) return;
            const email = prompt("Email:") || '';
            const pass = prompt("Contraseña:");
            if(name && pass) addUser(name, pass, email);
          }}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={16}/> Agregar
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {data.users.map(u => (
          <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                {u.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-slate-900">{u.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="capitalize">{u.role}</span>
                  <span>•</span>
                  <span>{u.email || 'Sin email'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Lock size={10}/>
                    {u.password ? '****' : 'Sin contraseña'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* BOTÓN DE CAMBIAR CONTRASEÑA */}
              <button 
                onClick={() => {
                  setChangingPasswordUser(u);
                  setShowPasswordModal(true);
                }}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                title="Cambiar contraseña"
              >
                <Lock size={14} />
                <span className="hidden sm:inline">Cambiar Contraseña</span>
              </button>
              
              <button 
                onClick={() => deleteUser(u.id)} 
                className="text-slate-400 hover:text-red-500"
                disabled={u.role === 'admin'}
                title={u.role === 'admin' ? "No se puede eliminar al admin principal" : "Eliminar"}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* MODAL DE CAMBIO DE CONTRASEÑA */}
    {showPasswordModal && changingPasswordUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Lock size={20} className="text-blue-600" />
              Cambiar Contraseña
            </h3>
            <button 
              onClick={() => {
                setShowPasswordModal(false);
                setChangingPasswordUser(null);
                setNewPassword('');
                setConfirmPassword('');
              }} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Información del usuario */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">
                Usuario: <span className="font-bold">{changingPasswordUser.name}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {changingPasswordUser.email || 'Sin email'}
              </p>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nueva Contraseña *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirmar Contraseña *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la contraseña"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Indicador de coincidencia */}
            {newPassword && confirmPassword && (
              <div className={`text-sm flex items-center gap-2 ${
                newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'
              }`}>
                {newPassword === confirmPassword ? (
                  <>
                    <CheckCircle2 size={16} />
                    Las contraseñas coinciden
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Las contraseñas no coinciden
                  </>
                )}
              </div>
            )}

            {/* Advertencia */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Importante:</strong> Asegúrese de comunicar la nueva contraseña al usuario de forma segura.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setChangingPasswordUser(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 4}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock size={18} />
                Cambiar Contraseña
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
          )}
        </div>
      </main>
    </div>
  );
};

// Sidebar Item Component
const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      active 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default App;