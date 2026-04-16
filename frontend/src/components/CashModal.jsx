import React, { useState, useEffect } from 'react';
import { X, Banknote } from 'lucide-react';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

const defaultForm = {
  name: '',
  amount: '',
  currency: 'EUR',
  purchaseDate: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function CashModal({ isOpen, onClose, onSave, editData }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData && editData.assetType === 'CASH') {
      setForm({
        name: editData.name || '',
        amount: editData.quantity?.toString() || '',
        currency: editData.currency || 'EUR',
        purchaseDate: editData.purchaseDate || defaultForm.purchaseDate,
        notes: editData.notes || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [editData, isOpen]);

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) return;

    setSaving(true);
    try {
      await onSave({
        ticker: editData?.ticker || `CASH-${Date.now()}`,
        name: form.name,
        quantity: parseFloat(form.amount),
        purchasePrice: 1,
        purchaseDate: form.purchaseDate,
        assetType: 'CASH',
        currency: form.currency,
        notes: form.notes,
        exchange: '',
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
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Banknote size={20} style={{ opacity: 0.6 }} />
            {editData ? 'Edit Cash' : 'Add Cash'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={handleChange('name')}
                     placeholder="e.g. Savings Account, Emergency Fund, Broker Cash..."
                     autoFocus required />
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Amount *</label>
                <input className="form-input" type="number" step="any" min="0.01"
                       value={form.amount} onChange={handleChange('amount')}
                       placeholder="10000.00" required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Currency</label>
                <select className="form-input" value={form.currency} onChange={handleChange('currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.purchaseDate}
                     onChange={handleChange('purchaseDate')} />
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
                      : editData ? 'Update Cash' : 'Add Cash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
