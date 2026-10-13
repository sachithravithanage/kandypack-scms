import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { apiUrl } from "../api";
import {
  IconSearch,
  IconPlus,
  IconMinus,
  IconTrash,
  IconShoppingCart,
  IconCalendar,
  IconMapPin,
  IconBuilding,
  IconAlertCircle,
  IconCircleCheck,
  IconArrowLeft,
  IconBox,
  IconInfoCircle,
} from "@tabler/icons-react";

const API_BASE = apiUrl("/api");

// Dates are handled in the user's LOCAL time zone. (toISOString() converts to UTC,
// which in Sri Lanka (UTC+5:30) gives the previous day between 00:00 and 05:30.)
const toLocalDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseLocalDate = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};

function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();

  // Data Sources
  const [products, setProducts] = useState([]);
  const [cities, setCities] = useState([]);
  const [stops, setStops] = useState([]);

  // Form selections
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedRouteStopId, setSelectedRouteStopId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [cart, setCart] = useState([]); // [{ product_id, name, unit_price, space_consumption_rate, quantity }]

  // Product Search / Filter (sent to the server, which uses the product indexes)
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [productsLoading, setProductsLoading] = useState(true);

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const token = localStorage.getItem("token");
  const customerId = (() => {
    const stored = localStorage.getItem("userId") || localStorage.getItem("customerId");
    if (stored) return Number(stored);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload && payload.userId) return Number(payload.userId);
      } catch (err) {
        console.warn("Unable to read the stored customer token.", err);
      }
    }
    return 9;
  })();
  const authHeader = token ? {
    headers: { Authorization: `Bearer ${token}` },
  } : {};

  // Calculate default minimum valid date (today + 7 days)
  const earliestAllowedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toLocalDateString(d);
  }, []);

  // Set default delivery date to earliest allowed
  useEffect(() => {
    setDeliveryDate(earliestAllowedDate);
  }, [earliestAllowedDate]);

  // Handle re-ordering items passed from MyOrders page
  useEffect(() => {
    if (location.state?.reorderItems && Array.isArray(location.state.reorderItems)) {
      setCart(
        location.state.reorderItems.map((item) => ({
          product_id: item.product_id,
          name: item.product_name || item.name,
          unit_price: item.unit_price,
          space_consumption_rate: item.space_consumption_rate,
          quantity: Number(item.quantity) || 1,
        }))
      );
      if (location.state.deliveryAddress) {
        setDeliveryAddress(location.state.deliveryAddress);
      }
      setSuccessMsg("Pre-filled items from previous order. Please review and choose delivery date.");
    }
  }, [location.state]);

  // Load delivery cities once
  useEffect(() => {
    const loadCities = async () => {
      try {
        const cityRes = await axios.get(`${API_BASE}/cities`);
        setCities(cityRes.data || []);
      } catch (err) {
        console.error("Failed to load cities:", err);
        setError("Could not load delivery cities. Make sure the server is running.");
      }
    };
    loadCities();
  }, []);

  // Search-as-you-type: query the server (name LIKE search + unit_price index for price filter/sort).
  // Typing is debounced so we do not fire a request on every keystroke, and an
  // in-flight request is cancelled when a newer one starts so stale results
  // can never overwrite fresh ones.
  const priceRangeInvalid =
    minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);

  useEffect(() => {
    if (priceRangeInvalid) {
      setProductsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const hasFilters = searchQuery.trim() !== "" || minPrice !== "" || maxPrice !== "";
    const delay = hasFilters ? 300 : 0;

    const timer = setTimeout(async () => {
      let cancelled = false;
      try {
        setProductsLoading(true);
        const params = { sort: sortBy };
        if (searchQuery.trim()) params.q = searchQuery.trim();
        if (minPrice !== "") params.minPrice = minPrice;
        if (maxPrice !== "") params.maxPrice = maxPrice;

        const res = await axios.get(`${API_BASE}/products`, {
          params,
          signal: controller.signal,
        });
        setProducts(res.data || []);
      } catch (err) {
        if (axios.isCancel(err)) {
          cancelled = true;
          return;
        }
        console.error("Failed to load products:", err);
        setError(err.response?.data?.error || "Could not load products. Make sure the server is running.");
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, minPrice, maxPrice, sortBy, priceRangeInvalid]);

  // When city changes, load stops for that city
  useEffect(() => {
    if (!selectedCityId) {
      setStops([]);
      setSelectedRouteStopId("");
      return;
    }

    const loadStops = async () => {
      try {
        const res = await axios.get(`${API_BASE}/routes/stops?cityId=${selectedCityId}`);
        setStops(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedRouteStopId(String(res.data[0].route_stop_id));
        } else {
          setSelectedRouteStopId("");
        }
      } catch (err) {
        console.error("Failed to load route stops:", err);
        setError("Could not load delivery stops for the selected city.");
      }
    };

    loadStops();
  }, [selectedCityId]);

  // Check 7-day rule status
  const leadTimeValidation = useMemo(() => {
    if (!deliveryDate) {
      return { isValid: false, days: 0, message: "Please select a delivery date." };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = parseLocalDate(deliveryDate);
    const diffTime = chosen.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return {
        isValid: false,
        days: diffDays,
        message: `Delivery date must be at least 7 days from today. Earliest permitted date is ${earliestAllowedDate}.`,
      };
    }
    return {
      isValid: true,
      days: diffDays,
      message: `Lead time: ${diffDays} days notice (Meets the 7-day requirement).`,
    };
  }, [deliveryDate, earliestAllowedDate]);

  // Cart operations with inventory stock limits
  const addToCart = (product) => {
    const available = product.quantity_in_stock !== undefined ? Number(product.quantity_in_stock) : 99999;
    if (available <= 0) {
      setError(`"${product.name}" is currently out of stock in the central warehouse.`);
      return;
    }

    setError("");
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= available) {
          setError(`Cannot add more: you already have all ${available} available units of "${product.name}" in your cart.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    const product = products.find((p) => p.product_id === productId);
    const available = product?.quantity_in_stock !== undefined ? Number(product.quantity_in_stock) : 99999;

    setError("");
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > available) {
              setError(`Cannot exceed available stock of ${available} units for "${item.name}".`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Cart Totals
  const { totalValue, totalVolume, totalUnits } = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const qty = item.quantity;
        acc.totalValue += parseFloat(item.unit_price || 0) * qty;
        acc.totalVolume += parseFloat(item.space_consumption_rate || 0) * qty;
        acc.totalUnits += qty;
        return acc;
      },
      { totalValue: 0, totalVolume: 0, totalUnits: 0 }
    );
  }, [cart]);

  // Handle Form Submission
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError("");

    if (cart.length === 0) {
      setError("Please add at least one product to your order.");
      return;
    }

    if (!selectedRouteStopId) {
      setError("Please choose a delivery city and specific delivery stop.");
      return;
    }

    if (!deliveryAddress.trim()) {
      setError("Please provide a specific delivery address.");
      return;
    }

    if (!leadTimeValidation.isValid) {
      setError(leadTimeValidation.message);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerId,
        routeStopId: Number(selectedRouteStopId),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate,
        items: cart.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
        })),
      };

      const res = await axios.post(`${API_BASE}/orders`, payload, authHeader);
      setSuccessMsg(`Order #${res.data.orderId} placed successfully!`);
      setTimeout(() => {
        navigate("/orders");
      }, 1200);
    } catch (err) {
      console.error("Order submission error:", err);
      setError(err.response?.data?.error || "Could not place order. Please review stock or input data.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout pageTitle="Place New Order">
      {/* Top Breadcrumb & Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/orders" className="btn btn-sm btn-secondary d-inline-flex align-items-center gap-1">
          <IconArrowLeft size={16} />
          <span>Back to My Orders</span>
        </Link>
        <span className="text-muted small">Customer Account ID: #{customerId}</span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-3" role="alert">
          <IconAlertCircle className="me-2 flex-shrink-0" size={18} />
          <div>{error}</div>
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close"></button>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success d-flex align-items-center mb-3" role="alert">
          <IconCircleCheck className="me-2 flex-shrink-0" size={18} />
          <div>{successMsg} Redirecting to your orders…</div>
        </div>
      )}

      <div className="row g-3">
        {/* ======================================================== */}
        {/* LEFT COLUMN: Product Catalog (Figure 14 Product Selection) */}
        {/* ======================================================== */}
        <div className="col-lg-7 col-md-12">
          <div className="kp-card mb-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="h6 mb-0">Product Catalog</h3>
                <span className="text-muted small">Select FMCG inventory items to add to your order</span>
              </div>
              <div className="kp-search" style={{ width: 220 }}>
                <IconSearch size={16} stroke={1.75} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Price range + sort filters */}
            <div className="row g-2 mb-3 align-items-end">
              <div className="col-4">
                <label className="form-label small mb-1">Min price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control form-control-sm"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <div className="col-4">
                <label className="form-label small mb-1">Max price (LKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control form-control-sm"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
              <div className="col-4">
                <label className="form-label small mb-1">Sort by</label>
                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name_asc">Name (A–Z)</option>
                  <option value="price_asc">Price (low to high)</option>
                  <option value="price_desc">Price (high to low)</option>
                  <option value="stock_desc">Highest Stock First</option>
                </select>
              </div>
              {priceRangeInvalid && (
                <div className="col-12 small text-danger">
                  Minimum price cannot be greater than maximum price.
                </div>
              )}
              {(searchQuery || minPrice !== "" || maxPrice !== "") && (
                <div className="col-12 d-flex justify-content-between align-items-center small text-muted">
                  <span>{productsLoading ? "Searching…" : `${products.length} product(s) found`}</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => {
                      setSearchQuery("");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {productsLoading && products.length === 0 ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
                <div className="text-muted small">Loading catalog…</div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <IconBox size={32} stroke={1.5} className="mb-2" />
                <p className="mb-0 small">No products match your search.</p>
              </div>
            ) : (
              <div
                className="row g-2"
                style={{ opacity: productsLoading ? 0.6 : 1, transition: "opacity 0.15s ease" }}
              >
                {products.map((p) => {
                  const cartItem = cart.find((i) => i.product_id === p.product_id);
                  const inCartQty = cartItem ? cartItem.quantity : 0;
                  const stock = p.quantity_in_stock !== undefined ? Number(p.quantity_in_stock) : 0;
                  const isOutOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= 50;

                  return (
                    <div key={p.product_id} className="col-md-6 col-12">
                      <div
                        className="p-3 border rounded h-100 d-flex flex-column justify-content-between"
                        style={{
                          background: isOutOfStock
                            ? "var(--color-bg-subtle, #f8fafc)"
                            : inCartQty > 0
                            ? "var(--color-amber-50)"
                            : "var(--color-surface)",
                          borderColor: inCartQty > 0 ? "var(--color-amber-500)" : "var(--color-border)",
                          opacity: isOutOfStock ? 0.75 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div className="d-flex justify-content-between align-items-start gap-1 mb-1">
                            <span className="fw-semibold text-dark" style={{ fontSize: "0.925rem" }}>
                              {p.name}
                            </span>
                            <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: "0.7rem" }}>
                              #{p.product_id}
                            </span>
                          </div>

                          <div className="d-flex align-items-center gap-3 text-muted small mb-2">
                            <span>
                              <strong>LKR {parseFloat(p.unit_price).toFixed(2)}</strong> / unit
                            </span>
                            <span>•</span>
                            <span>{parseFloat(p.space_consumption_rate).toFixed(2)} m³ space</span>
                          </div>

                          {/* Inventory stock badge */}
                          <div className="mb-2">
                            {isOutOfStock ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: "0.72rem" }}>
                                Out of Stock (0 units)
                              </span>
                            ) : isLowStock ? (
                              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: "0.72rem" }}>
                                Low Stock: {stock} units left
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "0.72rem" }}>
                                In Stock: {stock} units
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                          {inCartQty > 0 ? (
                            <div className="d-flex align-items-center gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28 }}
                                onClick={() => updateQuantity(p.product_id, -1)}
                              >
                                <IconMinus size={14} />
                              </button>
                              <span className="fw-bold px-1" style={{ minWidth: 20, textAlign: "center" }}>
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                className="btn btn-sm btn-primary p-1 rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 28, height: 28 }}
                                onClick={() => updateQuantity(p.product_id, 1)}
                                disabled={inCartQty >= stock}
                              >
                                <IconPlus size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">Not in cart</span>
                          )}

                          <button
                            type="button"
                            className={`btn btn-sm ${
                              isOutOfStock
                                ? "btn-secondary text-muted"
                                : inCartQty > 0
                                ? "btn-outline-primary"
                                : "btn-primary"
                            } px-3`}
                            onClick={() => addToCart(p)}
                            disabled={isOutOfStock || inCartQty >= stock}
                          >
                            <IconPlus size={14} className="me-1" />
                            {isOutOfStock
                              ? "Out of Stock"
                              : inCartQty >= stock
                              ? "Stock Reached"
                              : inCartQty > 0
                              ? "Add More"
                              : "Add to Order"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Order Form & Summary (Figure 14 Order Form) */}
        {/* ======================================================== */}
        <div className="col-lg-5 col-md-12">
          <form onSubmit={handleSubmitOrder} className="d-flex flex-column gap-3">
            {/* Delivery Location Section */}
            <div className="kp-card">
              <h3 className="h6 mb-3 d-flex align-items-center gap-2">
                <IconMapPin size={18} className="text-primary" />
                <span>Delivery Location & Stop</span>
              </h3>

              {/* City Selection */}
              <div className="mb-3">
                <label className="form-label">
                  <IconBuilding size={14} className="me-1" /> Destination City
                </label>
                <select
                  className="form-select"
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  required
                >
                  <option value="">Select destination city...</option>
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  Routes and delivery stops correspond to the selected regional city hub.
                </div>
              </div>

              {/* Delivery Stop Selection */}
              <div className="mb-3">
                <label className="form-label">Delivery Stop / Route</label>
                <select
                  className="form-select"
                  value={selectedRouteStopId}
                  onChange={(e) => setSelectedRouteStopId(e.target.value)}
                  disabled={!selectedCityId || stops.length === 0}
                  required
                >
                  <option value="">
                    {!selectedCityId
                      ? "Select a city first"
                      : stops.length === 0
                      ? "No active stops found for this city"
                      : "Select delivery stop..."}
                  </option>
                  {stops.map((s) => (
                    <option key={s.route_stop_id} value={s.route_stop_id}>
                      {s.stop_name} — Route: {s.route_name || `#${s.route_id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exact Delivery Address */}
              <div className="mb-1">
                <label className="form-label">Exact Delivery Address (Street / Storefront)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. No. 45 Galle Road, Suite 3, Colombo"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  required
                ></textarea>
                <div className="form-text small text-muted">
                  Stored directly with this order for driver routing and last-mile dispatch.
                </div>
              </div>
            </div>

            {/* Delivery Date & 7-Day Lead Time Policy (REQ-ORD-02) */}
            <div className="kp-card">
              <h3 className="h6 mb-2 d-flex align-items-center gap-2">
                <IconCalendar size={18} className="text-primary" />
                <span>Requested Delivery Date</span>
              </h3>

              <div className="mb-2">
                <input
                  type="date"
                  className="form-control"
                  min={earliestAllowedDate}
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>

              {/* Lead-Time Validation Feedback Message */}
              {leadTimeValidation.isValid ? (
                <div className="p-2 rounded bg-success-subtle text-success small d-flex align-items-center gap-2">
                  <IconCircleCheck size={18} className="flex-shrink-0" />
                  <div>{leadTimeValidation.message}</div>
                </div>
              ) : (
                <div className="p-2 rounded bg-danger-subtle text-danger small d-flex align-items-center gap-2">
                  <IconAlertCircle size={18} className="flex-shrink-0" />
                  <div>{leadTimeValidation.message}</div>
                </div>
              )}

              <div className="small text-muted mt-2 d-flex align-items-start gap-1">
                <IconInfoCircle size={14} className="flex-shrink-0 mt-1" />
                <span>
                  Orders must be placed at least 7 days before required delivery to allow rail scheduling.
                </span>
              </div>
            </div>

            {/* Selected Items & Order Summary */}
            <div className="kp-card">
              <h3 className="h6 mb-3 d-flex align-items-center justify-content-between">
                <span className="d-flex align-items-center gap-2">
                  <IconShoppingCart size={18} className="text-primary" />
                  <span>Order Items Summary</span>
                </span>
                <span className="badge bg-secondary-subtle text-secondary">
                  {totalUnits} units
                </span>
              </h3>

              {cart.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  Your order is currently empty. Add items from the catalog on the left.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2 mb-3">
                  {cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="d-flex justify-content-between align-items-center p-2 rounded bg-light border"
                    >
                      <div style={{ flex: 1 }}>
                        <div className="fw-semibold small text-dark">{item.name}</div>
                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {item.quantity} × LKR {parseFloat(item.unit_price).toFixed(2)} ={" "}
                          <strong>LKR {(item.quantity * item.unit_price).toFixed(2)}</strong>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary p-1"
                          style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => updateQuantity(item.product_id, -1)}
                        >
                          <IconMinus size={12} />
                        </button>
                        <span className="small fw-bold px-1">{item.quantity}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary p-1"
                          style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}
                          onClick={() => updateQuantity(item.product_id, 1)}
                        >
                          <IconPlus size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm text-danger p-1 ms-1"
                          onClick={() => removeFromCart(item.product_id)}
                          title="Remove item"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="pt-2 border-top">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>Cargo Space Required:</span>
                  <span className="fw-semibold text-dark">{totalVolume.toFixed(2)} m³</span>
                </div>
                <div className="d-flex justify-content-between fs-6 fw-bold mb-3">
                  <span>Total Order Value:</span>
                  <span className="text-dark">
                    LKR {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                  disabled={submitting || cart.length === 0 || !leadTimeValidation.isValid || !selectedRouteStopId || !deliveryAddress.trim()}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Placing Order…</span>
                    </>
                  ) : (
                    <>
                      <IconCircleCheck size={18} />
                      <span>Confirm & Place Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

export default NewOrder;
