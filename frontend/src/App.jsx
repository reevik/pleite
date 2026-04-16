import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BarChart3, Plus, Upload, Search, RefreshCw, Briefcase, PieChart, X,
         Banknote, TrendingUp, Bitcoin, Diamond, MoreHorizontal, ChevronDown, LogOut, ArrowLeftRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { usePortfolio, useWatchlist, useToast } from './hooks/usePortfolio';
import { useCurrency } from './context/CurrencyContext';
import { investmentApi } from './services/api';
import AuthPage from './components/AuthPage';
import StatsCards from './components/StatsCards';
import PositionsTable from './components/PositionsTable';
import AllocationChart from './components/AllocationChart';
import InvestmentModal from './components/InvestmentModal';
import CashModal from './components/CashModal';
import PdfUpload from './components/PdfUpload';
import MarketLookup from './components/MarketLookup';
import AnalyseView from './components/AnalyseView';
import PriceChartView from './components/PriceChartView';
import TradeModal from './components/TradeModal';
import TransactionsView from './components/TransactionsView';
import WatchlistTable from './components/WatchlistTable';

const ADD_MENU_ITEMS = [
  { key: 'stock',     label: 'Stock / ETF',  icon: TrendingUp,      assetType: 'STOCK' },
  { key: 'crypto',    label: 'Crypto',        icon: Bitcoin,         assetType: 'CRYPTO' },
  { key: 'commodity', label: 'Commodity',      icon: Diamond,         assetType: 'COMMODITY' },
  { key: 'cash',      label: 'Cash',          icon: Banknote,        assetType: 'CASH' },
  { key: 'other',     label: 'Other',         icon: MoreHorizontal,  assetType: 'OTHER' },
];

export default function App() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <span className="spinner" /> Loading...
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return <AppShell user={user} logout={logout} />;
}

function AppShell({ user, logout }) {
  const { summary, loading, error, refresh } = usePortfolio();
  const { watchlist, add: addToWatchlist, remove: removeFromWatchlist, refresh: refreshWatchlist } = useWatchlist();
  const { toasts, addToast } = useToast();
  const { displayCurrency, toggleCurrency } = useCurrency();

  const [view, setView] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [defaultAssetType, setDefaultAssetType] = useState('STOCK');
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chartTabs, setChartTabs] = useState([]);   // array of position objects
  const [tradePosition, setTradePosition] = useState(null);
  const [tradeMode, setTradeMode] = useState('buy');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const addMenuRef = useRef(null);

  // Close add-menu on click outside
  useEffect(() => {
    const handler = (e) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddMenuSelect = (item) => {
    setShowAddMenu(false);
    setEditingPosition(null);
    if (item.assetType === 'CASH') {
      setShowCashModal(true);
    } else {
      setDefaultAssetType(item.assetType);
      setShowAddModal(true);
    }
  };

  const handleSelectPosition = (pos) => {
    const ticker = pos.ticker?.toUpperCase();
    setChartTabs(prev => {
      // Don't duplicate — if already open, just switch to it
      if (prev.some(t => t.ticker?.toUpperCase() === ticker)) return prev;
      return [...prev, pos];
    });
    setView(`chart:${ticker}`);
  };

  const handleCloseChart = (ticker) => {
    setChartTabs(prev => {
      const next = prev.filter(t => t.ticker?.toUpperCase() !== ticker.toUpperCase());
      // If we're currently viewing the closed tab, navigate away
      if (view === `chart:${ticker.toUpperCase()}`) {
        if (next.length > 0) {
          // Switch to the last remaining chart tab
          setView(`chart:${next[next.length - 1].ticker.toUpperCase()}`);
        } else {
          setView('dashboard');
        }
      }
      return next;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshWatchlist()]);
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleWatch = async (item) => {
    try {
      await addToWatchlist(item);
      addToast(`Added ${item.ticker} to watchlist`);
    } catch {
      addToast('Failed to add to watchlist', 'error');
    }
  };

  const handleRemoveWatch = async (id) => {
    await removeFromWatchlist(id);
    addToast('Removed from watchlist');
  };

  const handleSelectWatchlistItem = (item) => {
    handleSelectPosition({
      ticker: item.ticker,
      name: item.name || item.ticker,
      assetType: item.assetType || '',
      currency: item.currency || 'USD',
    });
  };

  const handleSave = useCallback(async (data) => {
    if (editingPosition) {
      await investmentApi.update(editingPosition.id, data);
      addToast(`Updated ${data.ticker} position`);
    } else {
      await investmentApi.create(data);
      addToast(`Added ${data.ticker} to portfolio`);
    }
    setEditingPosition(null);
    refresh();
  }, [editingPosition, refresh, addToast]);

  const handleEdit = (position) => {
    setEditingPosition(position);
    if (position.assetType === 'CASH') {
      setShowCashModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this position from your portfolio?')) return;
    await investmentApi.delete(id);
    addToast('Position removed', 'success');
    refresh();
  };

  const handlePdfImported = (count) => {
    addToast(`Imported ${count} transaction${count !== 1 ? 's' : ''} from PDF`);
    refresh();
  };

  const handleBuy = (pos) => {
    setTradePosition(pos);
    setTradeMode('buy');
    setShowTradeModal(true);
  };

  const handleSell = (pos) => {
    setTradePosition(pos);
    setTradeMode('sell');
    setShowTradeModal(true);
  };

  const handleTrade = async (investmentId, mode, data) => {
    if (mode === 'buy') {
      await investmentApi.buy(investmentId, data);
      addToast(`Bought ${data.quantity} more shares`, 'success');
    } else {
      const result = await investmentApi.sell(investmentId, data);
      const gl = result?.realizedGainLoss;
      const glStr = gl != null ? ` (${gl >= 0 ? '+' : ''}${Number(gl).toFixed(2)})` : '';
      addToast(`Sold ${data.quantity} shares${glStr}`, 'success');
    }
    refresh();
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <Briefcase size={22} />
          <span>Reevik Investment</span>
        </div>

        <nav className="app-nav">
          <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setView('dashboard')}>
            <BarChart3 size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Dashboard
          </button>
          <button className={`nav-btn ${view === 'analyse' ? 'active' : ''}`}
                  onClick={() => setView('analyse')}>
            <PieChart size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Analyse
          </button>
          <button className={`nav-btn ${view === 'transactions' ? 'active' : ''}`}
                  onClick={() => setView('transactions')}>
            <ArrowLeftRight size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Transactions
          </button>
          <button className={`nav-btn ${view === 'market' ? 'active' : ''}`}
                  onClick={() => setView('market')}>
            <Search size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Market
          </button>

          {chartTabs.map(tab => {
            const tabKey = `chart:${tab.ticker.toUpperCase()}`;
            return (
              <button key={tabKey}
                      className={`nav-btn ${view === tabKey ? 'active' : ''}`}
                      onClick={() => setView(tabKey)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {tab.ticker}
                <span
                  onClick={(e) => { e.stopPropagation(); handleCloseChart(tab.ticker); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: '50%',
                    marginLeft: 2,
                    color: 'var(--text-tertiary)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                >
                  <X size={12} />
                </span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={toggleCurrency}
            title={`Show prices in ${displayCurrency === 'EUR' ? 'USD' : 'EUR'}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.78rem',
              minWidth: 56,
              letterSpacing: '0.02em',
            }}
          >
            {displayCurrency === 'EUR' ? '€ EUR' : '$ USD'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh}
                  title="Refresh quotes">
            <RefreshCw size={14} style={{
              animation: refreshing ? 'spin 0.6s linear infinite' : 'none'
            }} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPdfUpload(true)}>
            <Upload size={14} /> Import PDF
          </button>
          <div style={{ position: 'relative' }} ref={addMenuRef}>
            <button className="btn btn-primary btn-sm"
                    onClick={() => setShowAddMenu(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={14} /> Add <ChevronDown size={12} style={{
                transition: 'transform 0.15s',
                transform: showAddMenu ? 'rotate(180deg)' : 'rotate(0)',
              }} />
            </button>
            {showAddMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 180, zIndex: 100, overflow: 'hidden',
              }}>
                {ADD_MENU_ITEMS.map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key}
                            onClick={() => handleAddMenuSelect(item)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              width: '100%', padding: '10px 14px',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-primary)', fontSize: '0.88rem',
                              transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Icon size={16} style={{ opacity: 0.6 }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            paddingLeft: 8, borderLeft: '1px solid var(--border)', marginLeft: 4,
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              {user?.firstName || user?.email}
            </span>
            <button className="btn btn-ghost btn-icon" onClick={logout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="app-content">
        {error && (
          <div style={{
            padding: '12px 18px', marginBottom: 20,
            background: 'var(--accent-red-muted)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)', color: 'var(--accent-red)', fontSize: '0.88rem',
          }}>
            Failed to load portfolio: {error}. Make sure the Spring Boot backend is running on port 8080.
          </div>
        )}

        {view === 'dashboard' && (
          <>
            {loading ? (
              <div className="loading-overlay">
                <span className="spinner" /> Loading portfolio...
              </div>
            ) : summary?.positionCount === 0 ? (
              <div className="empty-state">
                <Briefcase size={56} />
                <h3>Your portfolio is empty</h3>
                <p>Add your first investment to start tracking your wealth.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => setShowAddMenu(v => !v)}>
                    <Plus size={16} /> Add Investment <ChevronDown size={12} />
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPdfUpload(true)}>
                    <Upload size={16} /> Import PDF
                  </button>
                </div>
                <WatchlistTable
                  watchlist={watchlist}
                  onRemove={handleRemoveWatch}
                  onSelect={handleSelectWatchlistItem}
                />
              </div>
            ) : (
              <>
                <StatsCards summary={summary} />
                <AllocationChart
                  allocation={summary?.allocationByType}
                  positions={summary?.positions}
                />
                <div style={{ marginTop: 20 }}>
                  <PositionsTable
                    positions={summary?.positions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onSelect={handleSelectPosition}
                    onBuy={handleBuy}
                    onSell={handleSell}
                  />
                  <WatchlistTable
                    watchlist={watchlist}
                    onRemove={handleRemoveWatch}
                    onSelect={handleSelectWatchlistItem}
                  />
                </div>
              </>
            )}
          </>
        )}

        {view === 'analyse' && (
          loading ? (
            <div className="loading-overlay">
              <span className="spinner" /> Loading portfolio...
            </div>
          ) : (
            <AnalyseView summary={summary} />
          )
        )}

        {view === 'transactions' && <TransactionsView />}

        {view.startsWith('chart:') && (() => {
          const activeTicker = view.slice(6); // remove "chart:"
          const activeTab = chartTabs.find(t => t.ticker?.toUpperCase() === activeTicker);
          return activeTab ? <PriceChartView position={activeTab} /> : null;
        })()}

        {view === 'market' && (
          <MarketLookup
            onWatch={handleWatch}
            watchedTickers={watchlist.map(w => w.ticker?.toUpperCase())}
          />
        )}
      </main>

      {/* Modals */}
      <InvestmentModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingPosition(null); }}
        onSave={handleSave}
        editData={editingPosition}
        defaultAssetType={defaultAssetType}
      />

      <CashModal
        isOpen={showCashModal}
        onClose={() => { setShowCashModal(false); setEditingPosition(null); }}
        onSave={handleSave}
        editData={editingPosition}
      />

      <TradeModal
        isOpen={showTradeModal}
        onClose={() => { setShowTradeModal(false); setTradePosition(null); }}
        onTrade={handleTrade}
        position={tradePosition}
        mode={tradeMode}
        cashPositions={(summary?.positions || []).filter(p => p.assetType === 'CASH')}
      />

      <PdfUpload
        isOpen={showPdfUpload}
        onClose={() => setShowPdfUpload(false)}
        onImported={handlePdfImported}
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✓' : '✕'} {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
