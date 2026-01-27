import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Transaction, FinancialSummary, ClienteActual, PagoCliente } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Home, Users, Printer } from 'lucide-react';
import jsPDF from 'jspdf';

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

  // ============================================
  // FUNCIÓN DE EXPORTACIÓN A PDF
  // ============================================
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Configurar colores
      const brandColor = [79, 70, 229];
      const greenColor = [16, 185, 129];
      const redColor = [239, 68, 68];
      const blueColor = [59, 130, 246];
      const orangeColor = [249, 115, 22];

      // ===== PORTADA =====
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Logo/Ícono
      doc.setFillColor(255, 255, 255);
      doc.circle(105, 80, 30, 'F');
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.setFontSize(40);
      doc.text('🌾', 105, 90, { align: 'center' });
      
      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('Reporte Ejecutivo', 105, 130, { align: 'center' });
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'normal');
      doc.text('Dashboard Financiero', 105, 145, { align: 'center' });
      
      // Fecha
      doc.setFontSize(12);
      const fechaCompleta = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.text(fechaCompleta, 105, 165, { align: 'center' });
      
      // Footer de portada
      doc.setFontSize(10);
      doc.text('Molino Campestre Rio Bravo', 105, 260, { align: 'center' });
      doc.text('Sistema de Gestión Integral', 105, 270, { align: 'center' });

      // ===== PÁGINA 2: RESUMEN FINANCIERO GENERAL =====
      doc.addPage();
      
      // Encabezado
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen Financiero General', 105, 18, { align: 'center' });

      let y = 45;

      // KPIs principales (3 tarjetas)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Indicadores Clave', 14, y);
      y += 8;

      // Tarjeta 1: Ingresos
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, y, 58, 28, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Ingresos', 43, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.text(`$${summary.totalIncome.toLocaleString()}`, 43, y + 20, { align: 'center' });

      // Tarjeta 2: Egresos
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(76, y, 58, 28, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Total Egresos', 105, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(redColor[0], redColor[1], redColor[2]);
      doc.text(`$${summary.totalExpense.toLocaleString()}`, 105, y + 20, { align: 'center' });

      // Tarjeta 3: Balance
      const balancePositivo = summary.balance >= 0;
      doc.setFillColor(balancePositivo ? 239 : 255, balancePositivo ? 246 : 237, balancePositivo ? 255 : 213);
      doc.roundedRect(138, y, 58, 28, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'normal');
      doc.text('Saldo Actual', 167, y + 8, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(
        balancePositivo ? blueColor[0] : orangeColor[0],
        balancePositivo ? blueColor[1] : orangeColor[1],
        balancePositivo ? blueColor[2] : orangeColor[2]
      );
      doc.text(`$${summary.balance.toLocaleString()}`, 167, y + 20, { align: 'center' });

      y += 38;

      // Tabla de Balance Mensual
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Balance Mensual (Últimos 6 Meses)', 14, y);
      y += 8;

      // Encabezados de tabla
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Mes', 20, y + 5);
      doc.text('Ingresos', 80, y + 5, { align: 'right' });
      doc.text('Egresos', 130, y + 5, { align: 'right' });
      doc.text('Balance', 180, y + 5, { align: 'right' });

      y += 10;

      // Datos de la tabla
      doc.setFont('helvetica', 'normal');
      chartData.forEach((item, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(252, 252, 253);
          doc.rect(14, y - 3, 182, 7, 'F');
        }

        const balance = item.Ingresos - item.Egresos;
        
        doc.setTextColor(0, 0, 0);
        doc.text(item.name, 20, y + 2);
        
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`$${item.Ingresos.toLocaleString()}`, 80, y + 2, { align: 'right' });
        
        doc.setTextColor(redColor[0], redColor[1], redColor[2]);
        doc.text(`$${item.Egresos.toLocaleString()}`, 130, y + 2, { align: 'right' });
        
        doc.setTextColor(balance >= 0 ? greenColor[0] : redColor[0], 
                        balance >= 0 ? greenColor[1] : redColor[1],
                        balance >= 0 ? greenColor[2] : redColor[2]);
        doc.text(`$${balance.toLocaleString()}`, 180, y + 2, { align: 'right' });

        y += 7;
      });

      y += 10;

      // Distribución (simulación de gráfico de pastel con texto)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Distribución de Fondos', 14, y);
      y += 8;

      const totalFondos = summary.totalIncome + summary.totalExpense;
      const porcentajeIngresos = totalFondos > 0 ? ((summary.totalIncome / totalFondos) * 100).toFixed(1) : 0;
      const porcentajeEgresos = totalFondos > 0 ? ((summary.totalExpense / totalFondos) * 100).toFixed(1) : 0;

      // Barras de porcentaje
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(14, y, 182, 12, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setTextColor(6, 95, 70);
      doc.text(`Ingresos: ${porcentajeIngresos}%`, 20, y + 8);
      doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
      doc.rect(14, y, (182 * parseFloat(porcentajeIngresos.toString())) / 100, 12, 'F');

      y += 15;

      doc.setFillColor(254, 226, 226);
      doc.roundedRect(14, y, 182, 12, 2, 2, 'F');
      doc.setTextColor(153, 27, 27);
      doc.text(`Egresos: ${porcentajeEgresos}%`, 20, y + 8);
      doc.setFillColor(redColor[0], redColor[1], redColor[2]);
      doc.rect(14, y, (182 * parseFloat(porcentajeEgresos.toString())) / 100, 12, 'F');

      // ===== PÁGINA 3: INGRESOS POR VENTA DE LOTES =====
      if (clientesActuales.length > 0) {
        doc.addPage();
        
        // Encabezado
        doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Ingresos por Venta de Lotes', 105, 18, { align: 'center' });

        y = 45;

        // KPIs de Lotes (2x2)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Indicadores de Ventas', 14, y);
        y += 8;

        // Fila 1
        // Lotes vendidos
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(14, y, 88, 25, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Lotes Vendidos', 58, y + 8, { align: 'center' });
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text(totalLotes.toString(), 58, y + 18, { align: 'center' });

        // Valor total
        doc.setFillColor(240, 253, 244);
        doc.roundedRect(108, y, 88, 25, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Valor Total Lotes', 152, y + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`$${(totalValorLotes / 1000000).toFixed(1)}M`, 152, y + 18, { align: 'center' });

        y += 30;

        // Fila 2
        // Ingresos recibidos
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(14, y, 88, 25, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Ingresos Recibidos', 58, y + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`$${(totalDepositosRecibidos / 1000000).toFixed(1)}M`, 58, y + 18, { align: 'center' });

        // Saldo pendiente
        doc.setFillColor(255, 237, 213);
        doc.roundedRect(108, y, 88, 25, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Saldo Pendiente', 152, y + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
        doc.text(`$${(totalSaldoPendiente / 1000000).toFixed(1)}M`, 152, y + 18, { align: 'center' });

        y += 35;

        // Estado de Cobranza
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Estado de Cobranza', 14, y);
        y += 8;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, y, 182, 30, 3, 3, 'F');

        // Porcentaje de cobranza
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text('Cobranza Promedio:', 20, y + 10);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
        doc.text(`${porcentajePromedioPago}%`, 80, y + 12);

        // Clientes en cuota y pagados
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(`Clientes en Cuota: ${clientesEnCuota}`, 20, y + 22);
        doc.text(`Clientes Pagados: ${clientesPagados}`, 100, y + 22);

        y += 38;

        // Top 5 Clientes
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Top 5 Clientes por Lote', 14, y);
        y += 8;

        // Encabezados
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Cliente', 18, y + 5);
        doc.text('Lote', 65, y + 5);
        doc.text('Valor', 85, y + 5);
        doc.text('Pagado', 115, y + 5);
        doc.text('Pendiente', 150, y + 5);
        doc.text('Estado', 182, y + 5);

        y += 10;

        // Datos
        doc.setFont('helvetica', 'normal');
        clientesActuales.slice(0, 5).forEach((cliente, i) => {
          const totalPagadoCliente = pagosClientes
            .filter(p => p.clienteId === cliente.id)
            .reduce((acc, p) => acc + (p.monto || 0), 0);
          const saldoPendiente = (cliente.valorLote || 0) - (cliente.depositoInicial || 0) - totalPagadoCliente;

          if (i % 2 === 0) {
            doc.setFillColor(252, 252, 253);
            doc.rect(14, y - 3, 182, 7, 'F');
          }

          doc.setTextColor(0, 0, 0);
          const nombreCorto = cliente.nombre.length > 20 ? cliente.nombre.substring(0, 18) + '...' : cliente.nombre;
          doc.text(nombreCorto, 18, y + 2);
          doc.text(`#${cliente.numeroLote}`, 65, y + 2);
          
          doc.setTextColor(71, 85, 105);
          doc.text(`$${((cliente.valorLote || 0) / 1000).toFixed(0)}k`, 85, y + 2);
          
          doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
          doc.text(`$${(totalPagadoCliente / 1000).toFixed(0)}k`, 115, y + 2);
          
          doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
          doc.text(`$${(Math.max(0, saldoPendiente) / 1000).toFixed(0)}k`, 150, y + 2);

          // Estado
          let estadoColor, estadoBg;
          if (cliente.estado === 'pagado') {
            estadoBg = [220, 252, 231];
            estadoColor = [6, 95, 70];
          } else if (cliente.estado === 'mora') {
            estadoBg = [254, 226, 226];
            estadoColor = [153, 27, 27];
          } else {
            estadoBg = [219, 234, 254];
            estadoColor = [30, 64, 175];
          }
          
          doc.setFillColor(estadoBg[0], estadoBg[1], estadoBg[2]);
          doc.roundedRect(175, y - 2, 18, 5, 1, 1, 'F');
          doc.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
          doc.setFontSize(6);
          doc.text(cliente.estado.toUpperCase(), 184, y + 1.5, { align: 'center' });
          doc.setFontSize(7);

          y += 7;
        });
      }

      // Footer en todas las páginas
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) { // No poner footer en portada
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Molino Campestre Rio Bravo - Página ${i} de ${pageCount}`,
            105,
            290,
            { align: 'center' }
          );
        }
      }

      // Guardar PDF
      const fileName = `dashboard_ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Botón de exportación */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          title="Exportar Dashboard a PDF"
        >
          <Printer size={18} />
          <span>Exportar Reporte Ejecutivo</span>
        </button>
      </div>

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