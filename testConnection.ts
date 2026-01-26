import { supabase } from './services/supabaseClient';

const testConnection = async () => {
  if (!supabase) {
    console.error('Supabase no está inicializado');
    return;
  }

  try {
    // Test 1: Verificar conexión básica
    const { data, error } = await supabase.from('transactions').select('count()', { count: 'exact' });
    if (error) {
      console.error('❌ Error conectando a tabla transactions:', error.message);
      return;
    }
    console.log('✅ Conexión a Supabase OK');
    console.log('✅ Tabla transactions existe');

    // Test 2: Verificar otras tablas
    const tables = ['notes', 'users', 'documents', 'audit_logs'];
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count()', { count: 'exact' });
      if (tableError) {
        console.error(`❌ Tabla ${table} NO existe:`, tableError.message);
      } else {
        console.log(`✅ Tabla ${table} existe`);
      }
    }
  } catch (err) {
    console.error('Error en prueba:', err);
  }
};

testConnection();
