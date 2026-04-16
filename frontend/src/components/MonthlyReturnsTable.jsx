import React, { useState, useEffect } from 'react';
import { investmentApi } from '../services/api';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ReturnCell({ value }) {
  if (value == null) {
    return <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>-</span>;
  }

  const n = Number(value);
  const isPositive = n >= 0;

  return (
    <span className="mono" style={{
      fontWeight: 600, fontSize: '0.82rem',
      padding: '2px 6px', borderRadius: 4,
      background: isPositive ? 'var(--accent-green-muted)' : 'var(--accent-red-muted)',
      color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
      whiteSpace: 'nowrap',
    }}>
      {isPositive ? '+' : ''}{n.toFixed(2)}%
    </span>
  );
}

export default function MonthlyReturnsTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investmentApi.getMonthlyReturns()
      .then(d => setData(d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-header">
          <span className="card-title">Monthly Portfolio Returns</span>
        </div>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <span className="spinner" /> Loading...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div className="card-header">
          <span className="card-title">Monthly Portfolio Returns</span>
        </div>
        <div style={{
          padding: '24px 16px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: '0.88rem',
        }}>
          Returns will appear here as monthly snapshots are recorded.
          <br />
          <span style={{ fontSize: '0.82rem' }}>
            Each time the dashboard loads, the current portfolio value is captured for this month.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title">Monthly Portfolio Returns</span>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th></th>
              <th className="right" style={{ fontWeight: 700 }}>Total</th>
              {MONTH_LABELS.map(m => <th key={m} className="right">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.year}>
                <td style={{ fontWeight: 600 }}>{row.year}</td>
                <td className="right">
                  <ReturnCell value={row.yearReturnPercent} />
                </td>
                {row.months.map((val, i) => (
                  <td key={i} className="right">
                    <ReturnCell value={val} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
