import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { investmentApi } from '../services/api';
import { useFormatCurrency } from './StatsCards';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function resolveColor(cssVar) {
  const varName = cssVar.replace('var(', '').replace(')', '');
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || cssVar;
}

/**
 * Build month buckets for a given year from SELL transactions.
 * Each bucket has: { month, label, total, trades: [{ ticker, name, realizedGainLoss }] }
 */
function buildMonthlyData(transactions, year) {
  const months = MONTH_LABELS.map((label, i) => ({
    month: i,
    label,
    total: 0,
    trades: [],
  }));

  transactions
    .filter(t => t.type === 'SELL' && t.realizedGainLoss != null)
    .forEach(t => {
      const d = new Date(t.transactionDate);
      if (d.getFullYear() !== year) return;
      const m = d.getMonth();
      months[m].total += Number(t.realizedGainLoss);
      months[m].trades.push({
        ticker: t.ticker,
        name: t.name,
        realizedGainLoss: Number(t.realizedGainLoss),
      });
    });

  return months;
}

function getAvailableYears(transactions) {
  const years = new Set();
  transactions
    .filter(t => t.type === 'SELL' && t.realizedGainLoss != null)
    .forEach(t => years.add(new Date(t.transactionDate).getFullYear()));
  if (years.size === 0) years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}

/** Custom tooltip showing month total + per-trade breakdown */
function MonthTooltip({ active, payload, fc }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.trades.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem',
      minWidth: 200, maxWidth: 300,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.9rem' }}>
        {MONTH_LABELS[d.month]} {payload[0]?.payload?._year}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 6,
        fontWeight: 700, fontSize: '0.88rem',
        color: d.total >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
      }}>
        <span>Total</span>
        <span>{fc(d.total)}</span>
      </div>
      {d.trades.map((t, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16,
          padding: '2px 0', color: 'var(--text-secondary)',
        }}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
          }}>
            {t.name}
          </span>
          <span className="mono" style={{
            color: t.realizedGainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            whiteSpace: 'nowrap',
          }}>
            {fc(t.realizedGainLoss)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RealizedGainsChart() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('M'); // M = monthly, Q = quarterly
  const fc = useFormatCurrency();

  useEffect(() => {
    investmentApi.getAllTransactions()
      .then(data => { setTransactions(data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const years = useMemo(() => getAvailableYears(transactions), [transactions]);
  const monthlyData = useMemo(() => buildMonthlyData(transactions, selectedYear), [transactions, selectedYear]);

  const chartData = useMemo(() => {
    if (viewMode === 'Q') {
      // Aggregate into quarters
      return [0, 1, 2, 3].map(q => {
        const mStart = q * 3;
        const trades = [];
        let total = 0;
        for (let i = mStart; i < mStart + 3; i++) {
          total += monthlyData[i].total;
          trades.push(...monthlyData[i].trades);
        }
        return { month: mStart, label: `Q${q + 1}`, total, trades, _year: selectedYear };
      });
    }
    return monthlyData.map(m => ({ ...m, _year: selectedYear }));
  }, [monthlyData, viewMode, selectedYear]);

  const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);
  const monthsWithTrades = monthlyData.filter(m => m.trades.length > 0).length;
  const yearAvg = monthsWithTrades > 0 ? yearTotal / monthsWithTrades : 0;

  // Check if there are any SELL transactions at all
  const hasTrades = transactions.some(t => t.type === 'SELL' && t.realizedGainLoss != null);

  if (loading) {
    return (
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-header"><span className="card-title">Realized Gains by Month</span></div>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <span className="spinner" /> Loading transactions...
        </div>
      </div>
    );
  }

  if (!hasTrades) return null;

  const green = resolveColor('var(--accent-green)');
  const red = resolveColor('var(--accent-red)');

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">Realized Gains by Month</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Year selector */}
          {years.length > 1 && (
            <select className="form-input"
                    value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {/* Q / M toggle */}
          <div style={{
            display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden',
            border: '1px solid var(--border)', fontSize: '0.78rem',
          }}>
            {['Q', 'M'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '3px 10px', border: 'none', cursor: 'pointer',
                fontWeight: 600, transition: 'all 0.12s',
                background: viewMode === v ? 'var(--accent-blue)' : 'transparent',
                color: viewMode === v ? '#fff' : 'var(--text-tertiary)',
              }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ padding: '8px 16px 0' }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="label"
                   tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                   axisLine={{ stroke: 'var(--border-subtle)' }}
                   tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                   axisLine={false} tickLine={false}
                   tickFormatter={v => v === 0 ? '0' : `${v > 0 ? '' : ''}${v.toFixed(0)}`} />
            <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeWidth={1} />
            <Tooltip content={<MonthTooltip fc={fc} />} cursor={{ fill: 'var(--bg-card-hover)' }} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.total >= 0 ? green : red} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly table */}
      <div className="table-container" style={{ marginTop: 8 }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th className="right" style={{ fontWeight: 700 }}>Total</th>
              <th className="right">&Oslash;</th>
              {MONTH_LABELS.map(m => <th key={m} className="right">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{selectedYear}</td>
              <td className="right">
                <span className={`mono ${yearTotal >= 0 ? 'positive' : 'negative'}`}
                      style={{ fontWeight: 700 }}>
                  {fc(yearTotal)}
                </span>
              </td>
              <td className="right">
                <span className={`mono ${yearAvg >= 0 ? 'positive' : 'negative'}`}
                      style={{ fontSize: '0.84rem' }}>
                  {fc(yearAvg)}
                </span>
              </td>
              {monthlyData.map((m, i) => (
                <td key={i} className="right">
                  {m.trades.length > 0 ? (
                    <span className={`mono ${m.total >= 0 ? 'positive' : 'negative'}`}
                          style={{
                            fontWeight: 600, fontSize: '0.84rem',
                            padding: '2px 6px', borderRadius: 4,
                            background: m.total >= 0 ? 'var(--accent-green-muted)' : 'var(--accent-red-muted)',
                          }}>
                      {fc(m.total)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>-</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
