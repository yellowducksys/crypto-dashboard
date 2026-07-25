const API_BASE = "https://api.coingecko.com/api/v3";
const REFRESH_INTERVAL_MS = 60000;

const state = {
  coins: [],
  loading: true,
  error: "",
  query: "",
  lastUpdated: null,
};

const root = document.getElementById("root");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (num) => {
  if (num === null || num === undefined) return "N/A";
  return "$" + Number(num).toLocaleString(undefined, { maximumFractionDigits: num < 1 ? 6 : 2 });
};

const formatCompact = (num) => {
  if (num === null || num === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(num);
};

const getFilteredCoins = () => {
  const normalizedQuery = state.query.trim().toLowerCase();
  if (!normalizedQuery) return state.coins;
  return state.coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(normalizedQuery) ||
      coin.symbol.toLowerCase().includes(normalizedQuery)
  );
};

const render = () => {
  if (!root) return;

  const filteredCoins = getFilteredCoins();
  const statusText = state.lastUpdated ? `Updated ${state.lastUpdated.toLocaleTimeString()}` : "Loading...";
  const cards = filteredCoins
    .map((coin) => {
      const isUp = (coin.price_change_percentage_24h || 0) >= 0;
      const changeClass = isUp ? "price-up" : "price-down";
      const arrow = isUp ? "▲" : "▼";
      const change = Math.abs(coin.price_change_percentage_24h || 0).toFixed(2);

      return `
        <div class="col-sm-6 col-md-4 col-lg-3 mb-4">
          <div class="coin-card p-3 h-100">
            <div class="d-flex align-items-center mb-2">
              <img src="${escapeHtml(coin.image)}" alt="${escapeHtml(coin.name)}" class="coin-icon me-2" />
              <div>
                <div class="fw-bold">${escapeHtml(coin.name)}</div>
                <div class="text-secondary small text-uppercase">${escapeHtml(coin.symbol)}</div>
              </div>
            </div>
            <div class="fs-5 fw-semibold mb-1">${formatCurrency(coin.current_price)}</div>
            <div class="${changeClass} small mb-2">${arrow} ${change}% (24h)</div>
            <div class="small text-secondary">Market Cap: ${formatCompact(coin.market_cap)}</div>
            <div class="small text-secondary">Volume: ${formatCompact(coin.total_volume)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  root.innerHTML = `
    <main class="container py-4">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 class="h3 m-0">Crypto Price Tracker</h1>
        <div class="d-flex align-items-center gap-2">
          <span class="badge refresh-badge">${escapeHtml(statusText)}</span>
          <button id="refresh-btn" class="btn btn-sm btn-primary" type="button">Refresh</button>
        </div>
      </div>

      <div class="input-group search-box mx-auto mb-4">
        <span class="input-group-text bg-dark text-light border-secondary">Search</span>
        <input
          id="search-input"
          type="text"
          class="form-control bg-dark text-light border-secondary"
          placeholder="Search coin by name or symbol..."
          value="${escapeHtml(state.query)}"
        />
      </div>

      ${state.error ? `<div class="alert alert-danger">${escapeHtml(state.error)}</div>` : ""}
      ${state.loading && !state.coins.length ? '<div class="alert alert-dark">Loading market data...</div>' : ""}
      ${!state.loading && !filteredCoins.length ? '<div class="alert alert-dark">No coins match your search.</div>' : ""}

      <div class="row">${cards}</div>
    </main>
  `;

  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", fetchCoins);
  }

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });
  }
};

async function fetchCoins() {
  state.error = "";
  if (!state.coins.length) {
    state.loading = true;
    render();
  }

  try {
    const res = await fetch(
      `${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h`
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    state.coins = Array.isArray(data) ? data : [];
    state.lastUpdated = new Date();
  } catch (err) {
    console.error(err);
    state.error = err?.message || "Failed to fetch cryptocurrency data.";
  } finally {
    state.loading = false;
    render();
  }
}

render();
fetchCoins();
setInterval(fetchCoins, REFRESH_INTERVAL_MS);
