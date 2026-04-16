import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { marketApi } from '../services/api';

const CurrencyContext = createContext();

/**
 * Portfolio base currency is EUR.
 * displayCurrency can be 'EUR' or 'USD'.
 * eurToUsd is the live EUR→USD rate.
 */
export function CurrencyProvider({ children }) {
  const [displayCurrency, setDisplayCurrency] = useState('EUR');
  const [eurToUsd, setEurToUsd] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchRate = useCallback(async () => {
    try {
      setLoading(true);
      const quote = await marketApi.getQuote('EURUSD=X');
      if (quote?.price) {
        setEurToUsd(Number(quote.price));
      }
    } catch (err) {
      console.error('Failed to fetch EUR/USD rate:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch rate on mount and every 5 minutes
  useEffect(() => {
    fetchRate();
    const timer = setInterval(fetchRate, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchRate]);

  const toggleCurrency = useCallback(() => {
    setDisplayCurrency(prev => prev === 'EUR' ? 'USD' : 'EUR');
  }, []);

  /**
   * Convert an amount from its source currency to the display currency.
   * sourceCurrency defaults to 'EUR' (portfolio base).
   */
  const convert = useCallback((amount, sourceCurrency = 'EUR') => {
    if (amount == null) return null;
    const num = Number(amount);
    if (isNaN(num)) return null;

    const src = (sourceCurrency || 'EUR').toUpperCase();
    const dst = displayCurrency;

    if (src === dst) return num;
    if (!eurToUsd) return num; // rate not loaded yet, show as-is

    if (src === 'EUR' && dst === 'USD') return num * eurToUsd;
    if (src === 'USD' && dst === 'EUR') return num / eurToUsd;

    // For other currencies, pass through (no conversion)
    return num;
  }, [displayCurrency, eurToUsd]);

  return (
    <CurrencyContext.Provider value={{
      displayCurrency,
      toggleCurrency,
      eurToUsd,
      convert,
      rateLoading: loading,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
