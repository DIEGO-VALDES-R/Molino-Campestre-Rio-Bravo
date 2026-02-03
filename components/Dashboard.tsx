import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Transaction, FinancialSummary, ClienteActual, PagoCliente, EgresoFuturo } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Home, Users, Printer, AlertCircle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';

interface DashboardProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  clientesActuales?: ClienteActual[];
  pagosClientes?: PagoCliente[];
  egresosFuturos?: EgresoFuturo[];
}

const COLORS = ['#10b981', '#ef4444'];
const COLORS_LOTES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  summary, 
  clientesActuales = [], 
  pagosClientes = [],
  egresosFuturos = []
}) => {
  
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
  
  // Calcular saldo pendiente correctamente
  const totalSaldoPendiente = clientesActuales.reduce((sum, c) => {
    const abonosPosteriores = pagosClientes
      .filter(p => p.clienteId === c.id && 
                   p.tipoPago !== 'Depósito de Reserva' && 
                   p.tipoPago !== 'Cuota Inicial')
      .reduce((acc, p) => acc + (p.monto || 0), 0);
    
    const totalPagadoCliente = (c.depositoInicial || 0) + abonosPosteriores;
    const saldoCliente = (c.valorLote || 0) - totalPagadoCliente;
    return sum + Math.max(0, saldoCliente);
  }, 0);
  
  const porcentajePromedioPago = totalValorLotes > 0 ? Math.round((totalDepositosRecibidos / totalValorLotes) * 100) : 0;
  const clientesPagados = clientesActuales.filter(c => c.estado === 'pagado').length;
  const clientesEnCuota = clientesActuales.filter(c => c.estado === 'activo' || c.estado === 'mora').length;

  // Métricas de egresos futuros
  const egresosPendientes = egresosFuturos.filter(e => e.estado === 'pendiente');
  const totalEgresosFuturos = egresosPendientes.reduce((sum, e) => sum + e.monto, 0);
  const egresosProximos30Dias = egresosPendientes.filter(e => {
    const fechaEgreso = new Date(e.fecha);
    const hoy = new Date();
    const diferenciaDias = Math.floor((fechaEgreso.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferenciaDias <= 30 && diferenciaDias >= 0;
  });
  const totalEgresosProximos = egresosProximos30Dias.reduce((sum, e) => sum + e.monto, 0);

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

      // Sección de egresos futuros
      if (egresosPendientes.length > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Egresos Futuros Pendientes', 14, y);
        y += 8;

        // Tarjetas de egresos
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(14, y, 88, 20, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Pendiente', 58, y + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(redColor[0], redColor[1], redColor[2]);
        doc.text(`$${(totalEgresosFuturos / 1000).toFixed(0)}k`, 58, y + 15, { align: 'center' });

        doc.setFillColor(255, 237, 213);
        doc.roundedRect(108, y, 88, 20, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('Próximos 30 días', 152, y + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
        doc.text(`$${(totalEgresosProximos / 1000).toFixed(0)}k`, 152, y + 15, { align: 'center' });

        y += 28;
      }

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
          const abonosPosteriores = pagosClientes
            .filter(p => p.clienteId === cliente.id && 
                         p.tipoPago !== 'Depósito de Reserva' && 
                         p.tipoPago !== 'Cuota Inicial')
            .reduce((acc, p) => acc + (p.monto || 0), 0);
          
          const totalPagadoCliente = (cliente.depositoInicial || 0) + abonosPosteriores;
          const saldoPendiente = (cliente.valorLote || 0) - totalPagadoCliente;

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
        if (i > 1) {
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

      {/* SECCIÓN: Egresos Futuros (SI HAY PENDIENTES) */}
      {egresosPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">⚠️ Egresos Futuros Pendientes</h3>
                <p className="text-sm text-slate-600">Obligaciones programadas próximas</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total pendiente */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Pendiente</p>
                  <p className="text-2xl font-bold text-red-600">${totalEgresosFuturos.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{egresosPendientes.length} egresos</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign size={20} className="text-red-600" />
                </div>
              </div>
            </div>

            {/* Próximos 30 días */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Próximos 30 Días</p>
                  <p className="text-2xl font-bold text-orange-600">${totalEgresosProximos.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-1">{egresosProximos30Dias.length} egresos</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock size={20} className="text-orange-600" />
                </div>
              </div>
            </div>

            {/* Balance proyectado */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Balance Proyectado</p>
                  <p className={`text-2xl font-bold ${(summary.balance - totalEgresosProximos) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${(summary.balance - totalEgresosProximos).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Después de 30 días</p>
                </div>
                <div className={`p-2 rounded-lg ${(summary.balance - totalEgresosProximos) >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <Wallet size={20} className={(summary.balance - totalEgresosProximos) >= 0 ? 'text-blue-600' : 'text-red-600'} />
                </div>
              </div>
            </div>
          </div>

          {/* Lista de próximos egresos urgentes */}
          {egresosProximos30Dias.length > 0 && (
            <div className="mt-4 bg-white rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Próximos Egresos Urgentes</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {egresosProximos30Dias.slice(0, 5).map((egreso) => (
                  <div key={egreso.id} className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{egreso.categoria}</p>
                      <p className="text-xs text-slate-500">{new Date(egreso.fecha).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">${egreso.monto.toLocaleString()}</p>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">{egreso.tipo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Estado de Cobranza</h3>
              <div className="space-y-6">
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

          {/* Tabla de Clientes por Lote */}
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
                    <th className="px-6 py-4 text-right">Depósito Inicial</th>
                    <th className="px-6 py-4 text-right">Abonos Posteriores</th>
                    <th className="px-6 py-4 text-right">Total Pagado</th>
                    <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesActuales.slice(0, 5).map((cliente) => {
                    const abonosPosteriores = pagosClientes
                      .filter(p => p.clienteId === cliente.id && 
                                   p.tipoPago !== 'Depósito de Reserva' && 
                                   p.tipoPago !== 'Cuota Inicial')
                      .reduce((acc, p) => acc + (p.monto || 0), 0);
                    
                    const totalPagadoCliente = (cliente.depositoInicial || 0) + abonosPosteriores;
                    const saldoPendiente = (cliente.valorLote || 0) - totalPagadoCliente;
                    
                    return (
                      <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{cliente.nombre}</td>
                        <td className="px-6 py-4">#{cliente.numeroLote}</td>
                        <td className="px-6 py-4 text-right font-semibold">${cliente.valorLote?.toLocaleString() || 0}</td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                          ${cliente.depositoInicial?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-blue-600">
                          ${abonosPosteriores.toLocaleString()}
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