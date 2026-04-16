import React, { useState, useEffect, useId } from 'react';
import { TrendingUp, TrendingDown, Globe, MapPin, Building2, Factory } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, CartesianGrid, Legend,
} from 'recharts';
import { marketApi } from '../services/api';
import { formatPercent, getTickerColor, useFormatCurrency } from './StatsCards';

function formatLargeNumber(n) {
  if (n == null) return null;
  const v = Number(n);
  if (isNaN(v)) return null;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/** Safely format a number to N decimal places; returns null if not a valid number */
function fmt(val, decimals = 2) {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n.toFixed(decimals);
}

/** Format a ratio (0–1) as a percentage string */
function fmtPct(val, decimals = 1) {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : `${(n * 100).toFixed(decimals)}%`;
}

const RANGES = [
  { key: '1d',  label: '1D',  interval: '5m' },
  { key: '5d',  label: '1W',  interval: '15m' },
  { key: '1mo', label: '1M',  interval: '1h' },
  { key: '3mo', label: '3M',  interval: '1d' },
  { key: '6mo', label: '6M',  interval: '1d' },
  { key: '1y',  label: '1Y',  interval: '1d' },
  { key: '5y',  label: '5Y',  interval: '1wk' },
  { key: 'max', label: 'ALL', interval: '1mo' },
];

function formatTime(ts, rangeKey) {
  const d = new Date(ts * 1000);
  if (rangeKey === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (rangeKey === '5d') {
    return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (rangeKey === '1mo' || rangeKey === '3mo') {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  if (rangeKey === '6mo' || rangeKey === '1y') {
    return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
}

const ChartTooltip = ({ active, payload, rangeKey }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: '0.85rem',
      boxShadow: 'var(--shadow-elevated)',
    }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: 4 }}>
        {formatTime(p.timestamp, rangeKey)}
      </div>
      <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
        {p.close?.toFixed(2)}
      </div>
      {p.high != null && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: 2 }}>
          H: {p.high?.toFixed(2)}  L: {p.low?.toFixed(2)}
        </div>
      )}
    </div>
  );
};

const RECOMMENDATION_LABELS = {
  'strong_buy': { text: 'Strong Buy', color: 'var(--accent-green)' },
  'buy': { text: 'Buy', color: 'var(--accent-green)' },
  'hold': { text: 'Hold', color: 'var(--accent-amber)' },
  'sell': { text: 'Sell', color: 'var(--accent-red)' },
  'strong_sell': { text: 'Strong Sell', color: 'var(--accent-red)' },
};

function FundamentalsMetric({ label, value, hint }) {
  if (value == null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: hint || 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

function AnalystBar({ fundamentals }) {
  const rec = RECOMMENDATION_LABELS[fundamentals.recommendationKey] || null;
  const analysts = fundamentals.numberOfAnalystOpinions;
  const mean = fundamentals.recommendationMean;
  if (!rec && !analysts) return null;

  // recommendationMean: 1=Strong Buy, 2=Buy, 3=Hold, 4=Sell, 5=Strong Sell
  const barPct = mean ? Math.max(0, Math.min(100, ((5 - mean) / 4) * 100)) : 50;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        {rec && (
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--radius-sm)',
            background: `${rec.color}20`, color: rec.color,
            fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            {rec.text}
          </span>
        )}
        {analysts && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            {analysts} analyst{analysts !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {mean && (
        <div style={{ position: 'relative', height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 3,
            width: `${barPct}%`,
            background: `linear-gradient(90deg, var(--accent-red), var(--accent-amber), var(--accent-green))`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
      {mean && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
          <span>Sell</span><span>Hold</span><span>Buy</span>
        </div>
      )}
    </div>
  );
}

function PriceTargetBar({ fundamentals, currentPrice }) {
  const low = fundamentals.targetLowPrice;
  const high = fundamentals.targetHighPrice;
  const median = fundamentals.targetMedianPrice;
  if (!low || !high || !currentPrice) return null;

  const rangeSpan = high - low;
  if (rangeSpan <= 0) return null;
  const currentPct = Math.max(0, Math.min(100, ((currentPrice - low) / rangeSpan) * 100));
  const medianPct = median ? Math.max(0, Math.min(100, ((median - low) / rangeSpan) * 100)) : null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>Price Target Range</div>
      <div style={{ position: 'relative', height: 8, background: 'var(--bg-elevated)', borderRadius: 4 }}>
        {medianPct != null && (
          <div style={{ position: 'absolute', left: `${medianPct}%`, top: -2, width: 2, height: 12, background: 'var(--accent-blue)', borderRadius: 1 }} title={`Median: ${median}`} />
        )}
        <div style={{ position: 'absolute', left: `${currentPct}%`, top: -4, width: 8, height: 16, background: 'var(--text-primary)', borderRadius: 4, transform: 'translateX(-4px)' }} title={`Current: ${currentPrice}`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        <span style={{ color: 'var(--accent-red)' }}>{low.toFixed(2)}</span>
        {median && <span style={{ color: 'var(--accent-blue)' }}>{median.toFixed(2)}</span>}
        <span style={{ color: 'var(--accent-green)' }}>{high.toFixed(2)}</span>
      </div>
    </div>
  );
}

const TREND_PERIOD_LABELS = { '0m': 'Current', '-1m': '1M ago', '-2m': '2M ago', '-3m': '3M ago' };
const TREND_COLORS = {
  strongBuy: '#15803d',
  buy:       '#4ade80',
  hold:      '#eab308',
  sell:      '#f97316',
  strongSell:'#dc2626',
};

function RecommendationTrendChart({ trend }) {
  if (!trend || trend.length === 0) return null;

  // Yahoo returns periods like "0m", "-1m", "-2m", "-3m" — reverse so oldest is first
  const data = [...trend].reverse().map(p => {
    const total = (p.strongBuy || 0) + (p.buy || 0) + (p.hold || 0) + (p.sell || 0) + (p.strongSell || 0);
    return {
      period: TREND_PERIOD_LABELS[p.period] || p.period,
      strongBuy: p.strongBuy || 0,
      buy: p.buy || 0,
      hold: p.hold || 0,
      sell: p.sell || 0,
      strongSell: p.strongSell || 0,
      total,
    };
  });

  const TrendTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
        borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem',
        boxShadow: 'var(--shadow-elevated)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {[...payload].reverse().map(p => (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '1px 0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: p.fill, display: 'inline-block' }} />
              {p.dataKey === 'strongBuy' ? 'Strong Buy' : p.dataKey === 'strongSell' ? 'Strong Sell' : p.dataKey.charAt(0).toUpperCase() + p.dataKey.slice(1)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 500 }}>
        Analyst Recommendations
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="period"
            tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<TrendTooltip />} cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }} />
          <Bar dataKey="strongSell" stackId="a" fill={TREND_COLORS.strongSell} radius={[0,0,0,0]} />
          <Bar dataKey="sell" stackId="a" fill={TREND_COLORS.sell} />
          <Bar dataKey="hold" stackId="a" fill={TREND_COLORS.hold} />
          <Bar dataKey="buy" stackId="a" fill={TREND_COLORS.buy} />
          <Bar dataKey="strongBuy" stackId="a" fill={TREND_COLORS.strongBuy} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'strongBuy', label: 'Strong Buy' },
          { key: 'buy', label: 'Buy' },
          { key: 'hold', label: 'Hold' },
          { key: 'sell', label: 'Sell' },
          { key: 'strongSell', label: 'Strong Sell' },
        ].map(item => (
          <span key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: TREND_COLORS[item.key], display: 'inline-block' }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const ACTION_COLORS = {
  up:        'var(--accent-green)',
  upgrade:   'var(--accent-green)',
  init:      'var(--accent-blue)',
  main:      'var(--text-secondary)',
  reiterate: 'var(--text-secondary)',
  down:      'var(--accent-red)',
  downgrade: 'var(--accent-red)',
};

function LatestRatings({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 500 }}>
        Latest Ratings
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {history.slice(0, 6).map((entry, i) => {
          const date = entry.date ? new Date(entry.date * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const actionKey = (entry.action || '').toLowerCase();
          const actionColor = ACTION_COLORS[actionKey] || 'var(--text-secondary)';
          const actionLabel = entry.action === 'main' ? 'Maintains'
            : entry.action === 'init' ? 'Initiates'
            : entry.action === 'up' ? 'Upgrades'
            : entry.action === 'down' ? 'Downgrades'
            : entry.action === 'reiterate' ? 'Reiterates'
            : entry.action || '';

          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr auto',
              alignItems: 'center', gap: 12,
              padding: '8px 0',
              borderBottom: i < Math.min(history.length, 6) - 1 ? '1px solid var(--border-subtle)' : 'none',
              fontSize: '0.82rem',
            }}>
              <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                {date}
              </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {entry.firm}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span style={{ color: actionColor, fontSize: '0.75rem' }}>{actionLabel}</span>
                {entry.fromGrade && entry.toGrade && entry.fromGrade !== entry.toGrade ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {entry.fromGrade} → {entry.toGrade}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {entry.toGrade || ''}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatQuarterLabel(q) {
  // From earningsHistory: quarterEpoch + period like "-4q"
  if (q.quarterEpoch) {
    const d = new Date(q.quarterEpoch * 1000);
    const qNum = Math.ceil((d.getMonth() + 1) / 3);
    const yr = d.getFullYear().toString().slice(2);
    return `Q${qNum} '${yr}`;
  }
  // From earningsTrend: endDate like "2026-06-30"
  if (q.endDate) {
    const parts = q.endDate.split('-');
    const month = parseInt(parts[1], 10);
    const qNum = Math.ceil(month / 3);
    const yr = parts[0].slice(2);
    return `Q${qNum} '${yr}`;
  }
  return q.period || '';
}

function EarningsTrendChart({ quarters, nextEarningsDate }) {
  if (!quarters || quarters.length === 0) return null;

  // Separate reported and estimate quarters, sort chronologically
  const reported = quarters
    .filter(q => q.type === 'reported' && q.epsActual != null)
    .sort((a, b) => (a.quarterEpoch || 0) - (b.quarterEpoch || 0));

  const estimates = quarters
    .filter(q => q.type === 'estimate')
    .sort((a, b) => (a.endDate || '').localeCompare(b.endDate || ''));

  // Combine: last 4 reported + up to 2 upcoming estimates
  const display = [
    ...reported.slice(-4),
    ...estimates.slice(0, 2),
  ];

  if (display.length === 0) return null;

  // Chart dimensions
  const chartW = 100; // percentage-based via flex
  const colWidth = 100 / display.length;

  // Find Y range across all values
  const allVals = display.flatMap(q => [q.epsActual, q.epsEstimate].filter(v => v != null));
  if (allVals.length === 0) return null;
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || Math.abs(maxVal) * 0.2 || 1;
  const pad = range * 0.25;
  const yMin = minVal - pad;
  const yMax = maxVal + pad;
  const chartH = 180;
  const toY = (val) => chartH - ((val - yMin) / (yMax - yMin)) * chartH;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="card-title">Earnings Per Share</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" /></svg>
            Estimate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10"><circle cx="5" cy="5" r="4.5" fill="var(--accent-green)" /></svg>
            Actual
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', height: chartH + 80, marginTop: 12 }}>
        {/* Y-axis labels */}
        {(() => {
          const ticks = [];
          const step = range / 3;
          for (let i = 0; i <= 3; i++) {
            const val = yMin + pad + step * i;
            ticks.push(val);
          }
          return ticks.map((v, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, top: toY(v) - 7,
              fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
              color: 'var(--text-tertiary)', width: 42, textAlign: 'right',
            }}>
              {v.toFixed(2)}
            </div>
          ));
        })()}

        {/* Grid line */}
        <div style={{
          position: 'absolute', left: 50, right: 0,
          top: toY((yMin + yMax) / 2), height: 1,
          borderTop: '1px dashed var(--border-subtle)',
        }} />

        {/* Columns */}
        <div style={{ position: 'absolute', left: 50, right: 0, top: 0, height: chartH, display: 'flex' }}>
          {display.map((q, i) => {
            const isEstimateOnly = q.type === 'estimate';
            const estimate = q.epsEstimate;
            const actual = q.epsActual;
            const diff = q.epsDifference;
            const beat = diff != null ? diff >= 0 : null;
            const label = formatQuarterLabel(q);

            return (
              <div key={i} style={{
                flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Connector line between estimate and actual */}
                {estimate != null && actual != null && (
                  <div style={{
                    position: 'absolute',
                    left: '50%', width: 2, marginLeft: -1,
                    top: Math.min(toY(estimate), toY(actual)),
                    height: Math.abs(toY(estimate) - toY(actual)) || 1,
                    background: 'var(--border-default)',
                    borderRadius: 1,
                  }} />
                )}

                {/* Estimate dot (hollow) */}
                {estimate != null && (
                  <div style={{
                    position: 'absolute', top: toY(estimate) - 7,
                    left: '50%', marginLeft: -7,
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2.5px solid ${isEstimateOnly ? 'var(--text-tertiary)' : 'var(--text-secondary)'}`,
                    background: 'var(--bg-card)',
                    zIndex: 1,
                  }} title={`Estimate: ${estimate.toFixed(2)}`} />
                )}

                {/* Actual dot (filled) */}
                {actual != null && (
                  <div style={{
                    position: 'absolute', top: toY(actual) - 8,
                    left: '50%', marginLeft: -8,
                    width: 16, height: 16, borderRadius: '50%',
                    background: beat === false ? 'var(--accent-red)' : 'var(--accent-green)',
                    zIndex: 2,
                  }} title={`Actual: ${actual.toFixed(2)}`} />
                )}

                {/* Quarter label + beat/miss below chart */}
                <div style={{
                  position: 'absolute', top: chartH + 8, left: 0, right: 0, textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)', fontWeight: 600,
                  }}>
                    {label}
                  </div>
                  {beat != null ? (
                    <>
                      <div style={{
                        fontSize: '0.72rem', fontWeight: 700, marginTop: 2,
                        color: beat ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {beat ? 'Beat' : 'Missed'}
                      </div>
                      <div style={{
                        fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                        color: beat ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                      </div>
                    </>
                  ) : isEstimateOnly && (
                    <>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        Est.
                      </div>
                      <div style={{
                        fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}>
                        {estimate != null ? estimate.toFixed(2) : '—'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {nextEarningsDate && (
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-tertiary)',
          textAlign: 'right', marginTop: 4,
        }}>
          Next earnings: {nextEarningsDate}
        </div>
      )}
    </div>
  );
}

export default function PriceChartView({ position }) {
  const fc = useFormatCurrency();
  const [rangeIdx, setRangeIdx] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prevClose, setPrevClose] = useState(null);
  const [extendedHours, setExtendedHours] = useState(null);
  const [fundamentals, setFundamentals] = useState(null);
  const [profile, setProfile] = useState(null);
  const [holdings, setHoldings] = useState(null);
  const gradientId = useId();

  const range = RANGES[rangeIdx];
  const isEtf = position?.assetType === 'ETF' || position?.assetType === 'FUND';

  useEffect(() => {
    if (!position) return;
    setRangeIdx(0);
    setChartData(null);
    setFundamentals(null);
    setProfile(null);
    setHoldings(null);

    // Fetch fundamentals once per ticker
    marketApi.getFundamentals(position.ticker)
      .then(setFundamentals)
      .catch(() => setFundamentals(null));

    // Fetch profile (region, country, sector)
    marketApi.getProfile(position.ticker)
      .then(setProfile)
      .catch(() => setProfile(null));

    // Fetch ETF holdings if applicable
    if (position.assetType === 'ETF' || position.assetType === 'FUND') {
      marketApi.getHoldings(position.ticker)
        .then(setHoldings)
        .catch(() => setHoldings(null));
    }
  }, [position?.ticker]);

  useEffect(() => {
    if (!position) return;
    let cancelled = false;

    setLoading(true);
    marketApi.getChart(position.ticker, range.key, range.interval)
      .then(data => {
        if (cancelled) return;
        setChartData(data?.points || []);
        setPrevClose(data?.previousClose || null);
        // Capture pre/post-market data
        const ext = {};
        if (data?.postMarketPrice) {
          ext.postMarketPrice = data.postMarketPrice;
          ext.postMarketChange = data.postMarketChange;
          ext.postMarketChangePercent = data.postMarketChangePercent;
          ext.postMarketTime = data.postMarketTime;
        }
        if (data?.preMarketPrice) {
          ext.preMarketPrice = data.preMarketPrice;
          ext.preMarketChange = data.preMarketChange;
          ext.preMarketChangePercent = data.preMarketChangePercent;
          ext.preMarketTime = data.preMarketTime;
        }
        setExtendedHours(Object.keys(ext).length > 0 ? ext : null);
      })
      .catch(() => { if (!cancelled) { setChartData([]); setExtendedHours(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [position?.ticker, rangeIdx]);

  if (!position) return null;

  const first = chartData?.[0]?.close;
  const last = chartData?.[chartData.length - 1]?.close;
  const refPrice = range.key === '1d' && prevClose ? prevClose : first;
  const change = last && refPrice ? last - refPrice : null;
  const changePct = change && refPrice ? (change / refPrice) * 100 : null;
  const isPositive = change >= 0;
  const chartColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

  let yDomain = ['auto', 'auto'];
  if (chartData && chartData.length > 0) {
    const closes = chartData.map(p => p.close).filter(Boolean);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const pad = (max - min) * 0.08 || max * 0.01;
    yDomain = [min - pad, max + pad];
  }

  return (
    <div>
      {/* Header with price info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              className="ticker-badge"
              style={{
                background: `${getTickerColor(0)}18`,
                color: getTickerColor(0),
                width: 48, height: 48, fontSize: '0.88rem',
              }}
            >
              {(position.ticker || '??').slice(0, 4)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>
                {position.name}
              </h2>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                color: 'var(--text-tertiary)',
              }}>
                {position.ticker} · {position.assetType}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {last != null && (
              <>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700,
                }}>
                  {fc(last, position.currency || 'EUR')}
                </div>
                {change != null && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                    fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 600,
                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>
                      {range.label}
                    </span>
                  </div>
                )}
                {/* Pre/Post-market extended hours */}
                {extendedHours && (() => {
                  const isPost = !!extendedHours.postMarketPrice;
                  const isPre = !isPost && !!extendedHours.preMarketPrice;
                  const extPrice = isPost ? extendedHours.postMarketPrice : extendedHours.preMarketPrice;
                  const extChange = isPost ? extendedHours.postMarketChange : extendedHours.preMarketChange;
                  const extChangePct = isPost ? extendedHours.postMarketChangePercent : extendedHours.preMarketChangePercent;
                  const extTime = isPost ? extendedHours.postMarketTime : extendedHours.preMarketTime;
                  if (!extPrice) return null;
                  const extPositive = extChange >= 0;
                  const label = isPost ? 'After Hours' : 'Pre-Market';
                  const timeStr = extTime
                    ? new Date(extTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      gap: 8, marginTop: 6, fontSize: '0.8rem',
                    }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)',
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em',
                      }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fc(extPrice, position.currency || 'EUR')}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: extPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                      }}>
                        {extChange >= 0 ? '+' : ''}{extChange.toFixed(2)} ({extChangePct >= 0 ? '+' : ''}{extChangePct.toFixed(2)}%)
                      </span>
                      {timeStr && (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>
                          {timeStr}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span className="card-title">Price Chart</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {RANGES.map((r, i) => (
              <button
                key={r.key}
                onClick={() => setRangeIdx(i)}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: i === rangeIdx ? 'var(--accent-blue-muted)' : 'transparent',
                  color: i === rangeIdx ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-overlay" style={{ height: 350 }}>
            <span className="spinner" /> Loading chart...
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={ts => formatTime(ts, range.key)}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickLine={false}
                minTickGap={50}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={v => v.toFixed(2)}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={65}
              />
              {refPrice && (
                <ReferenceLine
                  y={refPrice}
                  stroke="var(--border-default)"
                  strokeDasharray="4 4"
                />
              )}
              <Tooltip content={<ChartTooltip rangeKey={range.key} />} />
              <Area
                type="monotone"
                dataKey="close"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, stroke: chartColor, fill: 'var(--bg-card)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 350, color: 'var(--text-tertiary)',
          }}>
            No chart data available
          </div>
        )}
      </div>

      {/* Position stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Shares', value: Number(position.quantity).toFixed(position.quantity % 1 === 0 ? 0 : 4) },
          { label: 'Avg. Cost', value: fc(position.purchasePrice) },
          { label: 'Total Value', value: fc(position.currentValue) },
          { label: 'Total Return', value: formatPercent(position.gainLossPercent), color: position.gainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
        ].map(stat => (
          <div key={stat.label} className="stat-card" style={{ textAlign: 'center' }}>
            <div className="stat-label">{stat.label}</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600,
              color: stat.color || 'var(--text-primary)',
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Profile info — region, country, sector, industry */}
      {(profile || position.region || position.country || position.sector) && (() => {
        const region = profile?.region || position.region;
        const country = profile?.country || position.country;
        const sector = profile?.sector || position.sector;
        const industry = profile?.industry;
        if (!region && !country && !sector && !industry) return null;
        return (
          <div className="card" style={{ marginTop: 20 }}>
            <span className="card-title" style={{ display: 'block', marginBottom: 14 }}>Profile</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {region && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{region}</div>
                  </div>
                </div>
              )}
              {country && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Country</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{country}</div>
                  </div>
                </div>
              )}
              {sector && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={16} style={{ color: 'var(--accent-purple)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sector</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{sector}</div>
                  </div>
                </div>
              )}
              {industry && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Factory size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Industry</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{industry}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ETF Holdings */}
      {isEtf && holdings && (
        <div style={{ marginTop: 20 }}>
          {/* Sector Weightings */}
          {holdings.sectorWeightings && Object.keys(holdings.sectorWeightings).length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <span className="card-title" style={{ display: 'block', marginBottom: 14 }}>Sector Weightings</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(holdings.sectorWeightings)
                  .sort(([, a], [, b]) => b - a)
                  .map(([sector, weight]) => {
                    const pct = (weight * 100).toFixed(1);
                    return (
                      <div key={sector} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 140, fontSize: '0.84rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {sector}
                        </div>
                        <div style={{ flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(pct, 100)}%`, height: '100%',
                            background: 'var(--accent-blue)', borderRadius: 4,
                          }} />
                        </div>
                        <div style={{ width: 48, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Top Holdings */}
          {holdings.holdings && holdings.holdings.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="card-title">Top Holdings</span>
                {holdings.holdingsCoverage && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    Covers {(holdings.holdingsCoverage * 100).toFixed(1)}% of fund
                  </span>
                )}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Symbol', 'Name', 'Weight', 'Country', 'Region'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === 'Weight' ? 'right' : 'left',
                        fontSize: '0.75rem', color: 'var(--text-tertiary)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.holdings.map((h, i) => (
                    <tr key={h.symbol || i} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.84rem', fontWeight: 600,
                          color: 'var(--accent-blue)',
                        }}>{h.symbol}</span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.88rem' }}>
                        {h.name || '—'}
                      </td>
                      <td style={{
                        padding: '10px 12px', textAlign: 'right',
                        fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 600,
                      }}>
                        {(h.weight * 100).toFixed(2)}%
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {h.country || '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {h.region || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fundamentals */}
      {fundamentals && (
        <div style={{ marginTop: 20 }}>
          {/* Analyst Ratings — full-width section */}
          {(fundamentals.recommendationKey || fundamentals.targetLowPrice || fundamentals.recommendationTrend || fundamentals.upgradeDowngradeHistory) && (
            <div className="card" style={{ marginBottom: 20 }}>
              <span className="card-title" style={{ display: 'block', marginBottom: 16 }}>Analyst Ratings</span>
              <AnalystBar fundamentals={fundamentals} />
              <PriceTargetBar fundamentals={fundamentals} currentPrice={last} />

              {/* Trend chart + Latest ratings side by side */}
              {(fundamentals.recommendationTrend || fundamentals.upgradeDowngradeHistory) && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: fundamentals.recommendationTrend && fundamentals.upgradeDowngradeHistory ? '1fr 1fr' : '1fr',
                  gap: 24, marginTop: 24,
                  paddingTop: 20, borderTop: '1px solid var(--border-subtle)',
                }}>
                  {fundamentals.recommendationTrend && (
                    <RecommendationTrendChart trend={fundamentals.recommendationTrend} />
                  )}
                  {fundamentals.upgradeDowngradeHistory && (
                    <LatestRatings history={fundamentals.upgradeDowngradeHistory} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Earnings Trend */}
          {fundamentals.earningsQuarters && (
            <EarningsTrendChart
              quarters={fundamentals.earningsQuarters}
              nextEarningsDate={fundamentals.nextEarningsDate}
            />
          )}

          {(() => {
            const f = fundamentals;
            const sections = [
              { title: 'Valuation', metrics: [
                { label: 'P/E (TTM)', value: fmt(f.trailingPE) },
                { label: 'Forward P/E', value: fmt(f.forwardPE) },
                { label: 'PEG Ratio', value: fmt(f.pegRatio) },
                { label: 'Price / Book', value: fmt(f.priceToBook) },
                { label: 'EV / EBITDA', value: fmt(f.enterpriseToEbitda) },
                { label: 'EV / Revenue', value: fmt(f.enterpriseToRevenue) },
              ]},
              { title: 'Earnings & Growth', metrics: [
                { label: 'EPS (TTM)', value: fmt(f.trailingEps) },
                { label: 'Forward EPS', value: fmt(f.forwardEps) },
                { label: 'Earnings Growth', value: fmtPct(f.earningsGrowth), hint: Number(f.earningsGrowth) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                { label: 'Revenue Growth', value: fmtPct(f.revenueGrowth), hint: Number(f.revenueGrowth) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
                { label: 'Revenue', value: formatLargeNumber(f.totalRevenue) },
                { label: 'EBITDA', value: formatLargeNumber(f.ebitda) },
              ]},
              { title: 'Profitability', metrics: [
                { label: 'Profit Margin', value: fmtPct(f.profitMargins) },
                { label: 'Gross Margin', value: fmtPct(f.grossMargins) },
                { label: 'Operating Margin', value: fmtPct(f.operatingMargins) },
                { label: 'Return on Equity', value: fmtPct(f.returnOnEquity) },
                { label: 'Return on Assets', value: fmtPct(f.returnOnAssets) },
                { label: 'Free Cash Flow', value: formatLargeNumber(f.freeCashflow) },
              ]},
              { title: 'Market Data', metrics: [
                { label: 'Market Cap', value: formatLargeNumber(f.marketCap) },
                { label: 'Enterprise Value', value: formatLargeNumber(f.enterpriseValue) },
                { label: 'Beta', value: fmt(f.beta) },
                { label: '52W High', value: fmt(f.fiftyTwoWeekHigh) },
                { label: '52W Low', value: fmt(f.fiftyTwoWeekLow) },
                { label: 'Avg Volume', value: formatLargeNumber(f.averageVolume) },
              ]},
              { title: 'Dividends', metrics: [
                { label: 'Dividend Yield', value: fmtPct(f.dividendYield) },
                { label: 'Dividend Rate', value: fmt(f.dividendRate) },
                { label: 'Payout Ratio', value: fmtPct(f.payoutRatio) },
                { label: 'Ex-Dividend Date', value: f.exDividendDate || null },
              ]},
              { title: 'Key Statistics', metrics: [
                { label: 'Shares Outstanding', value: formatLargeNumber(f.sharesOutstanding) },
                { label: 'Float', value: formatLargeNumber(f.floatShares) },
                { label: 'Short Ratio', value: fmt(f.shortRatio) },
                { label: 'Book Value', value: fmt(f.bookValue) },
                { label: 'Current Ratio', value: fmt(f.currentRatio) },
                { label: 'Debt / Equity', value: fmt(f.debtToEquity) },
              ]},
            ];

            // Only keep sections that have at least one non-null metric
            const visible = sections.filter(s => s.metrics.some(m => m.value != null && m.value !== ''));
            if (visible.length === 0) return null;

            return (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visible.length, 3)}, 1fr)`, gap: 16 }}>
                {visible.map(section => (
                  <div key={section.title} className="card">
                    <span className="card-title" style={{ display: 'block', marginBottom: 12 }}>{section.title}</span>
                    {section.metrics.map(m => (
                      <FundamentalsMetric key={m.label} label={m.label} value={m.value} hint={m.hint} />
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
