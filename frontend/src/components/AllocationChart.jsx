import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getTickerColor } from './StatsCards';

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)',
];

// Resolve CSS variable to actual color for recharts
function resolveColor(cssVar) {
  const el = document.documentElement;
  const varName = cssVar.replace('var(', '').replace(')', '');
  return getComputedStyle(el).getPropertyValue(varName).trim() || cssVar;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: '0.85rem',
    }}>
      <div style={{ fontWeight: 600 }}>{d.name}</div>
      <div style={{ color: 'var(--text-secondary)' }}>{d.value.toFixed(1)}%</div>
    </div>
  );
};

export default function AllocationChart({ allocation, positions }) {
  if (!allocation || Object.keys(allocation).length === 0) return null;

  // By type
  const typeData = Object.entries(allocation).map(([name, value]) => ({ name, value: Number(value) }));

  // By position (top positions by weight)
  const totalValue = positions?.reduce((s, p) => s + (Number(p.currentValue) || 0), 0) || 0;
  const positionData = positions
    ?.filter(p => p.currentValue > 0)
    .map(p => ({
      name: p.ticker,
      value: totalValue > 0 ? ((Number(p.currentValue) / totalValue) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">By Asset Type</span>
        </div>
        <div className="allocation-grid">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                   paddingAngle={3} dataKey="value" stroke="none">
                {typeData.map((_, i) => (
                  <Cell key={i} fill={resolveColor(CHART_COLORS[i % CHART_COLORS.length])} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="alloc-legend">
            {typeData.map((d, i) => (
              <div key={d.name} className="alloc-item">
                <div className="alloc-dot" style={{ background: resolveColor(CHART_COLORS[i % CHART_COLORS.length]) }} />
                <span className="alloc-label">{d.name}</span>
                <span className="alloc-pct">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Positions</span>
        </div>
        <div className="allocation-grid">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={positionData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                   paddingAngle={2} dataKey="value" stroke="none">
                {positionData.map((_, i) => (
                  <Cell key={i} fill={resolveColor(CHART_COLORS[i % CHART_COLORS.length])} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="alloc-legend">
            {positionData.slice(0, 6).map((d, i) => (
              <div key={d.name} className="alloc-item">
                <div className="alloc-dot" style={{ background: resolveColor(CHART_COLORS[i % CHART_COLORS.length]) }} />
                <span className="alloc-label">{d.name}</span>
                <span className="alloc-pct">{d.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
