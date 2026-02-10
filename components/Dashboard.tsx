import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Transaction, FinancialSummary, ClienteActual, PagoCliente, EgresoFuturo } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Home, Users, Printer, AlertCircle, Clock, ChevronDown, ChevronUp, FileText, Calendar } from 'lucide-react';
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

// ============================================
// UTILIDADES DE FORMATO
// ============================================

const formatearMoneda = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
};

const formatearMiles = (valor: number): string => {
  if (valor >= 1000000) {
    return `$${(valor / 1000000).toFixed(1)}M`;
  } else if (valor >= 1000) {
    return `$${(valor / 1000).toFixed(0)}K`;
  }
  return formatearMoneda(valor);
};

const formatearPorcentaje = (valor: number): string => {
  return `${valor.toFixed(1)}%`;
};

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  summary,
  clientesActuales = [],
  pagosClientes = [],
  egresosFuturos = []
}) => {
 
  const [expandEgresos, setExpandEgresos] = React.useState(false);

  // ============================================
  // CÁLCULOS FINANCIEROS MEJORADOS
  // ============================================

  const metricas = useMemo(() => {
    // Métricas de lotes
    const totalLotes = clientesActuales.length;
    const totalValorLotes = clientesActuales.reduce((sum, c) => sum + (c.valorLote || 0), 0);
    
    // Cálculo correcto de ingresos recibidos
    const totalDepositosIniciales = clientesActuales.reduce((sum, c) => sum + (c.depositoInicial || 0), 0);
    const totalAbonosPosteriors = pagosClientes
      .filter(p => p.tipoPago !== 'Depósito de Reserva' && p.tipoPago !== 'Cuota Inicial')
      .reduce((sum, p) => sum + (p.monto || 0), 0);
    const totalIngresosRecibidos = totalDepositosIniciales + totalAbonosPosteriors;
    
    // Saldo pendiente por cliente
    const detalleClientes = clientesActuales.map(c => {
      const pagosCliente = pagosClientes.filter(p => p.clienteId === c.id);
      const totalPagadoCliente = pagosCliente.reduce((sum, p) => sum + (p.monto || 0), 0);
      const saldoPendiente = (c.valorLote || 0) - totalPagadoCliente;
      
      return {
        ...c,
        totalPagado: totalPagadoCliente,
        saldoPendiente: Math.max(0, saldoPendiente),
        porcentajePagado: c.valorLote ? (totalPagadoCliente / c.valorLote) * 100 : 0
      };
    });
    
    const totalSaldoPendiente = detalleClientes.reduce((sum, c) => sum + c.saldoPendiente, 0);
    
    // Estados de clientes
    const clientesPagados = clientesActuales.filter(c => c.estado === 'pagado').length;
    const clientesActivos = clientesActuales.filter(c => c.estado === 'activo').length;
    const clientesMora = clientesActuales.filter(c => c.estado === 'mora').length;
    
    // Egresos futuros
    const egresosPendientes = egresosFuturos.filter(e => e.estado === 'pendiente');
    const totalEgresosFuturos = egresosPendientes.reduce((sum, e) => sum + (e.monto || 0), 0);
    
    const hoy = new Date();
    const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const egresosProximos30 = egresosPendientes.filter(e => {
      const fechaEgreso = new Date(e.fecha);
      return fechaEgreso >= hoy && fechaEgreso <= en30Dias;
    });
    
    const totalEgresosProximos30 = egresosProximos30.reduce((sum, e) => sum + (e.monto || 0), 0);
    
    // Balance proyectado
    const balanceProyectado30Dias = summary.balance - totalEgresosProximos30;
    
    // Tasa de cobro
    const tasaCobro = totalValorLotes > 0 ? (totalIngresosRecibidos / totalValorLotes) * 100 : 0;
    
    return {
      totalLotes,
      totalValorLotes,
      totalIngresosRecibidos,
      totalSaldoPendiente,
      clientesPagados,
      clientesActivos,
      clientesMora,
      egresosPendientes,
      totalEgresosFuturos,
      egresosProximos30,
      totalEgresosProximos30,
      balanceProyectado30Dias,
      tasaCobro,
      detalleClientes
    };
  }, [clientesActuales, pagosClientes, egresosFuturos, summary]);

  // ============================================
  // DATOS PARA GRÁFICOS
  // ============================================

  const chartData = useMemo(() => {
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        yearMonth: d.toISOString().slice(0, 7),
        label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('es-CO', { 
          month: 'short', 
          year: '2-digit' 
        })
      };
    }).reverse();

    return ultimos6Meses.map(mes => {
      const transaccionesMes = transactions.filter(t => t.date.startsWith(mes.yearMonth));
      const ingresos = transaccionesMes
        .filter(t => t.type === 'ingreso')
        .reduce((acc, curr) => acc + curr.amount, 0);
      const egresos = transaccionesMes
        .filter(t => t.type === 'egreso')
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      return {
        name: mes.label,
        Ingresos: ingresos,
        Egresos: egresos,
        Balance: ingresos - egresos
      };
    });
  }, [transactions]);

  const pieData = [
    { name: 'Ingresos', value: summary.totalIncome },
    { name: 'Egresos', value: summary.totalExpense },
  ];

  const cobranzaData = useMemo(() => {
    const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return {
        yearMonth: d.toISOString().slice(0, 7),
        label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('es-CO', { 
          month: 'short', 
          year: '2-digit' 
        })
      };
    }).reverse();

    return ultimos6Meses.map(mes => {
      const cobranzasMes = pagosClientes
        .filter(p => p.fechaPago.startsWith(mes.yearMonth))
        .reduce((sum, p) => sum + p.monto, 0);
      
      const metaMensual = metricas.totalValorLotes / 12; // Meta anual dividida en 12 meses
      
      return {
        name: mes.label,
        Cobranzas: cobranzasMes,
        Meta: metaMensual
      };
    });
  }, [pagosClientes, metricas.totalValorLotes]);

  // ============================================
  // EXPORTACIÓN A PDF MEJORADA
  // ============================================

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Colores corporativos
      const azulOscuro = [30, 58, 138];
      const azulMedio = [59, 130, 246];
      const verde = [16, 185, 129];
      const rojo = [239, 68, 68];
      const naranja = [249, 115, 22];
      const gris = [100, 116, 139];
      const grisClaro = [241, 245, 249];

      // ===== PORTADA =====
      doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Título principal
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE', 105, 100, { align: 'center' });
      doc.text('FINANCIERO', 105, 115, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Dashboard Ejecutivo', 105, 135, { align: 'center' });
      
      // Fecha
      const fechaActual = new Date();
      const nombreMes = fechaActual.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
      doc.setFontSize(12);
      doc.text(nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1), 105, 150, { align: 'center' });
      
      // Footer
      doc.setFontSize(10);
      doc.text('Molino Campestre Rio Bravo', 105, 260, { align: 'center' });
      doc.setFontSize(8);
      doc.text('Sistema de Gestión Financiera', 105, 268, { align: 'center' });

      // ===== PÁGINA 2: RESUMEN EJECUTIVO =====
      doc.addPage();
      
      let y = 20;
      
      // Encabezado
      doc.setFillColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN EJECUTIVO', 105, 15, { align: 'center' });
      
      y = 35;
      
      // === SECCIÓN 1: BALANCE GENERAL ===
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.text('1. BALANCE GENERAL', 15, y);
      
      y += 8;
      
      // Tarjetas de KPIs principales
      const kpisPrincipales = [
        {
          titulo: 'INGRESOS TOTALES',
          valor: summary.totalIncome,
          color: verde,
          bgColor: [220, 252, 231]
        },
        {
          titulo: 'EGRESOS TOTALES',
          valor: summary.totalExpense,
          color: rojo,
          bgColor: [254, 226, 226]
        },
        {
          titulo: 'SALDO ACTUAL',
          valor: summary.balance,
          color: summary.balance >= 0 ? azulMedio : naranja,
          bgColor: summary.balance >= 0 ? [219, 234, 254] : [255, 237, 213]
        }
      ];
      
      kpisPrincipales.forEach((kpi, idx) => {
        const x = 15 + (idx * 62);
        
        // Fondo de tarjeta
        doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
        doc.roundedRect(x, y, 58, 25, 2, 2, 'F');
        
        // Título
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(kpi.titulo, x + 29, y + 6, { align: 'center' });
        
        // Valor
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(formatearMiles(kpi.valor), x + 29, y + 15, { align: 'center' });
        
        // Valor completo pequeño
        doc.setFontSize(6);
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(formatearMoneda(kpi.valor), x + 29, y + 20, { align: 'center' });
      });
      
      y += 35;
      
      // === SECCIÓN 2: MÉTRICAS DE VENTA DE LOTES ===
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.text('2. MÉTRICAS DE VENTA DE LOTES', 15, y);
      
      y += 8;
      
      const kpisLotes = [
        {
          titulo: 'LOTES VENDIDOS',
          valor: metricas.totalLotes.toString(),
          subtitulo: 'Total clientes',
          color: azulMedio,
          bgColor: [219, 234, 254]
        },
        {
          titulo: 'VALOR TOTAL',
          valor: formatearMiles(metricas.totalValorLotes),
          subtitulo: formatearMoneda(metricas.totalValorLotes),
          color: verde,
          bgColor: [220, 252, 231]
        },
        {
          titulo: 'INGRESADO',
          valor: formatearMiles(metricas.totalIngresosRecibidos),
          subtitulo: formatearPorcentaje(metricas.tasaCobro),
          color: verde,
          bgColor: [220, 252, 231]
        },
        {
          titulo: 'POR COBRAR',
          valor: formatearMiles(metricas.totalSaldoPendiente),
          subtitulo: formatearMoneda(metricas.totalSaldoPendiente),
          color: naranja,
          bgColor: [255, 237, 213]
        }
      ];
      
      kpisLotes.forEach((kpi, idx) => {
        const x = 15 + (idx * 46);
        
        doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
        doc.roundedRect(x, y, 43, 22, 2, 2, 'F');
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(kpi.titulo, x + 21.5, y + 5, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.valor, x + 21.5, y + 12, { align: 'center' });
        
        doc.setFontSize(5);
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(kpi.subtitulo, x + 21.5, y + 17, { align: 'center' });
      });
      
      y += 30;
      
      // === SECCIÓN 3: ESTADO DE CLIENTES ===
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.text('3. ESTADO DE CLIENTES', 15, y);
      
      y += 8;
      
      const estadosClientes = [
        { label: 'Pagados', valor: metricas.clientesPagados, total: metricas.totalLotes, color: verde },
        { label: 'Activos', valor: metricas.clientesActivos, total: metricas.totalLotes, color: azulMedio },
        { label: 'En Mora', valor: metricas.clientesMora, total: metricas.totalLotes, color: rojo }
      ];
      
      estadosClientes.forEach((estado, idx) => {
        const x = 15 + (idx * 62);
        const porcentaje = estado.total > 0 ? (estado.valor / estado.total) * 100 : 0;
        
        doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
        doc.roundedRect(x, y, 58, 20, 2, 2, 'F');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(gris[0], gris[1], gris[2]);
        doc.text(estado.label, x + 4, y + 6);
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(estado.color[0], estado.color[1], estado.color[2]);
        doc.text(estado.valor.toString(), x + 29, y + 13, { align: 'center' });
        
        // Barra de progreso
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x + 4, y + 16, 50, 2, 'S');
        doc.setFillColor(estado.color[0], estado.color[1], estado.color[2]);
        doc.rect(x + 4, y + 16, (50 * porcentaje) / 100, 2, 'F');
      });
      
      y += 28;
      
      // === SECCIÓN 4: BALANCE MENSUAL ===
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.text('4. BALANCE MENSUAL (ÚLTIMOS 6 MESES)', 15, y);
      
      y += 8;
      
      // Tabla de balance
      doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
      doc.rect(15, y, 180, 7, 'F');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
      doc.text('MES', 20, y + 4.5);
      doc.text('INGRESOS', 75, y + 4.5, { align: 'right' });
      doc.text('EGRESOS', 120, y + 4.5, { align: 'right' });
      doc.text('BALANCE', 175, y + 4.5, { align: 'right' });
      
      y += 7;
      
      chartData.forEach((mes, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, y, 180, 6, 'F');
        }
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(mes.name, 20, y + 4);
        
        doc.setTextColor(verde[0], verde[1], verde[2]);
        doc.text(formatearMiles(mes.Ingresos), 75, y + 4, { align: 'right' });
        
        doc.setTextColor(rojo[0], rojo[1], rojo[2]);
        doc.text(formatearMiles(mes.Egresos), 120, y + 4, { align: 'right' });
        
        const esPositivo = mes.Balance >= 0;
        doc.setTextColor(esPositivo ? verde[0] : rojo[0], esPositivo ? verde[1] : rojo[1], esPositivo ? verde[2] : rojo[2]);
        doc.text(formatearMiles(mes.Balance), 175, y + 4, { align: 'right' });
        
        y += 6;
      });
      
      // Borde de tabla
      doc.setDrawColor(gris[0], gris[1], gris[2]);
      doc.setLineWidth(0.3);
      doc.rect(15, y - 42, 180, 49);

      // ===== PÁGINA 3: EGRESOS FUTUROS =====
      if (metricas.egresosPendientes.length > 0) {
        doc.addPage();
        
        y = 20;
        
        // Encabezado
        doc.setFillColor(naranja[0], naranja[1], naranja[2]);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('EGRESOS FUTUROS PENDIENTES', 105, 15, { align: 'center' });
        
        y = 35;
        
        // KPIs de egresos
        const kpisEgresos = [
          {
            titulo: 'TOTAL PENDIENTE',
            valor: metricas.totalEgresosFuturos,
            subtitulo: `${metricas.egresosPendientes.length} egresos`,
            color: rojo,
            bgColor: [254, 226, 226]
          },
          {
            titulo: 'PRÓXIMOS 30 DÍAS',
            valor: metricas.totalEgresosProximos30,
            subtitulo: `${metricas.egresosProximos30.length} egresos`,
            color: naranja,
            bgColor: [255, 237, 213]
          },
          {
            titulo: 'BALANCE PROYECTADO',
            valor: metricas.balanceProyectado30Dias,
            subtitulo: 'Después de 30 días',
            color: metricas.balanceProyectado30Dias >= 0 ? verde : rojo,
            bgColor: metricas.balanceProyectado30Dias >= 0 ? [220, 252, 231] : [254, 226, 226]
          }
        ];
        
        kpisEgresos.forEach((kpi, idx) => {
          const x = 15 + (idx * 62);
          
          doc.setFillColor(kpi.bgColor[0], kpi.bgColor[1], kpi.bgColor[2]);
          doc.roundedRect(x, y, 58, 25, 2, 2, 'F');
          
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(gris[0], gris[1], gris[2]);
          doc.text(kpi.titulo, x + 29, y + 6, { align: 'center' });
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
          doc.text(formatearMiles(kpi.valor), x + 29, y + 14, { align: 'center' });
          
          doc.setFontSize(6);
          doc.setTextColor(gris[0], gris[1], gris[2]);
          doc.text(kpi.subtitulo, x + 29, y + 20, { align: 'center' });
        });
        
        y += 33;
        
        // Tabla de egresos detallada
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
        doc.text('DETALLE DE EGRESOS PENDIENTES', 15, y);
        
        y += 6;
        
        doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
        doc.rect(15, y, 180, 7, 'F');
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
        doc.text('FECHA', 18, y + 4.5);
        doc.text('CATEGORÍA', 45, y + 4.5);
        doc.text('TIPO', 85, y + 4.5);
        doc.text('DESCRIPCIÓN', 115, y + 4.5);
        doc.text('MONTO', 175, y + 4.5, { align: 'right' });
        
        y += 7;
        
        // Ordenar por fecha
        const egresosOrdenados = [...metricas.egresosPendientes].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        
        egresosOrdenados.forEach((egreso, idx) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, y, 180, 6, 'F');
          }
          
          const fechaEgreso = new Date(egreso.fecha);
          const diasFaltantes = Math.ceil((fechaEgreso.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const esUrgente = diasFaltantes <= 7 && diasFaltantes >= 0;
          
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          
          // Destacar urgentes
          if (esUrgente) {
            doc.setFillColor(254, 226, 226);
            doc.rect(15, y, 180, 6, 'F');
            doc.setTextColor(rojo[0], rojo[1], rojo[2]);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          
          doc.text(fechaEgreso.toLocaleDateString('es-CO'), 18, y + 4);
          doc.text(egreso.categoria.substring(0, 18), 45, y + 4);
          doc.text(egreso.tipo.substring(0, 12), 85, y + 4);
          doc.text(egreso.descripcion ? egreso.descripcion.substring(0, 20) : '-', 115, y + 4);
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(rojo[0], rojo[1], rojo[2]);
          doc.text(formatearMiles(egreso.monto), 175, y + 4, { align: 'right' });
          
          y += 6;
        });
        
        doc.setDrawColor(gris[0], gris[1], gris[2]);
        doc.setLineWidth(0.3);
        doc.rect(15, 48, 180, y - 48);
      }

      // ===== PÁGINA 4: TOP CLIENTES =====
      if (metricas.detalleClientes.length > 0) {
        doc.addPage();
        
        y = 20;
        
        // Encabezado
        doc.setFillColor(verde[0], verde[1], verde[2]);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP 10 CLIENTES POR LOTE', 105, 15, { align: 'center' });
        
        y = 35;
        
        // Tabla de clientes
        doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
        doc.rect(15, y, 180, 7, 'F');
        
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(azulOscuro[0], azulOscuro[1], azulOscuro[2]);
        doc.text('CLIENTE', 18, y + 4.5);
        doc.text('LOTE', 70, y + 4.5);
        doc.text('VALOR', 90, y + 4.5, { align: 'right' });
        doc.text('PAGADO', 120, y + 4.5, { align: 'right' });
        doc.text('PENDIENTE', 155, y + 4.5, { align: 'right' });
        doc.text('%', 170, y + 4.5, { align: 'right' });
        doc.text('ESTADO', 190, y + 4.5, { align: 'right' });
        
        y += 7;
        
        // Ordenar por valor de lote
        const topClientes = [...metricas.detalleClientes]
          .sort((a, b) => (b.valorLote || 0) - (a.valorLote || 0))
          .slice(0, 10);
        
        topClientes.forEach((cliente, idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(15, y, 180, 7, 'F');
          }
          
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          
          const nombreCorto = cliente.nombre.length > 25 ? cliente.nombre.substring(0, 23) + '...' : cliente.nombre;
          doc.text(nombreCorto, 18, y + 4.5);
          doc.text(`#${cliente.numeroLote}`, 70, y + 4.5);
          
          doc.setTextColor(gris[0], gris[1], gris[2]);
          doc.text(formatearMiles(cliente.valorLote || 0), 90, y + 4.5, { align: 'right' });
          
          doc.setTextColor(verde[0], verde[1], verde[2]);
          doc.text(formatearMiles(cliente.totalPagado), 120, y + 4.5, { align: 'right' });
          
          doc.setTextColor(naranja[0], naranja[1], naranja[2]);
          doc.text(formatearMiles(cliente.saldoPendiente), 155, y + 4.5, { align: 'right' });
          
          doc.setTextColor(azulMedio[0], azulMedio[1], azulMedio[2]);
          doc.text(formatearPorcentaje(cliente.porcentajePagado), 170, y + 4.5, { align: 'right' });
          
          // Estado con color
          let colorEstado = azulMedio;
          if (cliente.estado === 'pagado') colorEstado = verde;
          else if (cliente.estado === 'mora') colorEstado = rojo;
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colorEstado[0], colorEstado[1], colorEstado[2]);
          doc.text(cliente.estado.toUpperCase(), 190, y + 4.5, { align: 'right' });
          
          y += 7;
        });
        
        doc.setDrawColor(gris[0], gris[1], gris[2]);
        doc.setLineWidth(0.3);
        doc.rect(15, 42, 180, y - 42);
      }

      // ===== FOOTER EN TODAS LAS PÁGINAS =====
      const totalPaginas = doc.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        
        if (i > 1) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(gris[0], gris[1], gris[2]);
          doc.text(
            `Molino Campestre Rio Bravo | Página ${i} de ${totalPaginas} | ${new Date().toLocaleDateString('es-CO')}`,
            105,
            287,
            { align: 'center' }
          );
        }
      }

      // Guardar
      const nombreArchivo = `Reporte_Financiero_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor intente nuevamente.');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado con botón de exportación */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Financiero</h1>
          <p className="text-sm text-slate-500 mt-1">
            Última actualización: {new Date().toLocaleDateString('es-CO', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          title="Exportar Dashboard a PDF"
        >
          <Printer size={18} />
          <span className="font-medium">Exportar PDF</span>
        </button>
      </div>

      {/* SECCIÓN 1: KPI Cards Generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl shadow-md border border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <TrendingUp size={24} className="text-emerald-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ingresos Totales</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-900">{formatearMiles(summary.totalIncome)}</p>
          <p className="text-xs text-emerald-700 mt-1">{formatearMoneda(summary.totalIncome)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-md border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <TrendingDown size={24} className="text-red-600" />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Egresos Totales</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-red-900">{formatearMiles(summary.totalExpense)}</p>
          <p className="text-xs text-red-700 mt-1">{formatearMoneda(summary.totalExpense)}</p>
        </div>

        <div className={`bg-gradient-to-br ${summary.balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-6 rounded-xl shadow-md border`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Wallet size={24} className={summary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'} />
            </div>
            <div className="text-right">
              <p className={`text-xs font-semibold ${summary.balance >= 0 ? 'text-blue-700' : 'text-orange-700'} uppercase tracking-wide`}>Saldo Actual</p>
            </div>
          </div>
          <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {formatearMiles(summary.balance)}
          </p>
          <p className={`text-xs ${summary.balance >= 0 ? 'text-blue-700' : 'text-orange-700'} mt-1`}>
            {formatearMoneda(summary.balance)}
          </p>
        </div>
      </div>

      {/* SECCIÓN: Egresos Futuros */}
      {metricas.egresosPendientes.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 via-red-50 to-orange-50 border-2 border-orange-300 rounded-xl p-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md">
                <AlertCircle size={26} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  ⚠️ Egresos Futuros Pendientes
                </h3>
                <p className="text-sm text-slate-600">Obligaciones programadas próximas</p>
              </div>
            </div>
            <button
              onClick={() => setExpandEgresos(!expandEgresos)}
              className="p-2 hover:bg-orange-200 rounded-lg transition-all"
              title={expandEgresos ? 'Contraer' : 'Expandir'}
            >
              {expandEgresos ? (
                <ChevronUp size={22} className="text-orange-700" />
              ) : (
                <ChevronDown size={22} className="text-orange-700" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Total pendiente */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">Total Pendiente</p>
                  <p className="text-2xl font-bold text-red-600">{formatearMiles(metricas.totalEgresosFuturos)}</p>
                  <p className="text-xs text-slate-500 mt-1">{metricas.egresosPendientes.length} egresos</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatearMoneda(metricas.totalEgresosFuturos)}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <DollarSign size={22} className="text-red-600" />
                </div>
              </div>
            </div>

            {/* Próximos 30 días */}
            <div className="bg-white rounded-xl p-5 shadow-md border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">Próximos 30 Días</p>
                  <p className="text-2xl font-bold text-orange-600">{formatearMiles(metricas.totalEgresosProximos30)}</p>
                  <p className="text-xs text-slate-500 mt-1">{metricas.egresosProximos30.length} egresos</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatearMoneda(metricas.totalEgresosProximos30)}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock size={22} className="text-orange-600" />
                </div>
              </div>
            </div>

            {/* Balance proyectado */}
            <div className={`bg-white rounded-xl p-5 shadow-md border ${metricas.balanceProyectado30Dias >= 0 ? 'border-blue-200' : 'border-red-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">Balance Proyectado</p>
                  <p className={`text-2xl font-bold ${metricas.balanceProyectado30Dias >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatearMiles(metricas.balanceProyectado30Dias)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Después de 30 días</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatearMoneda(metricas.balanceProyectado30Dias)}</p>
                </div>
                <div className={`p-3 rounded-lg ${metricas.balanceProyectado30Dias >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <Wallet size={22} className={metricas.balanceProyectado30Dias >= 0 ? 'text-blue-600' : 'text-red-600'} />
                </div>
              </div>
            </div>
          </div>

          {/* Lista expandible de egresos */}
          {expandEgresos && (
            <div className="mt-4 bg-white rounded-xl p-5 max-h-96 overflow-y-auto shadow-inner border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FileText size={16} />
                Todos los Egresos Pendientes ({metricas.egresosPendientes.length})
              </h4>
              <div className="space-y-2">
                {metricas.egresosPendientes
                  .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
                  .map((egreso) => {
                    const diasFalta = Math.floor((new Date(egreso.fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const esUrgente = diasFalta <= 7 && diasFalta >= 0;
                    
                    return (
                      <div
                        key={egreso.id}
                        className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                          esUrgente
                            ? 'bg-red-50 border-2 border-red-300 hover:bg-red-100 shadow-md'
                            : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-900">{egreso.categoria}</p>
                            {esUrgente && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-sm">
                                ¡URGENTE! ({diasFalta}d)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {new Date(egreso.fecha).toLocaleDateString('es-CO', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              })}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-700 font-medium">
                              {egreso.tipo}
                            </span>
                            {egreso.descripcion && (
                              <span className="italic text-slate-500">"{egreso.descripcion}"</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-base font-bold text-orange-600">{formatearMiles(egreso.monto)}</p>
                          <p className="text-xs text-slate-500">{formatearMoneda(egreso.monto)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            Balance Mensual
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => formatearMiles(value)}
              />
              <Tooltip
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'white'
                }}
                formatter={(value: number) => formatearMoneda(value)}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Egresos" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-indigo-600" />
            Distribución de Flujo
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={90}
                outerRadius={130}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${formatearMiles(value)}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatearMoneda(value)} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECCIÓN: Venta de Lotes */}
      {clientesActuales.length > 0 && (
        <>
          <div className="border-t-2 border-slate-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Home size={28} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Ingresos por Venta de Lotes</h3>
                <p className="text-sm text-slate-600">Resumen completo de ventas y cobranzas</p>
              </div>
            </div>
          </div>

          {/* KPIs de Lotes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <Users size={24} className="text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Lotes Vendidos</p>
                </div>
              </div>
              <p className="text-4xl font-bold text-blue-900">{metricas.totalLotes}</p>
              <p className="text-xs text-blue-700 mt-1">Clientes activos</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border border-green-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <DollarSign size={24} className="text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Valor Total</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-900">{formatearMiles(metricas.totalValorLotes)}</p>
              <p className="text-xs text-green-700 mt-1">{formatearMoneda(metricas.totalValorLotes)}</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-md border border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <TrendingUp size={24} className="text-emerald-600" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ingresado</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-900">{formatearMiles(metricas.totalIngresosRecibidos)}</p>
              <p className="text-xs text-emerald-700 mt-1">{formatearPorcentaje(metricas.tasaCobro)} cobrado</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border border-orange-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <AlertCircle size={24} className="text-orange-600" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Por Cobrar</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-900">{formatearMiles(metricas.totalSaldoPendiente)}</p>
              <p className="text-xs text-orange-700 mt-1">{formatearMoneda(metricas.totalSaldoPendiente)}</p>
            </div>
          </div>

          {/* Gráficos de Lotes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Cobranzas vs Meta Mensual</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={cobranzaData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={(value) => formatearMiles(value)}
                  />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'white'
                    }}
                    formatter={(value: number) => formatearMoneda(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Cobranzas" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#10b981' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Meta" 
                    stroke="#94a3b8" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Estado de Cobranza</h3>
              <div className="space-y-6">
                {/* Indicador circular */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-2 font-medium">Tasa de Cobranza</p>
                    <p className="text-5xl font-bold text-emerald-600">{formatearPorcentaje(metricas.tasaCobro)}</p>
                    <p className="text-xs text-slate-500 mt-2">Del valor total facturado</p>
                  </div>
                  <div className="relative w-36 h-36">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="10"
                        strokeDasharray={`${(metricas.tasaCobro / 100) * 263.89} 263.89`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-900">{Math.round(metricas.tasaCobro)}%</span>
                    </div>
                  </div>
                </div>

                {/* Estados de clientes */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-2 font-medium">Pagados</p>
                    <p className="text-3xl font-bold text-green-600">{metricas.clientesPagados}</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${metricas.totalLotes > 0 ? (metricas.clientesPagados / metricas.totalLotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-2 font-medium">Activos</p>
                    <p className="text-3xl font-bold text-blue-600">{metricas.clientesActivos}</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${metricas.totalLotes > 0 ? (metricas.clientesActivos / metricas.totalLotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600 mb-2 font-medium">En Mora</p>
                    <p className="text-3xl font-bold text-red-600">{metricas.clientesMora}</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${metricas.totalLotes > 0 ? (metricas.clientesMora / metricas.totalLotes) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Top Clientes */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <h4 className="font-bold text-slate-900 text-lg">Top 10 Clientes por Lote</h4>
              <p className="text-sm text-slate-600 mt-1">Ordenados por valor de lote</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-900 font-semibold uppercase text-xs border-b-2 border-slate-300">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Lote</th>
                    <th className="px-6 py-4 text-right">Valor Lote</th>
                    <th className="px-6 py-4 text-right">Total Pagado</th>
                    <th className="px-6 py-4 text-right">Saldo Pendiente</th>
                    <th className="px-6 py-4 text-center">% Pagado</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {metricas.detalleClientes
                    .sort((a, b) => (b.valorLote || 0) - (a.valorLote || 0))
                    .slice(0, 10)
                    .map((cliente, idx) => (
                      <tr key={cliente.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{cliente.nombre}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono text-xs">
                            #{cliente.numeroLote}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-slate-900">{formatearMiles(cliente.valorLote || 0)}</div>
                          <div className="text-xs text-slate-500">{formatearMoneda(cliente.valorLote || 0)}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-emerald-600">{formatearMiles(cliente.totalPagado)}</div>
                          <div className="text-xs text-slate-500">{formatearMoneda(cliente.totalPagado)}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-orange-600">{formatearMiles(cliente.saldoPendiente)}</div>
                          <div className="text-xs text-slate-500">{formatearMoneda(cliente.saldoPendiente)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-blue-600">{formatearPorcentaje(cliente.porcentajePagado)}</span>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${cliente.porcentajePagado}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              cliente.estado === 'pagado'
                                ? 'bg-green-100 text-green-800'
                                : cliente.estado === 'mora'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {cliente.estado.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};