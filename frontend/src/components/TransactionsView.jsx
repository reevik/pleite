import React, { useState, useEffect, useMemo } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Search, ChevronDown, ChevronUp, Undo2 } from 'lucide-react';
import { investmentApi } from '../services/api';

const TYPE_CONFIG = {
  BUY:  { label: 'Buy',  color: 'var(--accent-green)', bg: 'var(--accent-green-muted)', Icon: ArrowDownCircle },
  SELL: { label: 'Sell', color: 'var(--accent-red)',   bg: 'var(--accent-red-muted)',   Icon: ArrowUpCircle },
};

function formatNumber(n, decimals = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Count how many later transactions exist for the same investment after a given tx. */
function countLaterForSameInvestment(tx, allTransactions) {
  return allTransactions.filter(
    t => t.investmentId === tx.investmentId && t.id > tx.id
  ).length;
}

export default function TransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState('transactionDate');
  const [sortDir, setSortDir] = useState('desc');
  const [undoing, setUndoing] = useState(null); // tx id being undone
  const [confirmUndo, setConfirmUndo] = useState(null); // tx for confirmation modal

  const fetchTransactions = () => {
    setLoading(true);
    investmentApi.getAllTransactions()
      .then(data => setTransactions(data || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleUndo = async (tx) => {
    setConfirmUndo(null);
    setUndoing(tx.id);
    try {
      const result = await investmentApi.undoTransaction(tx.id);
      const count = result?.undoneCount || 1;
      // Re-fetch after undo
      fetchTransactions();
    } catch (e) {
      alert('Failed to undo transaction: ' + (e.message || 'Unknown error'));
    } finally {
      setUndoing(null);
    }
  };

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        (t.ticker || '').toLowerCase().includes(q) ||
        (t.name || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      if (sortField === 'transactionDate' || sortField === 'createdAt') {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = (vb || '').toLowerCase();
      } else {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }

      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, typeFilter, search, sortField, sortDir]);

  const stats = useMemo(() => {
    const buys = transactions.filter(t => t.type === 'BUY');
    const sells = transactions.filter(t => t.type === 'SELL');
    const totalBuyValue = buys.reduce((s, t) => s + (t.quantity * t.price), 0);
    const totalSellValue = sells.reduce((s, t) => s + (t.quantity * t.price), 0);
    const totalRealizedGL = sells.reduce((s, t) => s + (Number(t.realizedGainLoss) || 0), 0);
    const totalFees = transactions.reduce((s, t) => s + (Number(t.fees) || 0), 0);
    return { buyCount: buys.length, sellCount: sells.length, totalBuyValue, totalSellValue, totalRealizedGL, totalFees };
  }, [transactions]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
        <span className="spinner" style={{ width: 20, height: 20 }} /> Loading transactions...
      </div>
    );
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    const Icon = sortDir === 'asc' ? ChevronUp : ChevronDown;
    return <Icon size={13} style={{ marginLeft: 3, verticalAlign: -2, opacity: 0.7 }} />;
  };

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Buys</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {stats.buyCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {formatNumber(stats.totalBuyValue)} value
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Sells</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {stats.sellCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {formatNumber(stats.totalSellValue)} value
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Realized P&L</div>
          <div style={{
            fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: stats.totalRealizedGL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {stats.totalRealizedGL >= 0 ? '+' : ''}{formatNumber(stats.totalRealizedGL)}
          </div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>Total Fees</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
            {formatNumber(stats.totalFees)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-input)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', padding: '6px 12px', flex: 1, maxWidth: 320,
          }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by ticker, name or notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: '0.86rem', width: '100%',
              }}
            />
          </div>

          <div style={{
            display: 'flex', gap: 4, padding: 3,
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            {['ALL', 'BUY', 'SELL'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 14px', border: 'none', cursor: 'pointer',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600,
                  background: typeFilter === t ? 'var(--accent-blue)' : 'transparent',
                  color: typeFilter === t ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {t === 'ALL' ? 'All' : t === 'BUY' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          {transactions.length === 0 ? 'No transactions yet. Buy or sell holdings to see activity here.' : 'No transactions match your filters.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {[
                    { key: 'transactionDate', label: 'Date' },
                    { key: 'type', label: 'Type' },
                    { key: 'ticker', label: 'Ticker' },
                    { key: 'name', label: 'Name' },
                    { key: 'quantity', label: 'Qty' },
                    { key: 'price', label: 'Price' },
                    { key: 'total', label: 'Total' },
                    { key: 'fees', label: 'Fees' },
                    { key: 'realizedGainLoss', label: 'Realized P&L' },
                    { key: 'notes', label: 'Notes' },
                    { key: '_actions', label: '' },
                  ].map(col => (
                    <th key={col.key}
                        onClick={() => !['total', '_actions'].includes(col.key) && handleSort(col.key)}
                        style={{
                          padding: '12px 14px',
                          textAlign: ['quantity', 'price', 'total', 'fees', 'realizedGainLoss'].includes(col.key) ? 'right'
                            : col.key === '_actions' ? 'center' : 'left',
                          color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.78rem',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          cursor: !['total', '_actions'].includes(col.key) ? 'pointer' : 'default',
                          userSelect: 'none', whiteSpace: 'nowrap',
                        }}
                    >
                      {col.label}<SortIcon field={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => {
                  const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.BUY;
                  const Icon = cfg.Icon;
                  const total = (Number(tx.quantity) || 0) * (Number(tx.price) || 0);
                  const gl = Number(tx.realizedGainLoss);
                  const isUndoing = undoing === tx.id;

                  return (
                    <tr key={tx.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.12s',
                          opacity: isUndoing ? 0.5 : 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 'var(--radius-sm)',
                          background: cfg.bg, color: cfg.color,
                          fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          <Icon size={13} />
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{
                        padding: '10px 14px', fontWeight: 700,
                        fontFamily: 'var(--font-mono)', fontSize: '0.84rem',
                      }}>
                        {tx.ticker}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.name}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatNumber(tx.quantity, 4)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {formatNumber(tx.price)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatNumber(total)}
                      </td>
                      <td style={{
                        padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)',
                        color: (Number(tx.fees) || 0) > 0 ? 'var(--accent-amber)' : 'var(--text-tertiary)',
                      }}>
                        {(Number(tx.fees) || 0) > 0 ? formatNumber(tx.fees) : '—'}
                      </td>
                      <td style={{
                        padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: tx.type === 'SELL'
                          ? (gl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)')
                          : 'var(--text-tertiary)',
                      }}>
                        {tx.type === 'SELL' && gl != null && !isNaN(gl)
                          ? `${gl >= 0 ? '+' : ''}${formatNumber(gl)}`
                          : '—'}
                      </td>
                      <td style={{
                        padding: '10px 14px', color: 'var(--text-tertiary)', fontSize: '0.8rem',
                        maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {tx.notes || '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setConfirmUndo(tx)}
                          disabled={isUndoing}
                          title="Undo this transaction"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)', background: 'transparent',
                            color: 'var(--accent-amber)', fontSize: '0.76rem', fontWeight: 600,
                            cursor: isUndoing ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s', opacity: isUndoing ? 0.4 : 1,
                          }}
                          onMouseEnter={e => { if (!isUndoing) { e.currentTarget.style.background = 'var(--accent-red-muted)'; e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)'; }}}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-amber)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                        >
                          <Undo2 size={12} />
                          Undo
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmUndo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setConfirmUndo(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)', padding: '28px 32px',
              maxWidth: 480, width: '90vw', boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem' }}>Undo Transaction</h3>

            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
              padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{confirmUndo.ticker}</span>
                <span style={{
                  color: confirmUndo.type === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                  fontWeight: 700,
                }}>
                  {confirmUndo.type}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                {formatNumber(confirmUndo.quantity, 4)} shares @ {formatNumber(confirmUndo.price)}
                &nbsp;&middot;&nbsp;{formatDate(confirmUndo.transactionDate)}
              </div>
            </div>

            {(() => {
              const laterCount = countLaterForSameInvestment(confirmUndo, transactions);
              return laterCount > 0 ? (
                <div style={{
                  background: 'var(--accent-red-muted)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
                  fontSize: '0.84rem', color: 'var(--accent-red)',
                }}>
                  <strong>Warning:</strong> This will also undo {laterCount} later transaction{laterCount !== 1 ? 's' : ''} for{' '}
                  <strong>{confirmUndo.ticker}</strong> to keep the position consistent.
                </div>
              ) : null;
            })()}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: '0 0 20px' }}>
              The position's quantity and average cost will be recalculated. This action cannot be reversed.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmUndo(null)}
                style={{
                  padding: '8px 20px', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)', background: 'transparent',
                  color: 'var(--text-secondary)', fontSize: '0.86rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUndo(confirmUndo)}
                style={{
                  padding: '8px 20px', border: 'none',
                  borderRadius: 'var(--radius-sm)', background: 'var(--accent-red)',
                  color: '#fff', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Undo {(() => {
                  const c = countLaterForSameInvestment(confirmUndo, transactions) + 1;
                  return c > 1 ? `${c} Transactions` : 'Transaction';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
