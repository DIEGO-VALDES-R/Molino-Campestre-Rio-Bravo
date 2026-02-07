/**
 * 🔐 SERVICIO DE AUTENTICACIÓN MEJORADO
 * Migración a Supabase Auth con seguridad robusta
 */

import { supabase } from './supabaseClient';
import { User } from '../types';

// ============================================
// INTERFACES
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'manager' | 'viewer';
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  session?: any;
}

export interface PasswordResetRequest {
  email: string;
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Login con Supabase Auth
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : error.message
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo autenticar'
      };
    }

    // Obtener datos del perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', data.user.email)
      .single();

    if (profileError || !profile) {
      console.warn('No se encontró perfil, creando usuario básico');
      
      // Crear perfil automáticamente
      const newUser: User = {
        id: data.user.id,
        name: data.user.email?.split('@')[0] || 'Usuario',
        email: data.user.email || '',
        role: 'viewer',
        createdAt: new Date().toISOString()
      };

      await supabase.from('users').insert([newUser]);

      return {
        success: true,
        user: newUser,
        session: data.session
      };
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role || 'viewer',
      createdAt: profile.created_at
    };

    return {
      success: true,
      user,
      session: data.session
    };

  } catch (error) {
    console.error('Error inesperado en login:', error);
    return {
      success: false,
      error: 'Error de conexión. Intente nuevamente.'
    };
  }
};

/**
 * Registro de nuevo usuario
 */
export const signup = async (signupData: SignupData): Promise<AuthResponse> => {
  try {
    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          name: signupData.name,
          role: signupData.role || 'viewer'
        }
      }
    });

    if (authError) {
      console.error('Error en signup:', authError);
      return {
        success: false,
        error: authError.message
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario'
      };
    }

    // 2. Crear perfil en tabla users
    const newUser: User = {
      id: authData.user.id,
      name: signupData.name,
      email: signupData.email,
      role: signupData.role || 'viewer',
      createdAt: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('users')
      .insert([newUser]);

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Intentar eliminar usuario de Auth si falla el perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        error: 'Error al crear el perfil de usuario'
      };
    }

    return {
      success: true,
      user: newUser,
      session: authData.session
    };

  } catch (error) {
    console.error('Error inesperado en signup:', error);
    return {
      success: false,
      error: 'Error al crear usuario'
    };
  }
};

/**
 * Cerrar sesión
 */
export const logout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error en logout:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error inesperado en logout:', error);
    return {
      success: false,
      error: 'Error al cerrar sesión'
    };
  }
};

/**
 * Recuperar sesión actual
 */
export const getCurrentSession = async (): Promise<AuthResponse> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return {
        success: false,
        error: 'No hay sesión activa'
      };
    }

    // Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'No se encontró el perfil del usuario'
      };
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      createdAt: profile.created_at
    };

    return {
      success: true,
      user,
      session
    };

  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return {
      success: false,
      error: 'Error al recuperar sesión'
    };
  }
};

/**
 * Solicitar recuperación de contraseña
 */
export const requestPasswordReset = async (
  request: PasswordResetRequest
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(request.email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      console.error('Error en resetPassword:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error inesperado en resetPassword:', error);
    return {
      success: false,
      error: 'Error al solicitar recuperación de contraseña'
    };
  }
};

/**
 * Actualizar contraseña (cuando usuario ya está autenticado)
 */
export const updatePassword = async (
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Error actualizando contraseña:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error inesperado actualizando contraseña:', error);
    return {
      success: false,
      error: 'Error al actualizar contraseña'
    };
  }
};

/**
 * Verificar email
 */
export const verifyEmail = async (
  token: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) {
      console.error('Error verificando email:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true
    };

  } catch (error) {
    console.error('Error inesperado verificando email:', error);
    return {
      success: false,
      error: 'Error al verificar email'
    };
  }
};

/**
 * Listener de cambios de autenticación
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    callback(event, session);
  });
};

/**
 * Validar fortaleza de contraseña
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // Longitud mínima
  if (password.length < 8) {
    feedback.push('Debe tener al menos 8 caracteres');
  } else {
    score += 20;
  }

  // Contiene mayúsculas
  if (/[A-Z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Debe contener al menos una mayúscula');
  }

  // Contiene minúsculas
  if (/[a-z]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Debe contener al menos una minúscula');
  }

  // Contiene números
  if (/[0-9]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Debe contener al menos un número');
  }

  // Contiene caracteres especiales
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 20;
  } else {
    feedback.push('Debe contener al menos un carácter especial (!@#$%^&*)');
  }

  return {
    isValid: score >= 60 && password.length >= 8,
    score,
    feedback
  };
};

/**
 * Generar contraseña segura
 */
export const generateSecurePassword = (length: number = 12): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + special;
  let password = '';

  // Asegurar al menos un carácter de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Registro de intentos fallidos de login (para seguridad)
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const checkLoginAttempts = (email: string): {
  allowed: boolean;
  remainingAttempts?: number;
  waitTime?: number;
} => {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

  const attempts = loginAttempts.get(email);
  
  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
  
  if (attempts.count >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_TIME) {
    const waitTime = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 1000 / 60);
    return {
      allowed: false,
      waitTime
    };
  }

  if (timeSinceLastAttempt >= LOCKOUT_TIME) {
    loginAttempts.delete(email);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - attempts.count
  };
};

export const recordLoginAttempt = (email: string, success: boolean) => {
  if (success) {
    loginAttempts.delete(email);
    return;
  }

  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
};
