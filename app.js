const { useState, useEffect, useCallback, useRef, useMemo } = React;
const API_BASE = "https://api.coingecko.com/api/v3";
const REFRESH_INTERVAL_MS = 60000; // 60s auto-refresh

/* ---------- Utility formatting functions ---------- */
const formatCurrency = (num) => {
  if (num === null || num === undefined) return "N/A";
  return "$" + num.toLocaleString(undefined, { maximumFractionDigits: num < 1 ? 6 : 2 });
};

const formatCompact = (num) => {
  if (num === null || num === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(num);
};

/* ---------- Custom Hook: fetch + auto-refresh coin list ---------- */
function useCoinMarkets(refreshMs) {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCoins = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setCoins(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch cryptocurrency data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
    const timer = setInterval(fetchCoins, refreshMs);
    return () => clearInterval(timer);
  }, [fetchCoins, refreshMs]);

  return { coins, loading, error, lastUpdated, refetch: fetchCoins };
}