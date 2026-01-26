// NO importamos GoogleGenerativeAI para evitar errores en Vercel

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request) {
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

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { transactions, notes, summary } = body;

    // Leer clave de entorno
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Falta GEMINI_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Construir el prompt
    const promptText = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: main{summary.totalIncome}
      - Egresos Totales: main{summary.totalExpense}
      - Balance: main{summary.balance}

      Transacciones Recientes:
      

      Temas Pendientes en Notas:
      
    ;

    // LLAMADA DIRECTA A LA API DE GOOGLE USANDO FETCH
    const googleUrl = https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=;

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
                text: promptText
              }
            ]
          }
        ]
      })
    });

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google API Error:", errorText);
      return new Response(JSON.stringify({ error: 'Error en Google API' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const googleData = await googleResponse.json();
    
    // Extraer el texto de la respuesta compleja de Google
    const text = googleData.candidates[0]?.content?.parts[0]?.text || "No se pudo generar análisis.";

    return new Response(JSON.stringify({ analysis: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in AI analysis:", error);
    return new Response(JSON.stringify({ error: 'Error generando análisis' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
