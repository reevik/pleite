import { useState, useEffect, useCallback, useRef } from 'react';
import { investmentApi, marketApi, watchlistApi } from '../services/api';

export function usePortfolio() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimerRef = useRef(null);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await investmentApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch portfolio summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    // Auto-refresh every 60 seconds
    refreshTimerRef.current = setInterval(fetchSummary, 60000);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetchSummary]);

  return { summary, loading, error, refresh: fetchSummary };
}

export function useTickerSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await marketApi.search(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return { query, setQuery, results, searching, clearResults: () => setResults([]) };
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const data = await watchlistApi.getAll();
      setWatchlist(data || []);
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    refreshTimerRef.current = setInterval(fetch, 60000);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetch]);

  const add = useCallback(async (item) => {
    await watchlistApi.add(item);
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id) => {
    await watchlistApi.remove(id);
    fetch();
  }, [fetch]);

  return { watchlist, loading, refresh: fetch, add, remove };
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return { toasts, addToast };
}
