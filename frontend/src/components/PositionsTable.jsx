import React, { useState } from 'react';
import { Pencil, Trash2, ArrowUpDown, TrendingUp, TrendingDown, Plus, Minus } from 'lucide-react';
import { formatPercent, getTickerColor, useFormatCurrency } from './StatsCards';

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'currentValue', label: 'Value' },
  { key: 'gainLossPercent', label: 'Return %' },
  { key: 'dayChangePercent', label: 'Day %' },
];

export default function PositionsTable({ positions, onEdit, onDelete, onSelect, onBuy, onSell }) {
  const [sortKey, setSortKey] = useState('currentValue');
  const [sortDir, setSortDir] = useState('desc');

  const fc = useFormatCurrency();

  if (!positions || positions.length === 0) return null;

  const sorted = [...positions].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (sortKey === 'name') {
      av = (av || '').toLowerCase();
      bv = (bv || '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    av = Number(av) || 0;
    bv = Number(bv) || 0;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ field, children, right }) => (
    <th
      className={right ? 'right' : ''}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => toggleSort(field)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sortKey === field && (
          <ArrowUpDown size={12} style={{ opacity: 0.6 }} />
        )}
      </span>
    </th>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Holdings</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          {positions.length} position{positions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <SortHeader field="name">Asset</SortHeader>
              <SortHeader field="quantity" right>Shares</SortHeader>
              <th className="right">Avg. Cost</th>
              <th className="right">Price</th>
              <SortHeader field="currentValue" right>Value</SortHeader>
              <SortHeader field="gainLossPercent" right>Return</SortHeader>
              <SortHeader field="dayChangePercent" right>Day</SortHeader>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((pos, idx) => {
              const isPositive = pos.gainLoss >= 0;
              const dayPositive = pos.dayChangePercent >= 0;

              return (
                <tr key={pos.id}
                    onClick={() => onSelect && pos.assetType !== 'CASH' && onSelect(pos)}
                    style={{ cursor: onSelect && pos.assetType !== 'CASH' ? 'pointer' : undefined }}>
                  <td>
                    <div className="ticker-cell">
                      <div
                        className="ticker-badge"
                        style={{ background: `${getTickerColor(idx)}18`, color: getTickerColor(idx) }}
                      >
                        {(pos.ticker || '??').slice(0, 3)}
                      </div>
                      <div className="ticker-info">
                        <div className="name">{pos.name}</div>
                        <div className="symbol">{pos.ticker} · {pos.assetType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="right mono">{Number(pos.quantity).toFixed(pos.quantity % 1 === 0 ? 0 : 4)}</td>
                  <td className="right mono">{fc(pos.purchasePrice)}</td>
                  <td className="right mono">{pos.currentPrice ? fc(pos.currentPrice) : '—'}</td>
                  <td className="right mono" style={{ fontWeight: 600 }}>{fc(pos.currentValue)}</td>
                  <td className="right">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className={`mono ${isPositive ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                        {fc(pos.gainLoss)}
                      </span>
                      <span className={`mono ${isPositive ? 'positive' : 'negative'}`} style={{ fontSize: '0.78rem' }}>
                        {formatPercent(pos.gainLossPercent)}
                      </span>
                    </div>
                  </td>
                  <td className="right">
                    {pos.dayChangePercent != null ? (
                      <span className={`stat-change ${dayPositive ? 'positive-bg' : 'negative-bg'}`}
                            style={{ fontSize: '0.78rem' }}>
                        {dayPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {formatPercent(pos.dayChangePercent)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      {pos.assetType !== 'CASH' && onBuy && (
                        <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onBuy(pos); }}
                                title="Buy more" style={{ color: 'var(--accent-green)' }}>
                          <Plus size={14} />
                        </button>
                      )}
                      {pos.assetType !== 'CASH' && onSell && (
                        <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onSell(pos); }}
                                title="Sell" style={{ color: 'var(--accent-red)' }}>
                          <Minus size={14} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(pos); }} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); onDelete(pos.id); }} title="Delete"
                              style={{ color: 'var(--accent-red)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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
