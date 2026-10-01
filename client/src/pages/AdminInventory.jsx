import { useState, useEffect } from "react";
import axios from "axios";

function AdminInventory() {
  const [stock, setStock] = useState([]);
  const [restockAmount, setRestockAmount] = useState({});
  const [error, setError] = useState("");

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
    const quantityAdded = Number(restockAmount[productId]);
    if (!quantityAdded || quantityAdded <= 0) return;
    try {
      await axios.put(
        `http://localhost:5000/api/inventory/${productId}/restock`,
        { quantityAdded },
        authHeader,
      );
      setRestockAmount({ ...restockAmount, [productId]: "" });
      loadStock();
    } catch (err) {
      setError(err.response?.data?.error || "Could not restock");
    }
  };

  return (
    <div className="container mt-5">
      <h2>HQ Inventory</h2>
      {error && <p className="text-danger">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>In Stock</th>
            <th>Restock</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item) => (
            <tr key={item.product_id}>
              <td>{item.name}</td>
              <td>{item.quantity_in_stock}</td>
              <td>
                <input
                  type="number"
                  style={{ width: "80px" }}
                  value={restockAmount[item.product_id] || ""}
                  onChange={(e) =>
                    setRestockAmount({
                      ...restockAmount,
                      [item.product_id]: e.target.value,
                    })
                  }
                />
                <button
                  className="btn btn-sm btn-primary ms-2"
                  onClick={() => handleRestock(item.product_id)}
                >
                  Add
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminInventory;
