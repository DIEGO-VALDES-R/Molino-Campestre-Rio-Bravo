/**
 * 📧 SERVICIO DE RECORDATORIOS AUTOMÁTICOS
 * Sistema inteligente de notificaciones para pagos de clientes
 */

import { supabase } from './supabaseClient';
import { ClienteActual, PagoCliente } from '../types';
import { enviarEmail, enviarWhatsApp } from './envioService';

// ============================================
// INTERFACES
// ============================================

export interface Recordatorio {
  id: string;
  clienteId: string;
  tipo: 'pago_proximo' | 'pago_vencido' | 'felicitacion' | 'mora';
  fechaEnvio: string;
  enviado: boolean;
  medios: ('email' | 'whatsapp' | 'sms')[];
  mensaje: string;
  prioridad: 'baja' | 'media' | 'alta';
  createdAt: string;
}

export interface ConfiguracionRecordatorios {
  diasAntes: number[];  // Ej: [7, 3, 1] = enviar 7, 3 y 1 días antes
  habilitarEmail: boolean;
  habilitarWhatsApp: boolean;
  habilitarSMS: boolean;
  horaEnvio: string; // Ej: "09:00"
  felicitarPagoATiempo: boolean;
  escalarMora: boolean;
}

// ============================================
// CONFIGURACIÓN POR DEFECTO
// ============================================

const CONFIG_DEFAULT: ConfiguracionRecordatorios = {
  diasAntes: [7, 3, 1],
  habilitarEmail: true,
  habilitarWhatsApp: true,
  habilitarSMS: false,
  horaEnvio: '09:00',
  felicitarPagoATiempo: true,
  escalarMora: true
};

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Obtener configuración de recordatorios
 */
export const getConfiguracionRecordatorios = async (): Promise<ConfiguracionRecordatorios> => {
  try {
    const { data, error } = await supabase
      .from('configuracion_recordatorios')
      .select('*')
      .single();

    if (error || !data) {
      return CONFIG_DEFAULT;
    }

    return data;
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return CONFIG_DEFAULT;
  }
};

/**
 * Actualizar configuración de recordatorios
 */
export const actualizarConfiguracionRecordatorios = async (
  config: Partial<ConfiguracionRecordatorios>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('configuracion_recordatorios')
      .upsert({
        id: 'default',
        ...config,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error actualizando configuración:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
};

/**
 * Calcular próxima fecha de pago de un cliente
 */
export const calcularProximoPago = (
  cliente: ClienteActual,
  pagos: PagoCliente[]
): Date | null => {
  // Obtener último pago
  const pagosOrdenados = pagos
    .filter(p => p.clienteId === cliente.id)
    .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());

  if (pagosOrdenados.length === 0) {
    // Si no hay pagos, la próxima fecha es 30 días después del depósito inicial
    const fechaInicio = new Date(cliente.createdAt);
    fechaInicio.setDate(fechaInicio.getDate() + 30);
    return fechaInicio;
  }

  const ultimoPago = new Date(pagosOrdenados[0].fechaPago);
  ultimoPago.setDate(ultimoPago.getDate() + 30); // Asumiendo pagos mensuales
  return ultimoPago;
};

/**
 * Generar recordatorios pendientes
 */
export const generarRecordatoriosPendientes = async (
  clientes: ClienteActual[],
  pagos: PagoCliente[],
  config: ConfiguracionRecordatorios = CONFIG_DEFAULT
): Promise<Recordatorio[]> => {
  const recordatorios: Recordatorio[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (const cliente of clientes) {
    if (cliente.estado === 'pagado') continue;

    const proximoPago = calcularProximoPago(cliente, pagos);
    if (!proximoPago) continue;

    const diasHastaPago = Math.ceil(
      (proximoPago.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Recordatorios antes del vencimiento
    for (const diasAntes of config.diasAntes) {
      if (diasHastaPago === diasAntes) {
        recordatorios.push({
          id: crypto.randomUUID(),
          clienteId: cliente.id,
          tipo: 'pago_proximo',
          fechaEnvio: hoy.toISOString(),
          enviado: false,
          medios: getMediosActivos(config),
          mensaje: generarMensajePagoProximo(cliente, proximoPago, diasAntes),
          prioridad: diasAntes <= 1 ? 'alta' : diasAntes <= 3 ? 'media' : 'baja',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Recordatorio de pago vencido
    if (diasHastaPago < 0) {
      const diasVencido = Math.abs(diasHastaPago);
      recordatorios.push({
        id: crypto.randomUUID(),
        clienteId: cliente.id,
        tipo: diasVencido > 7 ? 'mora' : 'pago_vencido',
        fechaEnvio: hoy.toISOString(),
        enviado: false,
        medios: getMediosActivos(config),
        mensaje: generarMensajePagoVencido(cliente, proximoPago, diasVencido),
        prioridad: 'alta',
        createdAt: new Date().toISOString()
      });
    }

    // Felicitación por pago a tiempo
    if (config.felicitarPagoATiempo) {
      const ultimoPago = pagos
        .filter(p => p.clienteId === cliente.id)
        .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())[0];

      if (ultimoPago) {
        const diasDesdePago = Math.ceil(
          (hoy.getTime() - new Date(ultimoPago.fechaPago).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Enviar felicitación 1 día después del pago
        if (diasDesdePago === 1) {
          recordatorios.push({
            id: crypto.randomUUID(),
            clienteId: cliente.id,
            tipo: 'felicitacion',
            fechaEnvio: hoy.toISOString(),
            enviado: false,
            medios: ['email', 'whatsapp'],
            mensaje: generarMensajeFelicitacion(cliente, ultimoPago),
            prioridad: 'baja',
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }

  return recordatorios;
};

/**
 * Enviar recordatorios pendientes
 */
export const enviarRecordatorios = async (
  recordatorios: Recordatorio[],
  clientes: ClienteActual[]
): Promise<{
  enviados: number;
  fallidos: number;
  errores: string[];
}> => {
  let enviados = 0;
  let fallidos = 0;
  const errores: string[] = [];

  for (const recordatorio of recordatorios) {
    const cliente = clientes.find(c => c.id === recordatorio.clienteId);
    if (!cliente) continue;

    try {
      // Enviar por email
      if (recordatorio.medios.includes('email') && cliente.email) {
        const resultadoEmail = await enviarEmail({
          destinatario: cliente.email,
          asunto: getTituloRecordatorio(recordatorio.tipo),
          htmlContent: generarHTMLRecordatorio(cliente, recordatorio)
        });

        if (!resultadoEmail.success) {
          errores.push(`Email fallido para ${cliente.nombre}: ${resultadoEmail.error}`);
        }
      }

      // Enviar por WhatsApp
      if (recordatorio.medios.includes('whatsapp') && cliente.telefono) {
        const resultadoWhatsApp = await enviarWhatsApp({
          numero: cliente.telefono,
          mensaje: recordatorio.mensaje
        });

        if (!resultadoWhatsApp.success) {
          errores.push(`WhatsApp fallido para ${cliente.nombre}: ${resultadoWhatsApp.error}`);
        }
      }

      // Marcar como enviado
      recordatorio.enviado = true;
      await guardarRecordatorio(recordatorio);
      enviados++;

    } catch (error) {
      console.error('Error enviando recordatorio:', error);
      errores.push(`Error para ${cliente.nombre}: ${(error as Error).message}`);
      fallidos++;
    }
  }

  return { enviados, fallidos, errores };
};

/**
 * Guardar recordatorio en base de datos
 */
const guardarRecordatorio = async (recordatorio: Recordatorio): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recordatorios')
      .insert([{
        id: recordatorio.id,
        cliente_id: recordatorio.clienteId,
        tipo: recordatorio.tipo,
        fecha_envio: recordatorio.fechaEnvio,
        enviado: recordatorio.enviado,
        medios: recordatorio.medios,
        mensaje: recordatorio.mensaje,
        prioridad: recordatorio.prioridad,
        created_at: recordatorio.createdAt
      }]);

    if (error) {
      console.error('Error guardando recordatorio:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error inesperado:', error);
    return false;
  }
};

/**
 * Obtener historial de recordatorios
 */
export const obtenerHistorialRecordatorios = async (
  clienteId?: string
): Promise<Recordatorio[]> => {
  try {
    let query = supabase
      .from('recordatorios')
      .select('*')
      .order('created_at', { ascending: false });

    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }

    return (data || []).map(r => ({
      id: r.id,
      clienteId: r.cliente_id,
      tipo: r.tipo,
      fechaEnvio: r.fecha_envio,
      enviado: r.enviado,
      medios: r.medios,
      mensaje: r.mensaje,
      prioridad: r.prioridad,
      createdAt: r.created_at
    }));

  } catch (error) {
    console.error('Error inesperado:', error);
    return [];
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

const getMediosActivos = (config: ConfiguracionRecordatorios): ('email' | 'whatsapp' | 'sms')[] => {
  const medios: ('email' | 'whatsapp' | 'sms')[] = [];
  if (config.habilitarEmail) medios.push('email');
  if (config.habilitarWhatsApp) medios.push('whatsapp');
  if (config.habilitarSMS) medios.push('sms');
  return medios;
};

const getTituloRecordatorio = (tipo: Recordatorio['tipo']): string => {
  switch (tipo) {
    case 'pago_proximo':
      return '🔔 Recordatorio: Próximo Pago - Molino Campestre';
    case 'pago_vencido':
      return '⚠️ Pago Vencido - Molino Campestre';
    case 'mora':
      return '🚨 URGENTE: Cuenta en Mora - Molino Campestre';
    case 'felicitacion':
      return '🎉 ¡Gracias por tu Pago! - Molino Campestre';
    default:
      return 'Notificación - Molino Campestre';
  }
};

const generarMensajePagoProximo = (
  cliente: ClienteActual,
  fechaPago: Date,
  diasAntes: number
): string => {
  const urgencia = diasAntes <= 1 ? '⏰ *URGENTE*' : diasAntes <= 3 ? '⚠️' : '🔔';
  
  return `
${urgencia} *RECORDATORIO DE PAGO*

Hola *${cliente.nombre}* 👋

Te recordamos que tu próxima cuota vence en *${diasAntes} día${diasAntes !== 1 ? 's' : ''}*.

📋 *Detalle:*
• Lote: #${cliente.numeroLote}
• Fecha de vencimiento: ${fechaPago.toLocaleDateString('es-CO')}
• Monto: $${cliente.valorCuota?.toLocaleString('es-CO')}

💡 *Realiza tu pago a tiempo y evita cargos adicionales.*

¿Necesitas ayuda? Contáctanos:
📞 Tel: 3124915127 - 3125123639

¡Gracias por confiar en nosotros! 🌾
*Molino Campestre Rio Bravo*
  `.trim();
};

const generarMensajePagoVencido = (
  cliente: ClienteActual,
  fechaPago: Date,
  diasVencido: number
): string => {
  const icono = diasVencido > 7 ? '🚨' : '⚠️';
  
  return `
${icono} *PAGO VENCIDO*

Estimado(a) *${cliente.nombre}*,

Nos permitimos informarte que tu cuota tiene *${diasVencido} día${diasVencido !== 1 ? 's' : ''} de retraso*.

📋 *Detalle:*
• Lote: #${cliente.numeroLote}
• Fecha de vencimiento: ${fechaPago.toLocaleDateString('es-CO')}
• Monto: $${cliente.valorCuota?.toLocaleString('es-CO')}
${diasVencido > 7 ? `• Interés de mora: 2% mensual\n• Monto con mora: $${((cliente.valorCuota || 0) * 1.02).toLocaleString('es-CO')}` : ''}

⚡ *Por favor regulariza tu situación lo antes posible.*

Estamos disponibles para ayudarte:
📞 Tel: 3124915127 - 3125123639

*Molino Campestre Rio Bravo*
  `.trim();
};

const generarMensajeFelicitacion = (
  cliente: ClienteActual,
  pago: PagoCliente
): string => {
  return `
🎉 *¡GRACIAS POR TU PAGO!*

Hola *${cliente.nombre}* 👋

Queremos agradecerte por realizar tu pago a tiempo. ¡Eres un cliente ejemplar! ⭐

📋 *Detalle del pago:*
• Monto: $${pago.monto.toLocaleString('es-CO')}
• Fecha: ${new Date(pago.fechaPago).toLocaleDateString('es-CO')}
• Lote: #${cliente.numeroLote}

🏆 *Tu compromiso nos impulsa a seguir mejorando.*

¡Seguimos construyendo juntos el proyecto de tus sueños! 🌾

*Molino Campestre Rio Bravo*
📞 3124915127 - 3125123639
  `.trim();
};

const generarHTMLRecordatorio = (
  cliente: ClienteActual,
  recordatorio: Recordatorio
): string => {
  const colores: Record<string, string> = {
    pago_proximo: '#3b82f6',
    pago_vencido: '#f59e0b',
    mora: '#ef4444',
    felicitacion: '#10b981'
  };

  const color = colores[recordatorio.tipo] || '#6b7280';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">
                ${getTituloRecordatorio(recordatorio.tipo)}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <div style="white-space: pre-wrap; line-height: 1.6; color: #374151;">
                ${recordatorio.mensaje}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Este es un mensaje automático, por favor no responder.<br>
                © 2025 Molino Campestre Rio Bravo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Ejecutar sistema de recordatorios (función principal para cron job)
 */
export const ejecutarSistemaRecordatorios = async (
  clientes: ClienteActual[],
  pagos: PagoCliente[]
): Promise<{
  success: boolean;
  recordatoriosGenerados: number;
  recordatoriosEnviados: number;
  errores: string[];
}> => {
  try {
    console.log('🔔 Iniciando sistema de recordatorios...');

    const config = await getConfiguracionRecordatorios();
    const recordatorios = await generarRecordatoriosPendientes(clientes, pagos, config);

    console.log(`📋 ${recordatorios.length} recordatorios generados`);

    if (recordatorios.length === 0) {
      return {
        success: true,
        recordatoriosGenerados: 0,
        recordatoriosEnviados: 0,
        errores: []
      };
    }

    const { enviados, fallidos, errores } = await enviarRecordatorios(recordatorios, clientes);

    console.log(`✅ ${enviados} enviados, ❌ ${fallidos} fallidos`);

    return {
      success: true,
      recordatoriosGenerados: recordatorios.length,
      recordatoriosEnviados: enviados,
      errores
    };

  } catch (error) {
    console.error('❌ Error en sistema de recordatorios:', error);
    return {
      success: false,
      recordatoriosGenerados: 0,
      recordatoriosEnviados: 0,
      errores: [(error as Error).message]
    };
  }
};
