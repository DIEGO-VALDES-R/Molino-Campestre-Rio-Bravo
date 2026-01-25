import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction, FinancialSummary } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  summary: FinancialSummary;
}

const COLORS = ['#10b981', '#ef4444'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions, summary }) => {
  
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
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
    </div>
  );
};
