import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Clock, BookOpen } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

const TICKER_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)',
];

/**
 * Format a raw value as currency.
 * `currency` is the display currency code (EUR or USD).
 */
export function formatCurrency(value, currency = 'EUR') {
  if (value == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value) {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
}

export function getTickerColor(index) {
  return TICKER_COLORS[index % TICKER_COLORS.length];
}

/**
 * React hook that returns a currency formatter using the display currency context.
 * Usage:  const fc = useFormatCurrency();
 *         fc(123.45)            // converts from EUR (portfolio base) → display
 *         fc(99.00, 'USD')      // converts from USD → display
 */
export function useFormatCurrency() {
  const { displayCurrency, convert } = useCurrency();
  return (value, sourceCurrency = 'EUR') => {
    if (value == null) return '—';
    const converted = convert(value, sourceCurrency);
    return formatCurrency(converted, displayCurrency);
  };
}

export default function StatsCards({ summary }) {
  if (!summary) return null;
  const fc = useFormatCurrency();

  const isPositive = summary.totalGainLoss >= 0;
  const dayIsPositive = summary.dayChange >= 0;
  const hasRealized = summary.totalRealizedGainLoss != null && Number(summary.totalRealizedGainLoss) !== 0;
  const realizedPositive = Number(summary.totalRealizedGainLoss) >= 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Portfolio Value</div>
        <div className="stat-value">{fc(summary.totalValue)}</div>
        <div className={`stat-change ${dayIsPositive ? 'positive-bg' : 'negative-bg'}`}>
          {dayIsPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {fc(summary.dayChange)} today
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Unrealized Return</div>
        <div className={`stat-value ${isPositive ? 'positive' : 'negative'}`}>
          {fc(summary.totalGainLoss)}
        </div>
        <div className={`stat-change ${isPositive ? 'positive-bg' : 'negative-bg'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {formatPercent(summary.totalGainLossPercent)}
        </div>
      </div>

      {hasRealized && (
        <div className="stat-card">
          <div className="stat-label">Realized Gain/Loss</div>
          <div className={`stat-value ${realizedPositive ? 'positive' : 'negative'}`}>
            {fc(summary.totalRealizedGainLoss)}
          </div>
          <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <BookOpen size={13} style={{ verticalAlign: -2 }} /> From closed trades
          </div>
        </div>
      )}

      <div className="stat-card">
        <div className="stat-label">Invested Capital</div>
        <div className="stat-value">{fc(summary.totalCost)}</div>
        <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <DollarSign size={13} style={{ verticalAlign: -2 }} /> Cost basis
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Positions</div>
        <div className="stat-value">{summary.positionCount}</div>
        <div style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <BarChart3 size={13} style={{ verticalAlign: -2 }} /> Active holdings
        </div>
      </div>
    </div>
  );
}
