/**
 * ✅ SERVICIO DE ENVÍO — Email (Resend) + WhatsApp (wa.me)
 * Email: Supabase Edge Function → Resend API
 * WhatsApp: Enlace wa.me (abre WhatsApp con mensaje prellenado)
 */

// ============================================
// 📧 EMAIL VIA SUPABASE EDGE FUNCTION (RESEND)
// ============================================

export interface DatosEnvioEmail {
  destinatario: string;
  asunto: string;
  htmlContent: string;
  pdfBase64?: string;
  nombreArchivo?: string;
}

export const enviarEmail = async (datos: DatosEnvioEmail) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: datos.destinatario,
          subject: datos.asunto,
          html: datos.htmlContent,
          pdfBase64: datos.pdfBase64,
          fileName: datos.nombreArchivo,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}`);
    }

    console.log(`✅ Email enviado a ${datos.destinatario}`);
    return { success: true, mensaje: `Email enviado a ${datos.destinatario}` };

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return { success: false, error: (error as Error).message };
  }
};

// ============================================
// 📱 WHATSAPP VIA wa.me (sin API, sin backend)
// Abre WhatsApp Web/App con mensaje y descarga del PDF
// ============================================

export interface DatosEnvioWhatsApp {
  numero: string;
  mensaje: string;
  /** Si se pasa, se descarga el PDF y luego se abre WhatsApp */
  pdfBlob?: Blob;
  nombreArchivo?: string;
}

/**
 * Abre WhatsApp con el mensaje prellenado.
 * Si se pasa pdfBlob, primero descarga el PDF automáticamente
 * para que el usuario lo pueda adjuntar manualmente.
 */
export const enviarWhatsApp = (datos: DatosEnvioWhatsApp) => {
  try {
    // Limpiar número y agregar código Colombia
    const telefonoLimpio = datos.numero.replace(/\D/g, '').replace(/^0+/, '');
    const numeroWhatsApp = telefonoLimpio.startsWith('57')
      ? telefonoLimpio
      : `57${telefonoLimpio}`;

    // Si viene PDF, descargarlo primero
    if (datos.pdfBlob && datos.nombreArchivo) {
      const url = URL.createObjectURL(datos.pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = datos.nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // Abrir WhatsApp con mensaje prellenado
    const mensajeCodificado = encodeURIComponent(datos.mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

    // Pequeño delay para que la descarga del PDF inicie primero
    setTimeout(() => {
      window.open(urlWhatsApp, '_blank');
    }, datos.pdfBlob ? 800 : 0);

    console.log(`✅ WhatsApp abierto para +${numeroWhatsApp}`);
    return { success: true, mensaje: `WhatsApp abierto para +${numeroWhatsApp}` };

  } catch (error) {
    console.error('❌ Error abriendo WhatsApp:', error);
    return { success: false, error: (error as Error).message };
  }
};

// ============================================
// 🔄 ENVÍO COMBINADO (comprobante reserva/venta)
// ============================================

export const enviarComprobanteCompleto = async (
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
    numeroLote: string;
  },
  datos: {
    tipo: 'reserva' | 'venta';
    numeroOperacion: string;
    deposito: number;
    valorLote: number;
    pdfBase64: string;
    pdfBlob?: Blob;
    nombreArchivo: string;
  },
  opciones: {
    enviarEmail?: boolean;
    enviarWhatsApp?: boolean;
  } = { enviarEmail: true, enviarWhatsApp: true }
) => {
  const resultados = {
    email: null as any,
    whatsapp: null as any,
    errores: [] as string[],
  };

  const tipoTexto = datos.tipo === 'reserva' ? 'reserva' : 'venta';
  const tipoMayus = datos.tipo === 'reserva' ? 'RESERVA' : 'VENTA';
  const depositoLabel = datos.tipo === 'reserva' ? 'Depósito de Reserva' : 'Cuota Inicial';

  // ── HTML para email ──────────────────────────────────────
  const htmlEmail = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb;">

          <div style="background-color: #1e3a8a; color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">
              ${datos.tipo === 'reserva' ? '🟡' : '🔵'} COMPROBANTE DE ${tipoMayus}
            </h1>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Molino Campestre Rio Bravo</p>
          </div>

          <div style="border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px; background-color: white;">

            <h2 style="color: #1e3a8a; font-size: 18px; margin-top: 0;">¡Hola ${cliente.nombre}!</h2>
            <p style="color: #555;">Gracias por tu confianza. Adjuntamos tu comprobante de ${tipoTexto}.</p>

            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px; color: #10b981; font-size: 15px;">Operación #${datos.numeroOperacion}</h3>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Lote:</strong> #${cliente.numeroLote}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Estado:</strong> Confirmado ✅</p>
            </div>

            <div style="background-color: #eff6ff; padding: 16px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px; color: #3b82f6; font-size: 15px;">Detalle del Pago</h3>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Valor Total del Lote:</strong> $${datos.valorLote.toLocaleString('es-CO')}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>${depositoLabel}:</strong> $${datos.deposito.toLocaleString('es-CO')}</p>
              <p style="margin: 4px 0; font-size: 14px; color: #f97316;"><strong>Saldo Restante:</strong> $${(datos.valorLote - datos.deposito).toLocaleString('es-CO')}</p>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 8px; color: #d97706; font-size: 15px;">Próximos Pasos</h3>
              <ol style="margin: 0; padding-left: 18px; font-size: 14px;">
                <li style="margin-bottom: 4px;">Descarga y guarda el PDF adjunto</li>
                <li style="margin-bottom: 4px;">Realiza los pagos según el cronograma acordado</li>
                <li>Contáctanos si tienes alguna pregunta</li>
              </ol>
            </div>

            <div style="background-color: #f3f4f6; padding: 14px; margin: 20px 0; border-radius: 4px; font-size: 14px;">
              <strong>¿Preguntas?</strong><br>
              📞 3124915127 - 3125123639<br>
              📍 Molino Campestre Rio Bravo
            </div>

            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Saludos cordiales,<br>
              <strong>Equipo de Molino Campestre Rio Bravo</strong>
            </div>
          </div>

          <div style="text-align: center; margin-top: 16px; color: #999; font-size: 11px; padding-bottom: 20px;">
            <p style="margin: 2px 0;">Email automático — No respondas directamente.</p>
            <p style="margin: 2px 0;">© ${new Date().getFullYear()} Molino Campestre Rio Bravo</p>
          </div>
        </div>
      </body>
    </html>
  `;

  // ── Mensaje WhatsApp ─────────────────────────────────────
  const mensajeWhatsApp = `🌾 *MOLINO CAMPESTRE RIO BRAVO* 🌾

¡Hola *${cliente.nombre}*! 👋

Tu ${tipoTexto} ha sido procesada exitosamente ✅

📋 *Detalles de tu Operación:*
• Operación: #${datos.numeroOperacion}
• Tipo: ${datos.tipo === 'reserva' ? 'Reserva de Lote' : 'Venta de Lote'}
• Lote: #${cliente.numeroLote}
• Fecha: ${new Date().toLocaleDateString('es-CO')}
• Estado: Confirmado ✅

💰 *Información Financiera:*
• Valor Total: $${datos.valorLote.toLocaleString('es-CO')}
• ${depositoLabel}: $${datos.deposito.toLocaleString('es-CO')}
• Saldo Restante: $${(datos.valorLote - datos.deposito).toLocaleString('es-CO')}

📎 *Adjuntamos tu comprobante PDF.*
Por favor guárdalo para tus registros.

📞 *¿Preguntas?*
Llámanos: 3124915127 - 3125123639

¡Gracias por tu confianza! 🙏`.trim();

  // ── Enviar Email ─────────────────────────────────────────
  if (opciones.enviarEmail && cliente.email) {
    try {
      resultados.email = await enviarEmail({
        destinatario: cliente.email,
        asunto: `Comprobante de ${tipoMayus} — Lote #${cliente.numeroLote} | Molino Campestre`,
        htmlContent: htmlEmail,
        pdfBase64: datos.pdfBase64,
        nombreArchivo: datos.nombreArchivo,
      });
    } catch (error) {
      resultados.errores.push(`Email: ${(error as Error).message}`);
    }
  }

  // ── Enviar WhatsApp ──────────────────────────────────────
  // Descarga el PDF y abre WhatsApp con el mensaje
  if (opciones.enviarWhatsApp && cliente.telefono) {
    try {
      resultados.whatsapp = enviarWhatsApp({
        numero: cliente.telefono,
        mensaje: mensajeWhatsApp,
        pdfBlob: datos.pdfBlob,
        nombreArchivo: datos.nombreArchivo,
      });
    } catch (error) {
      resultados.errores.push(`WhatsApp: ${(error as Error).message}`);
    }
  }

  return resultados;
};

// ============================================
// 📋 RECIBO DE ABONO
// ============================================

export const enviarReciboAbono = async (
  cliente: {
    nombre: string;
    email: string;
    telefono: string;
    numeroLote: string;
  },
  abono: {
    monto: number;
    fecha: string;
    saldoAnterior: number;
    saldoActual: number;
  },
  pdfBase64: string,
  nombreArchivo: string,
  pdfBlob?: Blob
) => {
  const htmlEmail = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto;">

          <div style="background-color: #10b981; color: white; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">📄 RECIBO DE ABONO</h1>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Molino Campestre Rio Bravo</p>
          </div>

          <div style="border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px; background: white;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Estimado/a ${cliente.nombre},</h2>
            <p>Confirmamos la recepción de tu abono:</p>

            <h3 style="color: #10b981; font-size: 28px; margin: 8px 0;">$${abono.monto.toLocaleString('es-CO')}</h3>

            <p style="font-size: 14px;"><strong>Lote:</strong> #${cliente.numeroLote}</p>
            <p style="font-size: 14px;"><strong>Fecha:</strong> ${new Date(abono.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

            <div style="background-color: #f0fdf4; padding: 16px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10b981; font-size: 14px;">
              <p style="margin: 4px 0;"><strong>Saldo Anterior:</strong> $${abono.saldoAnterior.toLocaleString('es-CO')}</p>
              <p style="margin: 4px 0; color: #ef4444;"><strong>Abono Realizado:</strong> -$${abono.monto.toLocaleString('es-CO')}</p>
              <p style="margin: 4px 0; font-size: 16px; color: #10b981;"><strong>Saldo Actual:</strong> $${abono.saldoActual.toLocaleString('es-CO')}</p>
            </div>

            <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              ¡Gracias por tu pago!<br>
              <strong>Equipo de Molino Campestre Rio Bravo</strong><br>
              📞 3124915127 - 3125123639
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const resultEmail = await enviarEmail({
    destinatario: cliente.email,
    asunto: `Recibo de Abono — Lote #${cliente.numeroLote} | Molino Campestre`,
    htmlContent: htmlEmail,
    pdfBase64,
    nombreArchivo,
  });

  // También abrir WhatsApp si hay teléfono
  if (cliente.telefono) {
    const mensajeWA = `🌾 *MOLINO CAMPESTRE RIO BRAVO* 🌾

¡Hola *${cliente.nombre}*! 

Confirmamos tu abono de *$${abono.monto.toLocaleString('es-CO')}* para el lote #${cliente.numeroLote} ✅

💰 *Estado de tu cuenta:*
• Saldo anterior: $${abono.saldoAnterior.toLocaleString('es-CO')}
• Abono: -$${abono.monto.toLocaleString('es-CO')}
• Saldo actual: $${abono.saldoActual.toLocaleString('es-CO')}

📎 Recibo adjunto enviado a tu email.
📞 3124915127 - 3125123639

¡Gracias! 🙏`.trim();

    enviarWhatsApp({
      numero: cliente.telefono,
      mensaje: mensajeWA,
      pdfBlob,
      nombreArchivo,
    });
  }

  return resultEmail;
};