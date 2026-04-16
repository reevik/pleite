import React from 'react';
import { Eye, X, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPercent, getTickerColor, useFormatCurrency } from './StatsCards';

export default function WatchlistTable({ watchlist, onRemove, onSelect }) {
  const fc = useFormatCurrency();

  if (!watchlist || watchlist.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={16} style={{ opacity: 0.6 }} />
          Watchlist
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          {watchlist.length} item{watchlist.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th className="right">Price</th>
              <th className="right">Day Change</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((item, idx) => {
              const dayPositive = item.dayChangePercent >= 0;

              return (
                <tr key={item.id}
                    onClick={() => onSelect && onSelect(item)}
                    style={{ cursor: onSelect ? 'pointer' : undefined }}>
                  <td>
                    <div className="ticker-cell">
                      <div
                        className="ticker-badge"
                        style={{
                          background: `${getTickerColor(idx + 10)}18`,
                          color: getTickerColor(idx + 10),
                        }}
                      >
                        {(item.ticker || '??').slice(0, 3)}
                      </div>
                      <div className="ticker-info">
                        <div className="name">{item.name || item.ticker}</div>
                        <div className="symbol">
                          {item.ticker}
                          {item.assetType ? ` · ${item.assetType}` : ''}
                          {item.exchange ? ` · ${item.exchange}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="right mono" style={{ fontWeight: 600 }}>
                    {item.price ? fc(item.price, item.currency || 'USD') : '—'}
                  </td>
                  <td className="right">
                    {item.dayChangePercent != null ? (
                      <span className={`stat-change ${dayPositive ? 'positive-bg' : 'negative-bg'}`}
                            style={{ fontSize: '0.78rem' }}>
                        {dayPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {item.dayChange != null ? `${Number(item.dayChange).toFixed(2)} ` : ''}
                        ({formatPercent(item.dayChangePercent)})
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                      title="Remove from watchlist"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
