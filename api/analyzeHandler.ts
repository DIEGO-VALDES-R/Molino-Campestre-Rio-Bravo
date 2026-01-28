// api/analyze.ts - Ruta de API para análisis con Google Gemini
// Ubicación: pages/api/analyze.ts o api/analyze.ts según tu estructura

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request) {
  // Manejar CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Solo POST permitido
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parsear body
    const body = await request.json();
    const { transactions = [], notes = [], summary = {} } = body;

    // Verificar que summary tenga datos
    if (!summary || typeof summary.totalIncome === 'undefined') {
      return new Response(
        JSON.stringify({ error: 'Datos de resumen incompletos' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Obtener API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY no está configurada');
      return new Response(
        JSON.stringify({ error: 'API Key no configurada' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Construir transacciones para el prompt
    const transactionsSummary = transactions
      .slice(0, 5)
      .map((t: any) => `- ${t.type}: $${t.amount} (${t.category})`)
      .join('\n') || 'Sin transacciones recientes';

    // Construir notas para el prompt
    const notesSummary = notes
      .filter((n: any) => n.status === 'futuro')
      .slice(0, 3)
      .map((n: any) => `- ${n.title}: ${n.description}`)
      .join('\n') || 'Sin notas pendientes';

    // Construir prompt
    const promptText = `Actúa como un asesor financiero experto para un negocio familiar de venta de lotes.
Analiza los siguientes datos financieros y proporciona un análisis conciso y accionable (máximo 3 párrafos).

RESUMEN FINANCIERO ACTUAL:
- Ingresos Totales: $${summary.totalIncome?.toLocaleString() || 0}
- Egresos Totales: $${summary.totalExpense?.toLocaleString() || 0}
- Balance: $${summary.balance?.toLocaleString() || 0}

TRANSACCIONES RECIENTES:
${transactionsSummary}

TEMAS PENDIENTES EN NOTAS:
${notesSummary}

Por favor proporciona:
1. Un análisis breve del estado financiero actual
2. Recomendaciones clave para mejorar
3. Acciones prioritarias a tomar

Sé conciso y práctico.`;

    // URL de Google Gemini API
    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    console.log('Enviando solicitud a Google Gemini...');

    // Hacer petición a Google Gemini
    const googleResponse = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      }),
    });

    // Verificar respuesta
    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google API Error:', {
        status: googleResponse.status,
        statusText: googleResponse.statusText,
        error: errorText,
      });

      return new Response(
        JSON.stringify({
          error: 'Error al consultar Google Gemini',
          details: errorText,
        }),
        {
          status: googleResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parsear respuesta
    const googleData = await googleResponse.json();

    console.log('Respuesta de Google:', googleData);

    // Extraer texto de forma segura
    let text = 'No se pudo generar análisis.';

    if (
      googleData?.candidates &&
      Array.isArray(googleData.candidates) &&
      googleData.candidates.length > 0
    ) {
      const candidate = googleData.candidates[0];
      if (candidate?.content?.parts && Array.isArray(candidate.content.parts)) {
        const firstPart = candidate.content.parts[0];
        if (firstPart?.text) {
          text = firstPart.text;
        }
      }
    }

    return new Response(JSON.stringify({ analysis: text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error en análisis AI:', error);

    let errorMessage = 'Error generando análisis';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}