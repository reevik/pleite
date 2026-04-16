import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, DollarSign, Globe } from 'lucide-react';
import RealizedGainsChart from './RealizedGainsChart';
import MonthlyReturnsTable from './MonthlyReturnsTable';
import WealthDevelopmentChart from './WealthDevelopmentChart';

const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)',
];

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
      <div style={{ fontWeight: 600 }}>{d.name || d.payload?.name}</div>
      <div style={{ color: 'var(--text-secondary)' }}>{(d.value || 0).toFixed(1)}%</div>
    </div>
  );
};

function AllocationPie({ title, data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
      </div>
      <div className="allocation-grid">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                 paddingAngle={3} dataKey="value" stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={resolveColor(CHART_COLORS[i % CHART_COLORS.length])} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="alloc-legend">
          {data.map((d, i) => (
            <div key={d.name} className="alloc-item">
              <div className="alloc-dot" style={{ background: resolveColor(CHART_COLORS[i % CHART_COLORS.length]) }} />
              <span className="alloc-label">{d.name}</span>
              <span className="alloc-pct">{d.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllocationBar({ title, data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">{title}</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`}
                 tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
                 axisLine={{ stroke: 'var(--border-subtle)' }} />
          <YAxis type="category" dataKey="name" width={140}
                 tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
                 axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={resolveColor(CHART_COLORS[i % CHART_COLORS.length])} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function toChartData(allocationMap) {
  if (!allocationMap) return [];
  return Object.entries(allocationMap)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);
}

const TABS = [
  { key: 'earnings', label: 'Earnings / Losses', icon: DollarSign },
  { key: 'profile', label: 'Investment Profile', icon: Globe },
];

export default function AnalyseView({ summary }) {
  const [tab, setTab] = useState('earnings');

  if (!summary || summary.positionCount === 0) {
    return (
      <div className="empty-state">
        <h3>No data to analyse</h3>
        <p>Add investments to see breakdowns here.</p>
      </div>
    );
  }

  const regionData = toChartData(summary.allocationByRegion);
  const countryData = toChartData(summary.allocationByCountry);
  const sectorData = toChartData(summary.allocationBySector);

  return (
    <div>
      {/* Tab toggle */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4,
        background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)', width: 'fit-content',
      }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', border: 'none', cursor: 'pointer',
                borderRadius: 'var(--radius-sm)', fontSize: '0.86rem', fontWeight: 600,
                transition: 'all 0.15s',
                background: active ? 'var(--accent-blue)' : 'transparent',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}>
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Earnings / Losses */}
      {tab === 'earnings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <WealthDevelopmentChart />
          <MonthlyReturnsTable />
          <RealizedGainsChart />
        </div>
      )}

      {/* Investment Profile */}
      {tab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <AllocationPie title="By Region" data={regionData} />
          <AllocationPie title="By Sector" data={sectorData} />
          <AllocationBar title="By Country" data={countryData} />
        </div>
      )}
    </div>
  );
}
