import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Banknote } from 'lucide-react';
import { useFormatCurrency } from './StatsCards';

export default function TradeModal({ isOpen, onClose, onTrade, position, mode: initialMode, cashPositions = [] }) {
  const [mode, setMode] = useState(initialMode || 'buy');
  const [form, setForm] = useState({ quantity: '', price: '', date: '', fees: '', notes: '', cashInvestmentId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fc = useFormatCurrency();

  useEffect(() => {
    if (isOpen && position) {
      setMode(initialMode || 'buy');
      setForm({
        quantity: '',
        price: position.currentPrice?.toString() || '',
        date: new Date().toISOString().split('T')[0],
        fees: '',
        notes: '',
        cashInvestmentId: cashPositions.length === 1 ? String(cashPositions[0].id) : '',
      });
      setError('');
    }
  }, [isOpen, position, initialMode, cashPositions.length]);

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const tradeValue = () => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.price) || 0;
    return qty * price;
  };

  const totalWithFees = () => {
    const fees = parseFloat(form.fees) || 0;
    const tv = tradeValue();
    return mode === 'buy' ? tv + fees : tv - fees;
  };

  const estimatedGL = () => {
    if (mode !== 'sell' || !position) return null;
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.price) || 0;
    const avgCost = Number(position.purchasePrice) || 0;
    const fees = parseFloat(form.fees) || 0;
    return (price - avgCost) * qty - fees;
  };

  const selectedCash = cashPositions.find(c => String(c.id) === form.cashInvestmentId);
  const cashAfter = selectedCash
    ? Number(selectedCash.quantity) + (mode === 'buy' ? -totalWithFees() : totalWithFees())
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity || !form.price || !form.date) return;

    const qty = parseFloat(form.quantity);
    if (mode === 'sell' && qty > Number(position.quantity)) {
      setError(`Cannot sell more than ${Number(position.quantity)} shares held`);
      return;
    }

    if (selectedCash && mode === 'buy' && cashAfter < 0) {
      setError(`Insufficient funds in "${selectedCash.name}" (${fc(selectedCash.quantity)})`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onTrade(position.id, mode, {
        quantity: qty,
        price: parseFloat(form.price),
        date: form.date,
        fees: form.fees ? parseFloat(form.fees) : 0,
        notes: form.notes,
        cashInvestmentId: form.cashInvestmentId ? Number(form.cashInvestmentId) : null,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Trade failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !position) return null;

  const gl = estimatedGL();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'buy'
              ? <TrendingUp size={20} style={{ color: 'var(--accent-green)' }} />
              : <TrendingDown size={20} style={{ color: 'var(--accent-red)' }} />}
            {mode === 'buy' ? 'Buy' : 'Sell'} {position.ticker}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Position summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-hover)', marginBottom: 16, fontSize: '0.82rem',
            }}>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Holding</div>
                <div className="mono" style={{ fontWeight: 600 }}>
                  {Number(position.quantity).toFixed(position.quantity % 1 === 0 ? 0 : 4)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Avg Cost</div>
                <div className="mono" style={{ fontWeight: 600 }}>
                  {fc(position.purchasePrice)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Market Price</div>
                <div className="mono" style={{ fontWeight: 600 }}>
                  {position.currentPrice ? fc(position.currentPrice) : '—'}
                </div>
              </div>
            </div>

            {/* Buy / Sell toggle */}
            <div style={{
              display: 'flex', gap: 0, marginBottom: 16,
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <button type="button"
                      onClick={() => { setMode('buy'); setError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s',
                        background: mode === 'buy' ? 'var(--accent-green)' : 'transparent',
                        color: mode === 'buy' ? '#fff' : 'var(--text-secondary)',
                      }}>
                Buy
              </button>
              <button type="button"
                      onClick={() => { setMode('sell'); setError(''); }}
                      style={{
                        flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.88rem', transition: 'all 0.15s',
                        background: mode === 'sell' ? 'var(--accent-red)' : 'transparent',
                        color: mode === 'sell' ? '#fff' : 'var(--text-secondary)',
                      }}>
                Sell
              </button>
            </div>

            {/* Cash account selector */}
            {cashPositions.length > 0 && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Banknote size={14} style={{ opacity: 0.5 }} />
                  {mode === 'buy' ? 'Pay from' : 'Deposit to'}
                </label>
                <select className="form-input" value={form.cashInvestmentId}
                        onChange={handleChange('cashInvestmentId')}>
                  <option value="">— No cash account —</option>
                  {cashPositions.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fc(c.quantity)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" step="any" min="0.0001"
                       value={form.quantity} onChange={handleChange('quantity')}
                       placeholder={mode === 'sell' ? `Max ${Number(position.quantity)}` : 'Shares'}
                       autoFocus required />
              </div>
              <div className="form-group">
                <label className="form-label">Price *</label>
                <input className="form-input" type="number" step="any" min="0.0001"
                       value={form.price} onChange={handleChange('price')}
                       placeholder="Price per share" required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.date}
                       onChange={handleChange('date')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fees</label>
                <input className="form-input" type="number" step="any" min="0"
                       value={form.fees} onChange={handleChange('fees')}
                       placeholder="0.00" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={handleChange('notes')}
                     placeholder="Optional notes..." />
            </div>

            {/* Trade summary */}
            {(form.quantity && form.price) ? (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-hover)', marginTop: 8,
                fontSize: '0.88rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)' }}>Trade Value</span>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {fc(tradeValue())}
                    </div>
                  </div>
                  {mode === 'sell' && gl != null && (
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Est. Gain/Loss</span>
                      <div className={`mono ${gl >= 0 ? 'positive' : 'negative'}`}
                           style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {gl >= 0 ? '+' : ''}{fc(gl)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cash impact */}
                {selectedCash && (
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)' }}>
                      <Banknote size={14} />
                      <span>{selectedCash.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        {fc(selectedCash.quantity)}
                      </span>
                      <span style={{ margin: '0 6px', color: 'var(--text-tertiary)' }}>&rarr;</span>
                      <span className={`mono ${cashAfter < 0 ? 'negative' : ''}`}
                            style={{ fontWeight: 600 }}>
                        {fc(cashAfter)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {error && (
              <div style={{
                marginTop: 12, padding: '8px 12px', fontSize: '0.84rem',
                background: 'var(--accent-red-muted)', color: 'var(--accent-red)',
                borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)',
              }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}
                    style={{
                      background: mode === 'sell' ? 'var(--accent-red)' : undefined,
                      borderColor: mode === 'sell' ? 'var(--accent-red)' : undefined,
                    }}>
              {saving
                ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Processing...</>
                : mode === 'buy'
                  ? `Buy ${position.ticker}`
                  : `Sell ${position.ticker}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
