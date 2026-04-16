import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Loader, BarChart2, Activity, Eye, Check } from 'lucide-react';
import { marketApi } from '../services/api';
import { formatPercent, useFormatCurrency } from './StatsCards';

export default function MarketLookup({ onWatch, watchedTickers = [] }) {
  const fc = useFormatCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await marketApi.search(query);
      setResults(data || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  const fetchQuote = async (symbol) => {
    setLoadingQuote(true);
    setSelectedQuote(null);
    try {
      const quote = await marketApi.getQuote(symbol);
      setSelectedQuote(quote);
    } catch { setSelectedQuote(null); }
    finally { setLoadingQuote(false); }
  };

  const isPositive = selectedQuote?.dayChangePercent >= 0;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Market Lookup</span>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search stocks, ETFs, crypto... (e.g. AAPL, MSFT, BTC-USD)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Search'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedQuote || loadingQuote ? '1fr 1fr' : '1fr', gap: 20 }}>
        {results.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Results</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                {results.length} found
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {results.map((r, i) => (
                <div
                  key={i}
                  className="search-item"
                  style={{ borderRadius: 'var(--radius-sm)', border: 'none',
                           borderBottom: '1px solid var(--border-subtle)',
                           background: selectedQuote?.ticker === r.symbol ? 'var(--accent-blue-muted)' : 'transparent' }}
                  onClick={() => fetchQuote(r.symbol)}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.symbol}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="type-badge">{r.type}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{r.exchange}</span>
                    {onWatch && (
                      watchedTickers.includes(r.symbol?.toUpperCase()) ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem', color: 'var(--accent-green)',
                          background: 'var(--accent-green-muted)',
                        }}>
                          <Check size={11} /> Watching
                        </span>
                      ) : (
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onWatch({ ticker: r.symbol, name: r.name, assetType: r.type, exchange: r.exchange });
                          }}
                          title="Add to watchlist"
                          style={{ color: 'var(--accent-blue)', padding: '3px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                        >
                          <Eye size={12} /> Watch
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingQuote && (
          <div className="card">
            <div className="loading-overlay">
              <span className="spinner" /> Loading quote...
            </div>
          </div>
        )}

        {selectedQuote && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {selectedQuote.ticker} · {selectedQuote.exchange} · {selectedQuote.currency}
                </div>
                <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {fc(selectedQuote.price, selectedQuote.currency || 'USD')}
                </div>
                <div className={`stat-change ${isPositive ? 'positive-bg' : 'negative-bg'}`}
                     style={{ marginTop: 8 }}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {selectedQuote.dayChange?.toFixed(2)} ({formatPercent(selectedQuote.dayChangePercent)})
                </div>
              </div>
              <Activity size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  Previous Close
                </div>
                <div className="mono">{fc(selectedQuote.previousClose, selectedQuote.currency)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  Day Range
                </div>
                <div className="mono">
                  {selectedQuote.dayLow ? fc(selectedQuote.dayLow, selectedQuote.currency) : '—'} –{' '}
                  {selectedQuote.dayHigh ? fc(selectedQuote.dayHigh, selectedQuote.currency) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  Volume
                </div>
                <div className="mono">
                  {selectedQuote.volume ? new Intl.NumberFormat().format(selectedQuote.volume) : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  Last Updated
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {new Date(selectedQuote.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
