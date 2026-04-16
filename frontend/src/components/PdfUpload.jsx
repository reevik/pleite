import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Check, AlertTriangle, Loader } from 'lucide-react';
import { pdfApi, investmentApi } from '../services/api';

export default function PdfUpload({ isOpen, onClose, onImported }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setUploading(true);
    setParseResult(null);
    try {
      const result = await pdfApi.parse(file);
      setParseResult(result);
      // Select all by default
      setSelected(new Set(result.transactions?.map((_, i) => i) || []));
    } catch (err) {
      setParseResult({ transactions: [], warnings: [`Upload failed: ${err.message}`] });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleImport = async () => {
    if (!parseResult?.transactions) return;
    setImporting(true);

    const investments = parseResult.transactions
      .filter((_, i) => selected.has(i))
      .map(tx => ({
        ticker: tx.ticker,
        name: tx.name || tx.ticker,
        quantity: parseFloat(tx.quantity) || 1,
        purchasePrice: parseFloat(tx.price) || 0,
        purchaseDate: parseDate(tx.date),
        assetType: 'STOCK',
        currency: 'EUR',
        notes: `Imported from PDF: ${tx.rawLine?.substring(0, 100) || ''}`,
      }));

    try {
      await investmentApi.createBatch(investments);
      onImported(investments.length);
      onClose();
      setParseResult(null);
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    // Try common formats: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
    const parts = dateStr.split(/[./-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1]}-${parts[2]}`;
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  };

  const toggleSelected = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h2 className="modal-title">Import from PDF</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {!parseResult && (
            <>
              <div
                className={`dropzone ${dragOver ? 'active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader size={40} className="dropzone-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    <div className="dropzone-text">Parsing PDF...</div>
                  </>
                ) : (
                  <>
                    <Upload size={40} className="dropzone-icon" />
                    <div className="dropzone-text">
                      Drop your brokerage statement here or click to browse
                    </div>
                    <div className="dropzone-hint">
                      Supports PDF files from common brokers (Trade Republic, Scalable, ING, etc.)
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>Supported formats:</strong> The parser looks for transaction patterns like
                "BUY 10 AAPL @ 150.00" or tabular data with ISIN/ticker, quantity, and price columns.
                You can always edit parsed results before importing.
              </div>
            </>
          )}

          {parseResult && (
            <>
              {parseResult.warnings?.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: 12, background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-md)', marginBottom: 12,
                  fontSize: '0.85rem', color: 'var(--accent-amber)',
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{w}</span>
                </div>
              ))}

              {parseResult.transactions?.length > 0 && (
                <>
                  <div style={{ marginBottom: 12, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Found <strong>{parseResult.transactions.length}</strong> transactions.
                    Select which to import:
                  </div>

                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            <input type="checkbox"
                              checked={selected.size === parseResult.transactions.length}
                              onChange={() => {
                                if (selected.size === parseResult.transactions.length) setSelected(new Set());
                                else setSelected(new Set(parseResult.transactions.map((_, i) => i)));
                              }}
                            />
                          </th>
                          <th>Type</th>
                          <th>Ticker</th>
                          <th>Name</th>
                          <th className="right">Qty</th>
                          <th className="right">Price</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.transactions.map((tx, i) => (
                          <tr key={i} style={{ opacity: selected.has(i) ? 1 : 0.4 }}>
                            <td>
                              <input type="checkbox" checked={selected.has(i)}
                                     onChange={() => toggleSelected(i)} />
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: 4, fontSize: '0.78rem', fontWeight: 600,
                                background: tx.type === 'BUY' ? 'var(--accent-green-muted)' : 'var(--accent-red-muted)',
                                color: tx.type === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)',
                              }}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="mono">{tx.ticker}</td>
                            <td style={{ fontSize: '0.85rem' }}>{tx.name || '—'}</td>
                            <td className="right mono">{tx.quantity}</td>
                            <td className="right mono">{tx.price}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{tx.date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {parseResult?.transactions?.length > 0 && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setParseResult(null)}>
              Upload Different File
            </button>
            <button className="btn btn-primary" onClick={handleImport}
                    disabled={importing || selected.size === 0}>
              {importing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Importing...</>
                        : <><Check size={16} /> Import {selected.size} Transaction{selected.size !== 1 ? 's' : ''}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
