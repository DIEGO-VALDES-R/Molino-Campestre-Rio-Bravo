/**
 * ✅ SERVICIO DE ENVÍO POR EMAIL Y WHATSAPP
 * Integración con APIs de terceros
 */

// ============================================
// 📧 SERVICIO DE EMAIL
// ============================================

export interface DatosEnvioEmail {
  destinatario: string;
  asunto: string;
  htmlContent: string;
  pdfBase64?: string;
  nombreArchivo?: string;
}

/**
 * Enviar email usando Supabase Edge Function o API externa
 * Soporta SendGrid, Mailgun, Gmail API, etc.
 */
export const enviarEmail = async (datos: DatosEnvioEmail) => {
  try {
    // OPCIÓN 1: Usando Supabase Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: datos.destinatario,
          subject: datos.asunto,
          html: datos.htmlContent,
          pdfBase64: datos.pdfBase64,
          fileName: datos.nombreArchivo
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Error enviando email: ${response.statusText}`);
    }

    console.log(`✅ Email enviado a ${datos.destinatario}`);
    return {
      success: true,
      mensaje: `Email enviado a ${datos.destinatario}`
    };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    // Fallback: Mostrar en consola para desarrollo
    console.log('Email content:', datos.htmlContent);
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

// ============================================
// 📱 SERVICIO DE WHATSAPP
// ============================================

export interface DatosEnvioWhatsApp {
  numero: string;
  mensaje: string;
  urlPDF?: string;
}

/**
 * Enviar mensaje WhatsApp usando Twilio o similar
 * Requiere Edge Function en Supabase
 */
export const enviarWhatsApp = async (datos: DatosEnvioWhatsApp) => {
  try {
    // Limpiar número telefónico
    const telefonoLimpio = datos.numero
      .replace(/\D/g, '')
      .replace(/^1/, '');

    // Agregar código de país (Colombia: 57)
    const numeroWhatsApp = `57${telefonoLimpio}`;

    // OPCIÓN: Usando Supabase Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-whatsapp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          to: numeroWhatsApp,
          message: datos.mensaje,
          mediaUrl: datos.urlPDF
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Error enviando WhatsApp: ${response.statusText}`);
    }

    console.log(`✅ WhatsApp enviado a +${numeroWhatsApp}`);
    return {
      success: true,
      mensaje: `Mensaje enviado a +${numeroWhatsApp}`
    };
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
    // Fallback: Mostrar en consola para desarrollo
    console.log('WhatsApp message:', datos.mensaje);
    return {
      success: false,
      error: (error as Error).message
    };
  }
};

// ============================================
// 🔄 ENVÍO COMBINADO
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
    errores: [] as string[]
  };

  // HTML para email
  const htmlEmail = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
          
          <!-- ENCABEZADO -->
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">
              ${datos.tipo === 'reserva' ? '🟡 COMPROBANTE DE RESERVA' : '🔵 COMPROBANTE DE VENTA'}
            </h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Molino Campestre Rio Bravo</p>
          </div>

          <!-- CONTENIDO -->
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px; background-color: white;">
            
            <h2 style="color: #4f46e5; font-size: 18px;">¡Hola ${cliente.nombre}!</h2>
            
            <p>Gracias por tu confianza. Adjuntamos tu comprobante de ${datos.tipo === 'reserva' ? 'reserva' : 'venta'}.</p>

            <!-- INFORMACIÓN IMPORTANTE -->
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #10b981;">Operación #${datos.numeroOperacion}</h3>
              <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
              <p style="margin: 5px 0;"><strong>Lote:</strong> #${cliente.numeroLote}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> Confirmado ✅</p>
            </div>

            <!-- DETALLE FINANCIERO -->
            <div style="background-color: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 4px; border-left: 4px solid #3b82f6;">
              <h3 style="margin-top: 0; color: #3b82f6;">Detalle del Pago</h3>
              <p style="margin: 5px 0;"><strong>Valor Total:</strong> \$${datos.valorLote.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>${datos.tipo === 'reserva' ? 'Depósito de Reserva' : 'Cuota Inicial'}:</strong> \$${datos.deposito.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Saldo Restante:</strong> \$${(datos.valorLote - datos.deposito).toLocaleString()}</p>
            </div>

            <!-- PRÓXIMOS PASOS -->
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #f59e0b;">Próximos Pasos</h3>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Revisa tu comprobante adjunto</li>
                <li>Realiza el pago según el plan establecido</li>
                <li>Guarda este email para referencia futura</li>
              </ol>
            </div>

            <!-- CONTACTO -->
            <div style="background-color: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;">
                <strong>¿Preguntas?</strong> No dudes en contactarnos:<br>
                📞 +57 123 4567890<br>
                📧 info@molino.com
              </p>
            </div>

            <!-- FIRMA -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                Saludos cordiales,<br>
                <strong>Equipo de Molino Campestre Rio Bravo</strong>
              </p>
            </div>

          </div>

          <!-- FOOTER -->
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>Este es un email automático. No respondas directamente.</p>
            <p>© 2025 Molino Campestre Rio Bravo. Todos los derechos reservados.</p>
          </div>

        </div>
      </body>
    </html>
  `;

  // Mensaje para WhatsApp
  const mensajeWhatsApp = `
🌾 *MOLINO CAMPESTRE RIO BRAVO* 🌾

¡Hola *${cliente.nombre}*! 👋

Tu ${datos.tipo === 'reserva' ? 'reserva' : 'venta'} ha sido procesada exitosamente ✅

📋 *Detalles de tu Operación:*
• Operación: #${datos.numeroOperacion}
• Tipo: ${datos.tipo === 'reserva' ? 'Reserva de Lote' : 'Venta de Lote'}
• Lote: #${cliente.numeroLote}
• Fecha: ${new Date().toLocaleDateString('es-CO')}
• Estado: Confirmado ✅

💰 *Información Financiera:*
• Valor Total: $${datos.valorLote.toLocaleString()}
• ${datos.tipo === 'reserva' ? 'Depósito' : 'Cuota'} Inicial: $${datos.deposito.toLocaleString()}
• Saldo Restante: $${(datos.valorLote - datos.deposito).toLocaleString()}

📥 *Descarga tu comprobante:*
Revisa tu email para descargar el PDF

💡 *Pasos Siguientes:*
1. Descarga y guarda tu comprobante
2. Realiza el pago según el cronograma
3. Contacta con nosotros si tienes preguntas

📞 *¿Preguntas?*
Estamos aquí para ayudarte
Llama: +57 123 4567890
Email: info@molino.com

¡Gracias por tu confianza! 🙏
  `.trim();

  // Enviar Email
  if (opciones.enviarEmail && cliente.email) {
    try {
      resultados.email = await enviarEmail({
        destinatario: cliente.email,
        asunto:
          datos.tipo === 'reserva'
            ? `Comprobante de Reserva - Lote #${cliente.numeroLote}`
            : `Comprobante de Venta - Lote #${cliente.numeroLote}`,
        htmlContent: htmlEmail,
        pdfBase64: datos.pdfBase64,
        nombreArchivo: datos.nombreArchivo
      });
    } catch (error) {
      resultados.errores.push(
        `Email: ${(error as Error).message}`
      );
    }
  }

  // Enviar WhatsApp
  if (opciones.enviarWhatsApp && cliente.telefono) {
    try {
      resultados.whatsapp = await enviarWhatsApp({
        numero: cliente.telefono,
        mensaje: mensajeWhatsApp
      });
    } catch (error) {
      resultados.errores.push(
        `WhatsApp: ${(error as Error).message}`
      );
    }
  }

  return resultados;
};

// ============================================
// 📋 ENVÍO DE RECIBOS DE ABONO
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
  nombreArchivo: string
) => {
  const htmlEmail = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- ENCABEZADO -->
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">📄 RECIBO DE ABONO</h1>
            <p style="margin: 5px 0 0 0;">Molino Campestre Rio Bravo</p>
          </div>

          <!-- CONTENIDO -->
          <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #4f46e5;">Estimado ${cliente.nombre},</h2>
            
            <p>Confirmamos la recepción de tu abono por:</p>
            <h3 style="color: #10b981; font-size: 24px;">$${abono.monto.toLocaleString()}</h3>
            
            <p><strong>Lote:</strong> #${cliente.numeroLote}</p>
            <p><strong>Fecha del Abono:</strong> ${new Date(abono.fecha).toLocaleDateString('es-CO')}</p>
            
            <div style="background-color: #f0fdf4; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>Saldo Anterior:</strong> $${abono.saldoAnterior.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Abono Realizado:</strong> -$${abono.monto.toLocaleString()}</p>
              <p style="margin: 5px 0; font-size: 16px; color: #10b981;"><strong>Saldo Actual:</strong> $${abono.saldoActual.toLocaleString()}</p>
            </div>
            
            <p>
              <a href="mailto:info@molino.com?subject=Consulta%20sobre%20recibo" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📞 Contactarnos
              </a>
            </p>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              ¡Gracias por tu pago!<br>
              <strong>Equipo de Molino Campestre</strong>
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  return await enviarEmail({
    destinatario: cliente.email,
    asunto: `Recibo de Abono - Lote #${cliente.numeroLote}`,
    htmlContent: htmlEmail,
    pdfBase64,
    nombreArchivo
  });
};