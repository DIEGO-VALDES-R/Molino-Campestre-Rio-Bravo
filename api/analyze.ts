import { GoogleGenerativeAI } from "@google/genai";

// Forzamos Node.js para que Google AI funcione correctamente
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
      return new Response(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Inicializar Google AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prompt correctamente formateado
    const prompt = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: Out-Null{summary.totalIncome}
      - Egresos Totales: Out-Null{summary.totalExpense}
      - Balance: Out-Null{summary.balance}

      Transacciones Recientes:
      

      Temas Pendientes en Notas:
      
    ;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

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
