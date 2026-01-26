// services/geminiService.ts
import { Transaction, Note, FinancialSummary } from '../types';

export const getFinancialAdvice = async (
  transactions: Transaction[],
  notes: Note[],
  summary: FinancialSummary
): Promise<string> => {
  
  // Preparamos los datos (limitamos transacciones para no exceder el tamaño)
  const recentTransactions = transactions.slice(0, 20);

  try {
    // Hacemos la llamada a NUESTRA API interna, no a Google directamente
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions: recentTransactions,
        notes: notes,
        summary: summary
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Error en el servidor de análisis');
    }

    const data = await response.json();
    return data.analysis || "No se pudo generar el análisis.";

  } catch (error) {
    console.error("Error calling Analysis API:", error);
    // Mensaje amigable para el usuario si falla la conexión
    return "Hubo un error al conectar con el asistente financiero. Por favor verifique su conexión o intente más tarde.";
  }
};