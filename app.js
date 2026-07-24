const { useState, useEffect, useCallback, useRef, useMemo } = React;
const h = React.createElement;

const API_BASE = "https://api.coingecko.com/api/v3";
const REFRESH_INTERVAL_MS = 60000;
const PORTFOLIO_STORAGE_KEY = "crypto_tracker_portfolio";

const formatCurrency = (num) => {
  if (num === null || num === undefined) return "N/A";
  return "$" + num.toLocaleString(undefined, { maximumFractionDigits: num < 1 ? 6 : 2 });
};

const formatCompact = (num) => {
  if (num === null || num === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(num);
};

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

function SearchBar({ query, setQuery }) {
  return h(
    "div",
    { className: "input-group search-box mx-auto mb-4" },
    h("span", { className: "input-group-text bg-dark text-light border-secondary" }, "Search"),
    h("input", {
      type: "text",
      className: "form-control bg-dark text-light border-secondary",
      placeholder: "Search coin by name or symbol...",
      value: query,
      onChange: (e) => setQuery(e.target.value),
    })
  );
}

function CoinCard({ coin, onSelect }) {
  const changeClass = coin.price_change_percentage_24h >= 0 ? "price-up" : "price-down";
  const arrow = coin.price_change_percentage_24h >= 0 ? "▲" : "▼";
  return h(
    "div",
    { className: "col-sm-6 col-md-4 col-lg-3 mb-4" },
    h(
      "div",
      { className: "coin-card p-3 h-100", onClick: () => onSelect(coin) },
      h(
        "div",
        { className: "d-flex align-items-center mb-2" },
        h("img", { src: coin.image, alt: coin.name, className: "coin-icon me-2" }),
        h("div", null,
          h("div", { className: "fw-bold" }, coin.name),
          h("div", { className: "text-secondary small text-uppercase" }, coin.symbol)
        )
      ),
      h("div", { className: "fs-5 fw-semibold mb-1" }, formatCurrency(coin.current_price)),
      h("div", { className: changeClass + " small mb-2" }, `${arrow} ${Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}% (24h)`),
      h("div", { className: "small text-secondary" }, `Market Cap: ${formatCompact(coin.market_cap)}`),
      h("div", { className: "small text-secondary" }, `Volume: ${formatCompact(coin.total_volume)}`)
    )
  );
}

function App() {
  const { coins, loading, error, lastUpdated, refetch } = useCoinMarkets(REFRESH_INTERVAL_MS);
  const [query, setQuery] = useState("");

  const filteredCoins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return coins;
    return coins.filter((coin) =>
      coin.name.toLowerCase().includes(normalizedQuery) ||
      coin.symbol.toLowerCase().includes(normalizedQuery)
    );
  }, [coins, query]);

  return h(
    "main",
    { className: "container py-4" },
    h(
      "div",
      { className: "d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3" },
      h("h1", { className: "h3 m-0" }, "Crypto Price Tracker"),
      h(
        "div",
        { className: "d-flex align-items-center gap-2" },
        h(
          "span",
          { className: "badge refresh-badge" },
          lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading..."
        ),
        h("button", { className: "btn btn-sm btn-primary", onClick: refetch }, "Refresh")
      )
    ),
    h(SearchBar, { query, setQuery }),
    error && h("div", { className: "alert alert-danger" }, error),
    loading && !coins.length && h("div", { className: "alert alert-dark" }, "Loading market data..."),
    !loading && !filteredCoins.length && h("div", { className: "alert alert-dark" }, "No coins match your search."),
    h(
      "div",
      { className: "row" },
      filteredCoins.map((coin) => h(CoinCard, { key: coin.id, coin, onSelect: () => {} }))
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));