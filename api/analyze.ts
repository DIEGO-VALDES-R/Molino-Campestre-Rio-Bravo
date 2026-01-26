import { GoogleGenerativeAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Manejo de CORS
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

    // Leer clave desde variables de entorno del servidor (GEMINI_API_KEY)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Falta configurar GEMINI_API_KEY en el servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Inicializar Google AI (Sintaxis corregida)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    return new Response(JSON.stringify({ error: 'Error generando análisis en el servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
