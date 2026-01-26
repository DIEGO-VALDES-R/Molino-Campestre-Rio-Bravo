import { GoogleGenerativeAI } from "@google/genai";

// IMPORTANTE: Forzamos el runtime de Node.js en Vercel
// porque la librería de Google no funciona en Edge Runtime.
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

    // Leer clave desde variables de entorno
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

    const prompt = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: import { GoogleGenerativeAI } from "@google/genai";

// IMPORTANTE: Forzamos el runtime de Node.js en Vercel
// porque la librería de Google no funciona en Edge Runtime.
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

    // Leer clave desde variables de entorno
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

    const prompt = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: $${summary.totalIncome}
      - Egresos Totales: $${summary.totalExpense}
      - Balance: $${summary.balance}

      Transacciones Recientes:
      ${JSON.stringify(transactions)}

      Temas Pendientes en Notas:
      ${JSON.stringify(notes.filter((n: any) => n.status === 'futuro').map((n: any) => n.title))}
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
}{summary.totalIncome}
      - Egresos Totales: import { GoogleGenerativeAI } from "@google/genai";

// IMPORTANTE: Forzamos el runtime de Node.js en Vercel
// porque la librería de Google no funciona en Edge Runtime.
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

    // Leer clave desde variables de entorno
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

    const prompt = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: $${summary.totalIncome}
      - Egresos Totales: $${summary.totalExpense}
      - Balance: $${summary.balance}

      Transacciones Recientes:
      ${JSON.stringify(transactions)}

      Temas Pendientes en Notas:
      ${JSON.stringify(notes.filter((n: any) => n.status === 'futuro').map((n: any) => n.title))}
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
}{summary.totalExpense}
      - Balance: import { GoogleGenerativeAI } from "@google/genai";

// IMPORTANTE: Forzamos el runtime de Node.js en Vercel
// porque la librería de Google no funciona en Edge Runtime.
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

    // Leer clave desde variables de entorno
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

    const prompt = 
      Actúa como un asesor financiero experto para un negocio familiar.
      Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

      Resumen Actual:
      - Ingresos Totales: $${summary.totalIncome}
      - Egresos Totales: $${summary.totalExpense}
      - Balance: $${summary.balance}

      Transacciones Recientes:
      ${JSON.stringify(transactions)}

      Temas Pendientes en Notas:
      ${JSON.stringify(notes.filter((n: any) => n.status === 'futuro').map((n: any) => n.title))}
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
}{summary.balance}

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
