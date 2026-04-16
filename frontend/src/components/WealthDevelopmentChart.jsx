import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { investmentApi } from '../services/api';

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6',
  '#ef4444', '#ec4899', '#6366f1', '#84cc16', '#f97316',
  '#06b6d4', '#8b5cf6', '#10b981', '#e11d48', '#0ea5e9',
];

function formatLargeNumber(n) {
  if (n == null) return '';
  const v = Number(n);
  if (isNaN(v)) return '';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', maxWidth: 280,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      {payload
        .filter(p => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{p.dataKey}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {formatLargeNumber(p.value)}
            </span>
          </div>
        ))}
      <div style={{
        marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', fontWeight: 700,
      }}>
        <span>Total</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{formatLargeNumber(total)}</span>
      </div>
    </div>
  );
};

export default function WealthDevelopmentChart() {
  const [data, setData] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentApi.getWealthDevelopment()
      .then(rows => {
        if (!rows || rows.length === 0) {
          setData([]);
          setHoldings([]);
          return;
        }
        // Collect all unique holding names (excluding "month")
        const holdingSet = new Set();
        rows.forEach(row => {
          Object.keys(row).forEach(k => {
            if (k !== 'month') holdingSet.add(k);
          });
        });
        // Sort holdings by total value across all months (descending) for consistent color assignment
        const holdingTotals = [...holdingSet].map(name => ({
          name,
          total: rows.reduce((sum, row) => sum + (Number(row[name]) || 0), 0),
        }));
        holdingTotals.sort((a, b) => b.total - a.total);
        setHoldings(holdingTotals.map(h => h.name));

        // Ensure all rows have all holdings (default 0)
        const normalized = rows.map(row => {
          const r = { month: row.month };
          holdingTotals.forEach(h => { r[h.name] = Number(row[h.name]) || 0; });
          return r;
        });
        setData(normalized);
      })
      .catch(() => { setData([]); setHoldings([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <span className="card-title" style={{ display: 'block', marginBottom: 16 }}>Wealth Development</span>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          <span className="spinner" style={{ width: 20, height: 20 }} /> Loading...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <span className="card-title" style={{ display: 'block', marginBottom: 16 }}>Wealth Development</span>
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
          Not enough data yet. Wealth snapshots are recorded each time you view the dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <span className="card-title" style={{ display: 'block', marginBottom: 16 }}>Wealth Development</span>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month"
                 tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                 axisLine={{ stroke: 'var(--border-subtle)' }}
                 tickLine={false} />
          <YAxis tickFormatter={formatLargeNumber}
                 tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                 axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-secondary)', paddingTop: 8 }}
            iconSize={10}
            iconType="square"
          />
          {holdings.map((name, i) => (
            <Bar key={name} dataKey={name} stackId="wealth"
                 fill={COLORS[i % COLORS.length]}
                 radius={i === holdings.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
