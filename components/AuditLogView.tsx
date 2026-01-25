import React from 'react';
import { AuditLog } from '../types';
import { Activity } from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <Activity className="text-brand-500" />
          <h3 className="font-bold text-slate-800">Bitácora de Cambios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedLogs.length > 0 ? (
                sortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {log.userName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No hay registros de actividad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
