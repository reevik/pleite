import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader } from 'lucide-react';
import { marketApi } from '../services/api';

const ASSET_TYPES = ['STOCK', 'ETF', 'BOND', 'CRYPTO', 'FUND', 'COMMODITY', 'OTHER'];
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];
const defaultForm = {
  ticker: '', name: '', quantity: '', purchasePrice: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  assetType: 'STOCK', currency: 'EUR', notes: '', exchange: '',
};

export default function InvestmentModal({ isOpen, onClose, onSave, editData, defaultAssetType }) {
  const [form, setForm] = useState(defaultForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (editData) {
      setForm({
        ticker: editData.ticker || '',
        name: editData.name || '',
        quantity: editData.quantity?.toString() || '',
        purchasePrice: editData.purchasePrice?.toString() || '',
        purchaseDate: editData.purchaseDate || defaultForm.purchaseDate,
        assetType: editData.assetType || 'STOCK',
        currency: editData.currency || 'EUR',
        notes: editData.notes || '',
        exchange: editData.exchange || '',
      });
    } else {
      setForm({ ...defaultForm, assetType: defaultAssetType || 'STOCK' });
    }
    setSearchQuery('');
    setSearchResults([]);
  }, [editData, isOpen, defaultAssetType]);

  // Click outside to close search
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ticker search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await marketApi.search(searchQuery);
        setSearchResults(results || []);
        setShowSearch(true);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const selectTicker = (item) => {
    setForm(f => ({
      ...f,
      ticker: item.symbol,
      name: item.name || item.symbol,
      assetType: mapType(item.type),
      exchange: item.exchange || '',
    }));
    setSearchQuery(item.symbol);
    setShowSearch(false);

    // Fetch current price as suggestion
    marketApi.getQuote(item.symbol).then(quote => {
      if (quote?.price && !form.purchasePrice) {
        setForm(f => ({ ...f, purchasePrice: quote.price.toString() }));
      }
    }).catch(() => {});

  };

  const mapType = (yahooType) => {
    if (!yahooType) return 'STOCK';
    const t = yahooType.toUpperCase();
    if (t.includes('ETF')) return 'ETF';
    if (t.includes('CRYPTO') || t.includes('CRYPTOCURRENCY')) return 'CRYPTO';
    if (t.includes('MUTUALFUND') || t.includes('FUND')) return 'FUND';
    if (t.includes('BOND') || t.includes('FIXED')) return 'BOND';
    if (t.includes('COMMODITY') || t.includes('FUTURE')) return 'COMMODITY';
    return 'STOCK';
  };

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ticker || !form.name || !form.quantity || !form.purchasePrice) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        quantity: parseFloat(form.quantity),
        purchasePrice: parseFloat(form.purchasePrice),
      });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editData ? 'Edit Position' : 'Add Investment'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Ticker Search */}
            <div className="form-group" ref={searchRef}>
              <label className="form-label">Search Ticker / ISIN</label>
              <div className="search-container">
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search by name, ticker, or ISIN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearch(true)}
                  />
                  {searching && (
                    <Loader size={16} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite',
                    }} />
                  )}
                </div>
                {showSearch && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((r, i) => (
                      <div key={i} className="search-item" onClick={() => selectTicker(r)}>
                        <div>
                          <div className="symbol">{r.symbol}</div>
                          <div className="name">{r.name}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span className="type-badge">{r.type}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{r.exchange}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ticker *</label>
                <input className="form-input" value={form.ticker} onChange={handleChange('ticker')}
                       placeholder="e.g. AAPL" required />
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={handleChange('name')}
                       placeholder="e.g. Apple Inc." required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" step="any" min="0.0001"
                       value={form.quantity} onChange={handleChange('quantity')}
                       placeholder="10" required />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Price *</label>
                <input className="form-input" type="number" step="any" min="0.01"
                       value={form.purchasePrice} onChange={handleChange('purchasePrice')}
                       placeholder="150.00" required />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.purchaseDate}
                       onChange={handleChange('purchaseDate')} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asset Type</label>
                <select className="form-input" value={form.assetType} onChange={handleChange('assetType')}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency} onChange={handleChange('currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={handleChange('notes')}
                     placeholder="Optional notes..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving...</>
                      : editData ? 'Update Position' : 'Add to Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
