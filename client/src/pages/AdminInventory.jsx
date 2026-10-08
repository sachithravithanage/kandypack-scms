import { useState, useEffect } from "react";
import axios from "axios";
import AppLayout from "../components/AppLayout";
import { IconPackage, IconPlus } from "@tabler/icons-react";

function AdminInventory() {
  const [stock, setStock] = useState([]);
  const [restockAmount, setRestockAmount] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  };

  const loadStock = () => {
    axios
      .get("http://localhost:5000/api/inventory")
      .then((res) => setStock(res.data))
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load inventory"),
      );
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleRestock = async (productId) => {
    setError("");
    setSuccess("");
    const quantityAdded = Number(restockAmount[productId]);
    if (!quantityAdded || quantityAdded <= 0) return;
    try {
      await axios.put(
        `http://localhost:5000/api/inventory/${productId}/restock`,
        { quantityAdded },
        authHeader,
      );
      setSuccess(`Successfully added ${quantityAdded} units to stock!`);
      setRestockAmount({ ...restockAmount, [productId]: "" });
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Could not restock");
    }
  };

  const getStockBadge = (quantity) => {
    if (quantity === 0) {
      return <span className="kp-badge kp-badge-danger">Out of Stock</span>;
    }
    if (quantity < 100) {
      return <span className="kp-badge kp-badge-warning">Low Stock</span>;
    }
    return <span className="kp-badge kp-badge-success">In Stock</span>;
  };

  return (
    <AppLayout pageTitle="HQ Inventory">
      <div className="kp-card">
        <div className="d-flex align-items-center mb-4">
          <div className="kp-stat-icon bg-primary-subtle text-primary mb-0 me-3">
            <IconPackage size={24} />
          </div>
          <div>
            <h2 className="h5 mb-1">Main Warehouse Inventory</h2>
            <p className="text-muted small mb-0">
              Manage product stock levels and restock items to fulfill incoming orders.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger p-2 small">{error}</div>}
        {success && <div className="alert alert-success p-2 small">{success}</div>}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Product Name</th>
                <th>Quantity in Stock</th>
                <th>Status</th>
                <th style={{ width: "220px" }}>Restock Quantity</th>
              </tr>
            </thead>
            <tbody>
              {stock.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    No inventory records found.
                  </td>
                </tr>
              ) : (
                stock.map((item) => (
                  <tr key={item.product_id}>
                    <td className="fw-medium">{item.name}</td>
                    <td style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                      {item.quantity_in_stock}
                    </td>
                    <td>{getStockBadge(item.quantity_in_stock)}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Qty"
                          min="1"
                          style={{ width: "90px" }}
                          value={restockAmount[item.product_id] || ""}
                          onChange={(e) =>
                            setRestockAmount({
                              ...restockAmount,
                              [item.product_id]: e.target.value,
                            })
                          }
                        />
                        <button
                          className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                          onClick={() => handleRestock(item.product_id)}
                          disabled={!restockAmount[item.product_id]}
                        >
                          <IconPlus size={14} /> Add
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminInventory;
