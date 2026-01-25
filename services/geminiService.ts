import { GoogleGenAI } from "@google/genai";
import { Transaction, Note, FinancialSummary } from '../types';

export const getFinancialAdvice = async (
  transactions: Transaction[],
  notes: Note[],
  summary: FinancialSummary
): Promise<string> => {

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "Análisis inteligente deshabilitado: falta configurar la API Key.";
  }

  // Inicializar Gemini SOLO si hay API key
  const ai = new GoogleGenAI({ apiKey });

  const recentTransactions = transactions.slice(0, 20);

  const prompt = `
  Actúa como un asesor financiero experto para un negocio familiar.
  Analiza los siguientes datos financieros y proporciona un resumen ejecutivo conciso (máximo 3 párrafos).

  Resumen Actual:
  - Ingresos Totales: $${summary.totalIncome}
  - Egresos Totales: $${summary.totalExpense}
  - Balance: $${summary.balance}

  Transacciones Recientes:
  ${JSON.stringify(recentTransactions)}

  Temas Pendientes:
  ${JSON.stringify(notes.filter(n => n.status === 'futuro').map(n => n.title))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error Gemini:", error);
    return "Error al conectar con el asistente financiero.";
  }
};
