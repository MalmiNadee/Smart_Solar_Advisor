import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, Calendar, PiggyBank, Calculator
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";

interface FinancialCalculatorProps {
  totalEnergyKwh: number;
  systemKw?: number;
}

export const FinancialCalculator = ({ totalEnergyKwh, systemKw = 5 }: FinancialCalculatorProps) => {
  const [ratePerKwh, setRatePerKwh] = useState("");
  const [systemCost, setSystemCost] = useState("");
  const [calculated, setCalculated] = useState(false);

  const rate = parseFloat(ratePerKwh) || 0;
  const cost = parseFloat(systemCost) || 0;

  // Assume totalEnergyKwh is for the recorded period; extrapolate to yearly
  // We'll estimate annual energy based on the data period
  const dailyAvgKwh = totalEnergyKwh / 30; // approximate per day
  const annualKwh = dailyAvgKwh * 365;
  const monthlyKwh = dailyAvgKwh * 30;

  const monthlyRevenue = monthlyKwh * rate;
  const annualRevenue = annualKwh * rate;
  const paybackYears = cost > 0 && annualRevenue > 0 ? cost / annualRevenue : 0;
  const paybackMonths = paybackYears * 12;
  const roi25Years = annualRevenue * 25 - cost;

  // Year-by-year cumulative data (up to 25 years)
  const yearlyData = useMemo(() => {
    if (!rate || !cost) return [];
    return Array.from({ length: 25 }, (_, i) => {
      const year = i + 1;
      const cumRevenue = annualRevenue * year;
      const cumProfit = cumRevenue - cost;
      return {
        year: `Y${year}`,
        revenue: +cumRevenue.toFixed(2),
        profit: +cumProfit.toFixed(2),
        investment: cost,
      };
    });
  }, [rate, cost, annualRevenue]);

  // Monthly breakdown for first year
  const monthlyBreakdown = useMemo(() => {
    if (!rate) return [];
    return Array.from({ length: 12 }, (_, i) => ({
      month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
      revenue: +monthlyRevenue.toFixed(2),
      cumulative: +(monthlyRevenue * (i + 1)).toFixed(2),
    }));
  }, [rate, monthlyRevenue]);

  // Pie data for 25yr breakdown
  const pieData = useMemo(() => {
    if (!rate || !cost) return [];
    const totalRev = annualRevenue * 25;
    return [
      { name: "System Cost", value: cost },
      { name: "Net Profit (25yr)", value: Math.max(0, totalRev - cost) },
    ];
  }, [rate, cost, annualRevenue]);

  const PIE_COLORS = ["hsl(0, 84%, 60%)", "hsl(155, 70%, 45%)"];

  const isValid = rate > 0 && cost > 0;

  return (
    <div className="card-solar animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="h-5 w-5 text-solar-green" />
        <h3 className="text-lg font-semibold text-foreground">💰 Financial Analysis & ROI Calculator — {systemKw} kW System</h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mb-6">
        <div className="space-y-1.5">
          <Label htmlFor="rate">Government Buy Rate (per kWh)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="rate"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 22.00"
              value={ratePerKwh}
              onChange={(e) => { setRatePerKwh(e.target.value); setCalculated(false); }}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sysCost">Total System Cost</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="sysCost"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 500000"
              value={systemCost}
              onChange={(e) => { setSystemCost(e.target.value); setCalculated(false); }}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={() => setCalculated(true)} disabled={!isValid} className="h-10">
          <Calculator className="mr-2 h-4 w-4" /> Calculate ROI
        </Button>
      </div>

      {calculated && isValid && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4 bg-solar-gold-light/30 text-center">
              <PiggyBank className="h-6 w-6 mx-auto mb-1 text-solar-gold" />
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              <p className="text-xl font-extrabold text-foreground">{monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">LKR/month</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-solar-green-light/30 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-solar-green" />
              <p className="text-xs text-muted-foreground">Annual Revenue</p>
              <p className="text-xl font-extrabold text-foreground">{annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">LKR/year</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-sky-50 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-1 text-solar-sky" />
              <p className="text-xs text-muted-foreground">Payback Period</p>
              <p className="text-xl font-extrabold text-foreground">{paybackYears.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">years ({paybackMonths.toFixed(0)} months)</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-green-50 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-solar-green" />
              <p className="text-xs text-muted-foreground">25-Year Net Profit</p>
              <p className="text-xl font-extrabold text-foreground">{roi25Years.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">LKR</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumulative Revenue vs Investment (Area) */}
            <div className="card-solar">
              <h4 className="text-sm font-semibold text-foreground mb-4">📈 Cumulative Revenue vs Investment (25 Years)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(155, 70%, 45%)" fill="hsl(155, 70%, 45%)" fillOpacity={0.2} name="Cumulative Revenue" />
                  <Area type="monotone" dataKey="investment" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.1} name="System Cost" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Over Time (Bar) */}
            <div className="card-solar">
              <h4 className="text-sm font-semibold text-foreground mb-4">📊 Net Profit by Year</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="profit" name="Net Profit" fill="hsl(155, 70%, 45%)">
                    {yearlyData.map((entry, index) => (
                      <Cell key={index} fill={entry.profit < 0 ? "hsl(0, 84%, 60%)" : "hsl(155, 70%, 45%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue First Year (Line) */}
            <div className="card-solar">
              <h4 className="text-sm font-semibold text-foreground mb-4">📅 First Year Monthly Revenue</h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(42, 100%, 50%)" strokeWidth={2} dot name="Monthly Revenue" />
                  <Line type="monotone" dataKey="cumulative" stroke="hsl(155, 70%, 45%)" strokeWidth={2} dot name="Cumulative" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Investment Breakdown Pie */}
            <div className="card-solar">
              <h4 className="text-sm font-semibold text-foreground mb-4">🥧 25-Year Investment vs Profit</h4>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="card-solar">
            <h4 className="text-sm font-semibold text-foreground mb-4">📋 Year-by-Year Financial Projection</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Year</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Annual Energy (kWh)</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Annual Revenue</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Cumulative Revenue</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Net Profit</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyData.map((row, i) => (
                    <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                      <td className="py-2 px-3 font-medium">{row.year}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{annualKwh.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{annualRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.revenue.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${row.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {row.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {row.profit >= 0 ? (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Profit</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Recovering</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
