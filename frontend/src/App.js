import { useState, useEffect } from "react";
import "./App.css";

const API = "http://localhost:3001";

const CATEGORIES = ["Bag", "Phone", "Keys", "Wallet", "Laptop", "ID Card", "Books", "Other"];

function App() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ type: "", category: "", status: "" });
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "lost",
    title: "",
    description: "",
    category: "Bag",
    location: "",
    contact: "",
    date: "",
    image: null,
  });

  useEffect(() => {
    fetchItems();
  }, [filter]);

  // 📥 Fetch items
  const fetchItems = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append("type", filter.type);
      if (filter.category) params.append("category", filter.category);
      if (filter.status) params.append("status", filter.status);

      const res = await fetch(`${API}/items?${params}`);
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  // ➕ Submit new item
  const submitItem = async () => {
    if (!form.title || !form.location || !form.contact || !form.date) {
      alert("Please fill in all required fields!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("type", form.type);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("location", form.location);
    formData.append("contact", form.contact);
    formData.append("date", form.date);
    if (form.image) formData.append("image", form.image);

    try {
      await fetch(`${API}/items`, {
        method: "POST",
        body: formData,
      });
      setShowForm(false);
      setForm({
        type: "lost", title: "", description: "",
        category: "Bag", location: "", contact: "", date: "", image: null,
      });
      fetchItems();
    } catch (err) {
      alert("Failed to submit!");
    }
    setLoading(false);
  };

  // ✅ Resolve item
  const resolveItem = async (id) => {
    await fetch(`${API}/items/${id}/resolve`, { method: "PUT" });
    fetchItems();
    setSelectedItem(null);
  };

  // 🗑️ Delete item
  const deleteItem = async (id) => {
    await fetch(`${API}/items/${id}`, { method: "DELETE" });
    fetchItems();
    setSelectedItem(null);
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <h1>🔍 UniFind</h1>
          <p>University Lost & Found System</p>
        </div>
        <button className="post-btn" onClick={() => setShowForm(true)}>
          + Post Item
        </button>
      </header>

      {/* ── Filters ── */}
      <div className="filters">
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>

        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>

        <button className="clear-btn" onClick={() => setFilter({ type: "", category: "", status: "" })}>
          Clear Filters
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats">
        <div className="stat lost">
          <span>{items.filter(i => i.type === "lost" && i.status === "active").length}</span>
          <p>Lost Items</p>
        </div>
        <div className="stat found">
          <span>{items.filter(i => i.type === "found" && i.status === "active").length}</span>
          <p>Found Items</p>
        </div>
        <div className="stat resolved">
          <span>{items.filter(i => i.status === "resolved").length}</span>
          <p>Resolved</p>
        </div>
      </div>

      {/* ── Items Grid ── */}
      <div className="items-grid">
        {items.length === 0 && (
          <div className="empty">
            <p>📭 No items found!</p>
            <p>Be the first to post a lost or found item</p>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`item-card ${item.type} ${item.status}`}
            onClick={() => setSelectedItem(item)}
          >
            {item.imageUrl && (
              <img src={`${API}${item.imageUrl}`} alt={item.title} className="item-image" />
            )}
            <div className="item-body">
              <div className="item-badges">
                <span className={`badge ${item.type}`}>
                  {item.type === "lost" ? "🔴 Lost" : "🟢 Found"}
                </span>
                <span className="badge category">{item.category}</span>
                {item.status === "resolved" && <span className="badge resolved">✅ Resolved</span>}
              </div>
              <h3>{item.title}</h3>
              <p className="item-location">📍 {item.location}</p>
              <p className="item-date">📅 {item.date}</p>
              <p className="item-desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Post Form Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📢 Post an Item</h2>

            <div className="form-group">
              <label>Type *</label>
              <div className="type-toggle">
                <button
                  className={form.type === "lost" ? "active lost" : ""}
                  onClick={() => setForm({ ...form, type: "lost" })}
                >
                  🔴 I Lost Something
                </button>
                <button
                  className={form.type === "found" ? "active found" : ""}
                  onClick={() => setForm({ ...form, type: "found" })}
                >
                  🟢 I Found Something
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Item Name *</label>
              <input
                type="text"
                placeholder="e.g. Black Backpack"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                placeholder="e.g. Library, BLock 1......(Location of loss/found)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Describe the item in detail..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Contact Info *</label>
              <input
                type="text"
                placeholder="e.g. Phone number or email"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Image (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
              />
            </div>

            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="submit-btn" onClick={submitItem} disabled={loading}>
                {loading ? "Posting..." : "📢 Post Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Item Detail Modal ── */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedItem.title}</h2>

            {selectedItem.imageUrl && (
              <img
                src={`${API}${selectedItem.imageUrl}`}
                alt={selectedItem.title}
                className="detail-image"
              />
            )}

            <div className="detail-badges">
              <span className={`badge ${selectedItem.type}`}>
                {selectedItem.type === "lost" ? "🔴 Lost" : "🟢 Found"}
              </span>
              <span className="badge category">{selectedItem.category}</span>
              {selectedItem.status === "resolved" && <span className="badge resolved">✅ Resolved</span>}
            </div>

            <div className="detail-info">
              <p>📍 <strong>Location:</strong> {selectedItem.location}</p>
              <p>📅 <strong>Date:</strong> {selectedItem.date}</p>
              <p>📞 <strong>Contact:</strong> {selectedItem.contact}</p>
              {selectedItem.description && <p>📝 <strong>Description:</strong> {selectedItem.description}</p>}
            </div>

            <div className="detail-actions">
              {selectedItem.status === "active" && (
                <button className="resolve-btn" onClick={() => resolveItem(selectedItem.id)}>
                  ✅ Mark as Resolved
                </button>
              )}
              <button className="delete-btn" onClick={() => deleteItem(selectedItem.id)}>
                🗑️ Delete
              </button>
              <button className="close-btn" onClick={() => setSelectedItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;