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
  Calendar
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { NotesManager } from './components/NotesManager';
import { DocumentsView } from './components/DocumentsView';
import { AuditLogView } from './components/AuditLogView';
import ClientesView from './components/ClientesView';
import EgresosFuturosView from './components/EgresosFuturosView';
import { 
  fetchAllData,
  apiCreateTransaction,
  apiDeleteTransaction,
  apiCreateNote,
  apiUpdateNoteStatus,
  apiDeleteNote,
  apiCreateUser,
  apiDeleteUser,
  apiCreateDocument,
  apiDeleteDocument,
  apiCreateLog,
  // Nuevas funciones para Clientes
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
  // Nuevas funciones para Egresos Futuros
  getAllEgresosFuturos,
  createEgresoFuturo,
  updateEgresoFuturo,
  deleteEgresoFuturo
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

  // --- App State ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'notes' | 'users' | 'documents' | 'logs' | 'clientes' | 'egresos-futuros'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

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
  }>({
    transactions: [],
    notes: [],
    users: [],
    documents: [],
    logs: [],
    clientesInteresados: [],
    clientesActuales: [],
    pagosClientes: [],
    egresosFuturos: []
  });

  // --- Initial Load ---
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        console.log('Iniciando carga de datos...');
        
        // Cargar todos los datos en paralelo
        const [basedData, clientesInt, clientesAct, pagos, egresos] = await Promise.all([
          fetchAllData(),
          getAllClientesInteresados(),
          getAllClientesActuales(),
          getAllPagosClientes(),
          getAllEgresosFuturos()
        ]);

        console.log('Datos cargados:');
        console.log('Clientes actuales:', clientesAct);
        console.log('Base data:', basedData);

        // Combinar todos los datos
        const nuevoData = {
          ...basedData,
          clientesInteresados: clientesInt || [],
          clientesActuales: clientesAct || [],
          pagosClientes: pagos || [],
          egresosFuturos: egresos || []
        };

        console.log('Estado final:', nuevoData);
        setData(nuevoData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Asegurar que al menos el estado base esté disponible
        setData(prev => ({
          ...prev,
          clientesInteresados: [],
          clientesActuales: [],
          pagosClientes: [],
          egresosFuturos: []
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
    // Update UI immediately
    setData(prev => ({ ...prev, logs: [newLog, ...prev.logs] }));
    // Send to DB
    await apiCreateLog(newLog);
  };

  // --- Handlers Existentes ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Try to find user in the fetched data (from DB)
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

    // 2. Fallback: Hardcoded Demo Admin
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
  }

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

  // --- Nuevos Handlers para Clientes ---
  const handleAddClienteInteresado = async (cliente: Omit<ClienteInteresado, 'id' | 'createdAt'>) => {
    const nuevoCliente: ClienteInteresado = {
      ...cliente,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setData(prev => ({ ...prev, clientesInteresados: [nuevoCliente, ...prev.clientesInteresados] }));
    try {
      await createClienteInteresado(nuevoCliente);
      logAction('Agregar cliente interesado', `Cliente: ${cliente.nombre}`);
    } catch (e) {
      console.error(e);
      alert('Error guardando cliente');
    }
  };

  const handleConvertToClienteActual = async (
    interesadoId: string,
    clienteData: Omit<ClienteActual, 'id' | 'createdAt'>
  ) => {
    try {
      // Convertir el cliente en la BD (esto ya borra de interesados)
      const nuevoCliente = await convertInteresadoToActual(interesadoId, clienteData);
      
      // Actualizar UI: quitar de interesados y agregar a actuales
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
        // Eliminar de BD
        await deleteClienteActual(id);
        
        // Actualizar estado local
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
      
      // Actualizar cliente
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
        
        // Actualizar cliente
        const clientesAct = await getAllClientesActuales();
        setData(prev => ({ ...prev, clientesActuales: clientesAct || [] }));
        
        logAction('Eliminar pago', `ID: ${id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- Nuevos Handlers para Egresos Futuros ---
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
    setData(prev => ({
      ...prev,
      egresosFuturos: prev.egresosFuturos.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
    try {
      await updateEgresoFuturo(id, updates);
      logAction('Actualizar egreso futuro', `ID: ${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEgresoFuturo = async (id: string) => {
    if (window.confirm('¿Eliminar este egreso futuro?')) {
      setData(prev => ({ ...prev, egresosFuturos: prev.egresosFuturos.filter(e => e.id !== id) }));
      try {
        await deleteEgresoFuturo(id);
        logAction('Eliminar egreso futuro', `ID: ${id}`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        <span className="ml-3 text-brand-700 font-medium">Cargando datos...</span>
      </div>
    );
  }

  // --- Login View ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-lg shadow-brand-500/30">
              🌾
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Molino Campestre</h1>
            <h2 className="text-lg text-brand-600 font-medium">Rio Bravo</h2>
            <p className="text-slate-500 text-sm mt-2">Sistema de Gestión Integral</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Usuario / Email</label>
              <input 
                type="text" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Ingrese su usuario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                placeholder="Ingrese su contraseña"
              />
            </div>
            
            {authError && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{authError}</p>
            )}

            <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20">
              Iniciar Sesión
            </button>
            
            <button type="button" onClick={handleRecoverPassword} className="w-full text-slate-500 text-sm hover:text-brand-600 transition-colors">
              ¿Olvidó su contraseña?
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-slate-400">
             <p>Usuario demo por defecto: <span className="font-mono bg-slate-100 px-1 rounded">Administrador</span></p>
             <p>Contraseña: <span className="font-mono bg-slate-100 px-1 rounded">admin</span></p>
          </div>
        </div>
      </div>
    );
  }

  // --- Main App Render ---
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10 shadow-xl">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
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
          <SidebarItem icon={<Calendar size={20}/>} label="Egresos Futuros" active={activeTab === 'egresos-futuros'} onClick={() => setActiveTab('egresos-futuros')} />
          <SidebarItem icon={<FileText size={20}/>} label="Documentos" active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} />
          <SidebarItem icon={<StickyNote size={20}/>} label="Notas & Temas" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
          <SidebarItem icon={<Activity size={20}/>} label="Bitácora" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          {currentUser.role === 'admin' && (
             <SidebarItem icon={<UsersIcon size={20}/>} label="Usuarios" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
           <div className="bg-slate-800 rounded-lg p-4">
             <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-brand-500/20 rounded-full text-brand-400">
                 <Bot size={18} />
               </div>
               <span className="font-semibold text-sm">Asesor IA</span>
             </div>
             <p className="text-xs text-slate-400 mb-3">Obtén análisis instantáneo.</p>
             <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-xs font-bold rounded text-white transition-colors disabled:opacity-50"
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
           <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
              <span className="text-xs">🌾</span>
            </div>
          Molino Rio Bravo
        </span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900 z-10 pt-16 px-4 pb-8 space-y-4 md:hidden animate-fade-in overflow-y-auto">
           <SidebarItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Receipt size={20}/>} label="Transacciones" active={activeTab === 'transactions'} onClick={() => { setActiveTab('transactions'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<UserCheck size={20}/>} label="Clientes" active={activeTab === 'clientes'} onClick={() => { setActiveTab('clientes'); setMobileMenuOpen(false); }} />
           <SidebarItem icon={<Calendar size={20}/>} label="Egresos Futuros" active={activeTab === 'egresos-futuros'} onClick={() => { setActiveTab('egresos-futuros'); setMobileMenuOpen(false); }} />
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
        {/* Header Section */}
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Resumen Financiero'}
              {activeTab === 'transactions' && 'Movimientos'}
              {activeTab === 'clientes' && 'Gestión de Clientes'}
              {activeTab === 'egresos-futuros' && 'Egresos Futuros'}
              {activeTab === 'notes' && 'Gestión de Temas'}
              {activeTab === 'documents' && 'Gestión Documental'}
              {activeTab === 'logs' && 'Registro de Actividad'}
              {activeTab === 'users' && 'Usuarios del Sistema'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Hola, {currentUser.name} | <span className="capitalize">{currentUser.role}</span>
            </p>
          </div>
        </header>

        {/* AI Analysis Result Box */}
        {aiAnalysis && (
          <div className="mb-8 bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-100 p-6 rounded-xl relative">
            <button 
              onClick={() => setAiAnalysis(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <div className="flex items-start gap-4">
               <div className="p-2 bg-white rounded-full shadow-sm text-brand-600 mt-1">
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
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionList 
              transactions={data.transactions} 
              onAdd={addTransaction} 
              onDelete={deleteTransaction}
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
              onUpdateClienteInteresado={handleUpdateClienteInteresado}
              onDeleteClienteInteresado={handleDeleteClienteInteresado}
              onUpdateClienteActual={handleUpdateClienteActual}
              onDeleteClienteActual={handleDeleteClienteActual}
              onAddPagoCliente={handleAddPagoCliente}
              onDeletePagoCliente={handleDeletePagoCliente}
              currentUser={currentUser}
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
              onUpdateStatus={updateNoteStatus}
              onDelete={deleteNote}
            />
          )}

          {activeTab === 'logs' && (
            <AuditLogView logs={data.logs} />
          )}

          {activeTab === 'users' && (
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
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 flex items-center gap-1"
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
                             <span className="flex items-center gap-1"><Lock size={10}/> *****</span>
                          </div>
                        </div>
                      </div>
                      <button 
                         onClick={() => deleteUser(u.id)} 
                         className="text-slate-400 hover:text-red-500"
                         disabled={u.role === 'admin'}
                         title={u.role === 'admin' ? "No se puede eliminar al admin principal" : "Eliminar"}
                      >
                         <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Helper Component for Sidebar
const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
      active 
        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default App;