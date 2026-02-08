/**
 * 🔐 COMPONENTE DE LOGIN MEJORADO
 * Con validación, recuperación de contraseña y mejor UX
 */

import React, { useState } from 'react';
import { login, requestPasswordReset, checkLoginAttempts, recordLoginAttempt } from '../services/authService';
import { Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Verificar intentos de login
    const attempts = checkLoginAttempts(email);
    if (!attempts.allowed) {
      setError(`Demasiados intentos fallidos. Espera ${attempts.waitTime} minutos.`);
      return;
    }

    setLoading(true);

    try {
      const result = await login({ email, password });
      
      if (result.success && result.user) {
        recordLoginAttempt(email, true);
        onLoginSuccess(result.user);
      } else {
        recordLoginAttempt(email, false);
        setError(result.error || 'Error al iniciar sesión');
        
        const remainingAttempts = checkLoginAttempts(email);
        if (remainingAttempts.remainingAttempts) {
          setError(`${result.error}. ${remainingAttempts.remainingAttempts} intentos restantes.`);
        }
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await requestPasswordReset({ email: recoveryEmail });
      
      if (result.success) {
        setRecoverySuccess(true);
      } else {
        setError(result.error || 'Error al enviar recuperación');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (showRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Recuperar Contraseña</h1>
            <p className="text-slate-500 text-sm mt-2">
              Te enviaremos un enlace de recuperación
            </p>
          </div>

          {recoverySuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <CheckCircle2 size={48} className="text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-green-900 mb-2">
                ¡Email Enviado!
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Revisa tu correo {recoveryEmail} para restablecer tu contraseña.
              </p>
              <button
                onClick={() => {
                  setShowRecovery(false);
                  setRecoverySuccess(false);
                  setRecoveryEmail('');
                }}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Volver al Login
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>

              <button
                type="button"
                onClick={() => setShowRecovery(false)}
                className="w-full text-slate-500 text-sm hover:text-slate-700 transition-colors"
              >
                ← Volver al login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🌾</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Molino Campestre</h1>
          <h2 className="text-lg text-blue-600 font-medium">Rio Bravo</h2>
          <p className="text-slate-500 text-sm mt-2">Sistema de Gestión Integral</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email o Usuario
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="usuario@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-shake">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>

          {/* Forgot Password */}
          <button
            type="button"
            onClick={() => setShowRecovery(true)}
            className="w-full text-slate-500 text-sm hover:text-blue-600 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 text-center mb-2 font-medium">
            Credenciales de prueba:
          </p>
          <div className="space-y-1 text-xs text-center">
            <p className="font-mono text-slate-700">
              <span className="text-slate-500">Usuario:</span> admin@molino.com
            </p>
            <p className="font-mono text-slate-700">
              <span className="text-slate-500">Contraseña:</span> admin123
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          <p>© 2026 Molino Campestre Rio Bravo</p>
          <p className="mt-1">Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
