// services/geminiService.ts - Cliente para llamar a la API de análisis

import { Transaction, Note, FinancialSummary } from '../types';

export async function getFinancialAdvice(
  transactions: Transaction[],
  notes: Note[],
  summary: FinancialSummary
): Promise<string> {
  try {
    console.log('Solicitando análisis financiero...');

    // Determinar la URL base según el ambiente
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    const apiUrl = `${baseUrl}/api/analyze`;

    console.log('URL de API:', apiUrl);

    // Hacer la petición
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions,
        notes,
        summary,
      }),
    });

    // Manejar respuesta
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error en API:', {
        status: response.status,
        error: errorData,
      });
      throw new Error(
        errorData.error ||
          `Error ${response.status}: ${response.statusText}`
      );
    }

    // Parsear respuesta
    const data = await response.json();

    if (!data.analysis) {
      throw new Error('No se recibió análisis');
    }

    console.log('Análisis recibido exitosamente');
    return data.analysis;
  } catch (error) {
    console.error('Error en getFinancialAdvice:', error);

    let errorMessage = 'No se pudo conectar con el asesor financiero.';

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Retornar un mensaje de error amigable
    throw new Error(
      `Hubo un error al conectar con el asistente financiero: ${errorMessage}`
    );
  }
}