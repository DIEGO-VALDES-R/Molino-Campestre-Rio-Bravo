import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Transaction, FinancialSummary, ClienteActual, PagoCliente } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Home, Users } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  clientesActuales?: ClienteActual[];
  pagosClientes?: PagoCliente[];
}

const COLORS = ['#10b981', '#ef4444'];
const COLORS_LOTES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, summary, clientesActuales = [], pagosClientes = [] }) => {
  
  const chartData = useMemo(() => {
    // Group by month (last 6 months)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7); // YYYY-MM
    }).reverse();

    return last6Months.map(month => {
      const monthlyTrans = transactions.filter(t => t.date.startsWith(month));
      return {
        name: month,
        Ingresos: monthlyTrans.filter(t => t.type === 'ingreso').reduce((acc, curr) => acc + curr.amount, 0),
        Egresos: monthlyTrans.filter(t => t.type === 'egreso').reduce((acc, curr) => acc + curr.amount, 0),
      };
    });
  }, [transactions]);

  const pieData = [
    { name: 'Ingresos', value: summary.totalIncome },
    { name: 'Egresos', value: summary.totalExpense },
  ];

  // Calcular métricas de lotes
  const totalLotes = clientesActuales.length;
  const totalValorLotes = clientesActuales.reduce((sum, c) => sum + (c.valorLote || 0), 0);
  const totalDepositosRecibidos = clientesActuales.reduce((sum, c) => sum + (c.depositoInicial || 0), 0);
  
  // Calcular saldo pendiente correctamente: Valor Lote - Depósito Inicial - Total Pagado
  const totalSaldoPendiente = clientesActuales.reduce((sum, c) => {
    const totalPagadoCliente = pagosClientes
      .filter(p => p.clienteId === c.id)
      .reduce((acc, p) => acc + (p.monto || 0), 0);
    const saldoCliente = (c.valorLote || 0) - (c.depositoInicial || 0) - totalPagadoCliente;
    return sum + Math.max(0, saldoCliente); // No mostrar negativos
  }, 0);
  
  const porcentajePromedioPago = totalValorLotes > 0 ? Math.round((totalDepositosRecibidos / totalValorLotes) * 100) : 0;
  const clientesPagados = clientesActuales.filter(c => c.estado === 'pagado').length;
  const clientesEnCuota = clientesActuales.filter(c => c.estado === 'activo' || c.estado === 'mora').length;

  // Data para gráfico de cobranza por mes
  const cobranzaData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        date: d.toISOString().slice(0, 7),
        mes: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      };
    }).reverse();

    return last6Months.map(item => {
      // Simular cobranzas mensuales (en un caso real, vendrían de BD)
      const cobranzasDelMes = Math.floor(Math.random() * totalDepositosRecibidos / 6);
      return {
        name: item.mes,
        Cobranzas: cobranzasDelMes,
        Meta: Math.floor(totalDepositosRecibidos / 6)
      };
    });
  }, [totalDepositosRecibidos]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SECCIÓN 1: KPI Cards Generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ingresos Totales</p>
            <p className="text-2xl font-bold text-slate-800">${summary.totalIncome.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Egresos Totales</p>
            <p className="text-2xl font-bold text-slate-800">${summary.totalExpense.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className={`p-3 rounded-full ${summary.balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Saldo Actual</p>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              ${summary.balance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Balance Mensual</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribución</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECCIÓN 2: Ingresos por Venta de Lotes */}
      {clientesActuales.length > 0 && (
        <>
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Home size={24} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Ingresos por Venta de Lotes</h3>
                <p className="text-sm text-slate-500">Resumen de ventas y cobranzas</p>
              </div>
            </div>
          </div>

          {/* KPI Cards de Lotes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lotes vendidos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Lotes Vendidos</p>
                  <p className="text-3xl font-bold text-slate-900">{totalLotes}</p>
                  <p className="text-xs text-slate-400 mt-2">Clientes actuales</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            {/* Valor total de lotes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Valor Total Lotes</p>
                  <p className="text-3xl font-bold text-slate-900">${(totalValorLotes / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-slate-400 mt-2">${totalValorLotes.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            {/* Ingresos recibidos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Ingresos Recibidos</p>
                  <p className="text-3xl font-bold text-emerald-600">${(totalDepositosRecibidos / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-slate-400 mt-2">${totalDepositosRecibidos.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Saldo pendiente */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Saldo Pendiente</p>
                  <p className="text-3xl font-bold text-orange-600">${(totalSaldoPendiente / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-slate-400 mt-2">${totalSaldoPendiente.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <DollarSign size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos de Lotes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cobranzas vs Meta */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px]">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobranzas Mensuales</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cobranzaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Cobranzas" stroke="#10b981" strokeWidth={2} dot={{r: 4}} />
                  <Line type="monotone" dataKey="Meta" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Porcentaje de Cobranza */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Estado de Cobranza</h3>
              <div className="space-y-6">
                {/* Porcentaje visual */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Cobranza Promedio</p>
                    <p className="text-4xl font-bold text-emerald-600">{porcentajePromedioPago}%</p>
                    <p className="text-xs text-slate-500 mt-1">Del total facturado</p>
                  </div>
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="8"
                        strokeDasharray={`${(porcentajePromedioPago / 100) * 282.74} 282.74`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-900">{porcentajePromedioPago}%</span>
                    </div>
                  </div>
                </div>

                {/* Estado de clientes */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">En Cuota</p>
                    <p className="text-2xl font-bold text-blue-600">{clientesEnCuota}</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${totalLotes > 0 ? (clientesEnCuota / totalLotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Pagados</p>
                    <p className="text-2xl font-bold text-green-600">{clientesPagados}</p>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${totalLotes > 0 ? (clientesPagados / totalLotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Clientes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h4 className="font-semibold text-slate-900">Clientes por Lote (Top 5)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-900 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Lote</th>
                    <th className="px-6 py-4 text-right">Valor Lote</th>
                    <th className="px-6 py-4 text-right">Depósito</th>
                    <th className="px-6 py-4 text-right">Total Pagado</th>
                    <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesActuales.slice(0, 5).map((cliente) => {
                    // Calcular total pagado para este cliente
                    const totalPagadoCliente = pagosClientes
                      .filter(p => p.clienteId === cliente.id)
                      .reduce((acc, p) => acc + (p.monto || 0), 0);
                    
                    // Calcular saldo pendiente: Valor - Depósito - Pagos
                    const saldoPendiente = (cliente.valorLote || 0) - (cliente.depositoInicial || 0) - totalPagadoCliente;
                    
                    return (
                      <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{cliente.nombre}</td>
                        <td className="px-6 py-4">#{cliente.numeroLote}</td>
                        <td className="px-6 py-4 text-right font-semibold">${cliente.valorLote?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                          ${cliente.depositoInicial?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-600">
                          ${totalPagadoCliente.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-orange-600">
                          ${Math.max(0, saldoPendiente).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              cliente.estado === 'pagado'
                                ? 'bg-green-100 text-green-800'
                                : cliente.estado === 'mora'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {cliente.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};