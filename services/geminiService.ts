import { GoogleGenAI } from "@google/genai";
import { Transaction, Note, FinancialSummary } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFinancialAdvice = async (
  transactions: Transaction[],
  notes: Note[],
  summary: FinancialSummary
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Clave de API no configurada. Por favor configure su API KEY para obtener análisis inteligente.";
  }

  // Filter last 20 transactions to avoid token limits on large datasets for this demo
  const recentTransactions = transactions.slice(0, 20);

  const prompt = `
    Actúa como un asesor financiero experto para un negocio familiar.
    Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).
    
    Resumen Actual:
    - Ingresos Totales: $${summary.totalIncome}
    - Egresos Totales: $${summary.totalExpense}
    - Balance: $${summary.balance}
    
    Transacciones Recientes (Muestra):
    ${JSON.stringify(recentTransactions.map(t => ({ date: t.date, type: t.type, amount: t.amount, desc: t.description })))}
    
    Temas Pendientes en Notas:
    ${JSON.stringify(notes.filter(n => n.status === 'futuro').map(n => n.title))}

    Por favor:
    1. Identifica tendencias preocupantes o positivas.
    2. Sugiere una acción concreta basada en el balance actual.
    3. Si hay temas futuros pendientes importantes, recuérdalos.
    Usa un tono profesional pero cercano.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Hubo un error al conectar con el asistente financiero. Inténtelo más tarde.";
  }
};
