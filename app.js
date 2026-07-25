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
h(
"div",
null,
h("div", { className: "fw-bold" }, coin.name),
h("div", { className: "text-secondary small text-uppercase" }, coin.symbol)
)
),
h("div", { className: "fs-5 fw-semibold mb-1" }, formatCurrency(coin.current_price)),
h(
"div",
{ className: changeClass + " small mb-2" },
`${arrow} ${Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}% (24h)`
),
h("div", { className: "small text-secondary" }, `Market Cap: ${formatCompact(coin.market_cap)}`),
h("div", { className: "small text-secondary" }, `Volume: ${formatCompact(coin.total_volume)}`)
)
);
}
function ChartModal({ coin, onClose }) {
const canvasRef = useRef(null);
const chartInstanceRef = useRef(null);
const [days, setDays] = useState(7);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
if (!coin) return;

async function loadHistory() {
setLoading(true);
setError(null);
try {
const res = await fetch(
`${API_BASE}/coins/${coin.id}/market_chart?vs_currency=usd&days=${days}`
);
if (!res.ok) throw new Error(`API error: ${res.status}`);
const data = await res.json();
const prices = data.prices || [];
const labels = prices.map((p) =>
new Date(p[0]).toLocaleDateString(undefined, {
month: "short",
day: "numeric",
hour: days <= 1 ? "2-digit" : undefined,
})
);
const values = prices.map((p) => p[1]);

if (chartInstanceRef.current) chartInstanceRef.current.destroy();

const ctx = canvasRef.current.getContext("2d");
chartInstanceRef.current = new Chart(ctx, {
type: "line",
data: {
labels,
datasets: [
{
label: `${coin.name} price (USD)`,
data: values,
borderColor: "#1a1a1a",
backgroundColor: "rgba(26,26,26,0.06)",
fill: true,
tension: 0,
pointRadius: 0,
borderWidth: 1.5,
},
],
},
options: {
responsive: true,
plugins: { legend: { labels: { color: "#1a1a1a" } } },
scales: {
x: { ticks: { color: "#6b6b6b", maxTicksLimit: 8 }, grid: { color: "#e2e2e2" } },
y: { ticks: { color: "#6b6b6b" }, grid: { color: "#e2e2e2" } },
},
},
});
} catch (err) {
console.error(err);
setError(err.message || "Failed to load chart data.");
} finally {
setLoading(false);
}
}

loadHistory();
return () => {
if (chartInstanceRef.current) chartInstanceRef.current.destroy();
};
}, [coin, days]);

if (!coin) return null;

const rangeOptions = [
{ label: "24h", value: 1 },
{ label: "7d", value: 7 },
{ label: "30d", value: 30 },
{ label: "90d", value: 90 },
];

return h(
"div",
{ className: "modal show d-block", tabIndex: "-1", style: { backgroundColor: "rgba(0,0,0,0.6)" } },
h(
"div",
{ className: "modal-dialog modal-lg modal-dialog-centered" },
h(
"div",
{ className: "modal-content" },
h(
"div",
{ className: "modal-header border-secondary" },
h(
"h5",
{ className: "modal-title d-flex align-items-center" },
h("img", { src: coin.image, className: "coin-icon me-2", alt: coin.name }),
`${coin.name} (${coin.symbol.toUpperCase()}) Price History`
),
h("button", { className: "btn-close", onClick: onClose })
),
h(
"div",
{ className: "modal-body" },
h(
"div",
{ className: "btn-group mb-3" },
rangeOptions.map((r) =>
h(
"button",
{
key: r.value,
className: `btn btn-sm ${days === r.value ? "btn-primary" : "btn-outline-secondary"}`,
onClick: () => setDays(r.value),
},
r.label
)
)
),
loading && h("p", { className: "text-secondary" }, "Loading chart..."),
error && h("p", { className: "text-danger" }, error),
h("canvas", { ref: canvasRef, height: "300" })
)
)
)
);
}
function PortfolioCalculator({ coins }) {
const [holdings, setHoldings] = useState(() => {
try {
const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
return saved ? JSON.parse(saved) : [];
} catch (err) {
console.error("Failed to read saved portfolio:", err);
return [];
}
});
const [selectedCoinId, setSelectedCoinId] = useState("");
const [quantityInput, setQuantityInput] = useState("");
const [formError, setFormError] = useState("");
useEffect(() => {
try {
localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(holdings));
} catch (err) {
console.error("Failed to save portfolio:", err);
}
}, [holdings]);
const findCoin = useCallback((id) => coins.find((c) => c.id === id), [coins]);
const handleAddHolding = (e) => {
e.preventDefault();
setFormError("");
const quantity = parseFloat(quantityInput);
if (!selectedCoinId) {
setFormError("Choose a coin first.");
return;
}
if (isNaN(quantity) || quantity <= 0) {
setFormError("Enter a quantity greater than 0.");
return;
}
setHoldings((prev) => {
const existing = prev.find((hld) => hld.id === selectedCoinId);
if (existing) {
return prev.map((hld) =>
hld.id === selectedCoinId ? { ...hld, quantity: hld.quantity + quantity } : hld
);
}
return [...prev, { id: selectedCoinId, quantity }];
});
setQuantityInput("");
};
const handleRemove = (id) => {
setHoldings((prev) => prev.filter((hld) => hld.id !== id));
};
const rows = useMemo(() => {
return holdings
.map((hld) => {
const coin = findCoin(hld.id);
if (!coin) return null;
const value = hld.quantity * coin.current_price;
return {
id: hld.id,
name: coin.name,
symbol: coin.symbol,
image: coin.image,
quantity: hld.quantity,
price: coin.current_price,
value,
};
})
.filter(Boolean);
}, [holdings, coins]);
const totalValue = useMemo(() => rows.reduce((sum, r) => sum + r.value, 0), [rows]);
return h(
"div",
{ className: "portfolio-section p-4 mb-4" },
h(
"div",
{ className: "d-flex justify-content-between align-items-start" },
h(
"div",
null,
h("h5", { className: "fw-bold mb-1" }, "Portfolio Value Calculator"),
h(
"p",
{ className: "text-secondary small mb-3" },
"Enter how much of each coin you hold. Values are computed from the live prices above and update on every refresh. Your holdings are saved in this browser."
)
),
holdings.length > 0 &&
h(
"button",
{ className: "btn btn-sm remove-btn", onClick: () => setHoldings([]) },
"Clear all"
)
),
h(
"form",
{ className: "row g-2 align-items-end mb-3", onSubmit: handleAddHolding },
h(
"div",
{ className: "col-sm-5" },
h("label", { className: "form-label small text-secondary mb-1" }, "Coin"),
h(
"select",
{
className: "form-select bg-dark text-light border-secondary",
value: selectedCoinId,
onChange: (e) => setSelectedCoinId(e.target.value),
},
h("option", { value: "" }, "Select a coin..."),
coins.map((c) =>
h("option", { key: c.id, value: c.id }, `${c.name} (${c.symbol.toUpperCase()})`)
)
)
),
h(
"div",
{ className: "col-sm-4" },
h("label", { className: "form-label small text-secondary mb-1" }, "Quantity"),
h("input", {
type: "number",
step: "any",
min: "0",
className: "form-control bg-dark text-light border-secondary",
placeholder: "e.g. 0.5",
value: quantityInput,
onChange: (e) => setQuantityInput(e.target.value),
})
),
h(
"div",
{ className: "col-sm-3" },
h("button", { type: "submit", className: "btn btn-primary w-100" }, "Add holding")
)
),
formError && h("p", { className: "text-danger small" }, formError),
rows.length === 0
? h("p", { className: "text-secondary small mb-0" }, "No holdings added yet.")
: h(
"div",
{ className: "table-responsive" },
h(
"table",
{ className: "table table-dark table-borderless portfolio-table mb-0" },
h(
"thead",
null,
h(
"tr",
{ className: "text-secondary small" },
h("th", null, "Coin"),
h("th", { className: "text-end" }, "Quantity"),
h("th", { className: "text-end" }, "Price"),
h("th", { className: "text-end" }, "Value"),
h("th", { className: "text-end" }, "Allocation"),
h("th", null)
)
),
h(
"tbody",
null,
rows.map((r) =>
h(
"tr",
{ key: r.id },
h(
"td",
null,
h(
"div",
{ className: "d-flex align-items-center" },
h("img", {
src: r.image,
alt: r.name,
className: "coin-icon me-2",
style: { width: 22, height: 22 },
}),
h(
"span",
null,
`${r.name} `,
h("span", { className: "text-secondary text-uppercase small" }, `(${r.symbol})`)
)
)
),
h("td", { className: "text-end" }, r.quantity),
h("td", { className: "text-end" }, formatCurrency(r.price)),
h("td", { className: "text-end" }, formatCurrency(r.value)),
h(
"td",
{ className: "text-end" },
`${totalValue > 0 ? ((r.value / totalValue) * 100).toFixed(1) : "0.0"}%`
),
h(
"td",
{ className: "text-end" },
h(
"button",
{ className: "btn btn-sm remove-btn", onClick: () => handleRemove(r.id) },
"Remove"
)
)
)
)
),
h(
"tfoot",
null,
h(
"tr",
{ className: "portfolio-total-row" },
h("td", { colSpan: "3" }, "Total portfolio value"),
h("td", { className: "text-end" }, formatCurrency(totalValue)),
h("td", { colSpan: "2" })
)
)
)
)
);
}

function App() {
const { coins, loading, error, lastUpdated, refetch } = useCoinMarkets(REFRESH_INTERVAL_MS);
const [query, setQuery] = useState("");
const [selectedCoin, setSelectedCoin] = useState(null);
const filteredCoins = coins.filter((c) => {
const q = query.trim().toLowerCase();
if (!q) return true;
return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
});
const topGainer = coins.length
? coins.reduce(
(max, c) => (c.price_change_percentage_24h > (max?.price_change_percentage_24h ?? -Infinity) ? c : max),
null
)
: null;
return h(
"div",
null,
h(
"nav",
{ className: "navbar navbar-dark mb-4" },
h(
"div",
{ className: "container" },
h("span", { className: "navbar-brand fw-bold fs-4" }, "Crypto Price Tracker"),
h(
"span",
{ className: "badge bg-secondary refresh-badge" },
lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : "Loading..."
)
)
),
h(
"div",
{ className: "container" },
h(SearchBar, { query, setQuery }),
topGainer &&
h(
"div",
{ className: "alert alert-dark border border-secondary text-center mb-4" },
"Top 24h Gainer: ",
h("strong", null, topGainer.name),
" (",
h("span", { className: "price-up" }, `+${topGainer.price_change_percentage_24h.toFixed(2)}%`),
")"
),
error &&
h(
"div",
{ className: "alert alert-danger d-flex justify-content-between align-items-center" },
h("span", null, error),
h("button", { className: "btn btn-sm btn-outline-light", onClick: refetch }, "Retry")
),
!loading && coins.length > 0 && h(PortfolioCalculator, { coins }),
loading && !coins.length
? h(
"div",
{ className: "text-center py-5" },
h("div", { className: "spinner-border text-primary", role: "status" }),
h("p", { className: "mt-3" }, "Fetching live cryptocurrency data...")
)
: h(
"div",
{ className: "row" },
filteredCoins.length
? filteredCoins.map((coin) => h(CoinCard, { key: coin.id, coin, onSelect: setSelectedCoin }))
: h("p", { className: "text-center text-secondary" }, "No coins match your search.")
)
),
h(ChartModal, { coin: selectedCoin, onClose: () => setSelectedCoin(null) }),
h(
"footer",
{ className: "text-center text-secondary py-4 small" },
"Data provided by CoinGecko API · Auto-refreshes every 60 seconds"
)
);
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(h(App));