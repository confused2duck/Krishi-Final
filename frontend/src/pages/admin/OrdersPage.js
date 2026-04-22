import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Eye, ArrowLeft, ShoppingBag, Clock, CheckCircle, Truck,
  PackageCheck, XCircle, Search, User, MapPin, CreditCard,
  ChevronDown, RefreshCw,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
    dotClass: 'bg-amber-400',
    Icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    dotClass: 'bg-blue-500',
    Icon: CheckCircle,
  },
  shipped: {
    label: 'Shipped',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    dotClass: 'bg-purple-500',
    Icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    badgeClass: 'bg-green-50 text-green-700 border border-green-200',
    dotClass: 'bg-green-500',
    Icon: PackageCheck,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-gray-100 text-gray-500 border border-gray-200',
    dotClass: 'bg-gray-400',
    Icon: XCircle,
  },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '—');

// ─── Small reusable atoms ─────────────────────────────────────────────────────

const StatusBadge = ({ status, size = 'sm' }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${padding} ${cfg.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

const SkeletonRow = () => (
  <tr>
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div
          className="h-4 bg-gray-100 rounded animate-pulse"
          style={{ width: i === 0 ? 60 : i === 7 ? 32 : '75%' }}
        />
      </td>
    ))}
  </tr>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-100 ${className}`}>
    {children}
  </div>
);

const CardSection = ({ title, Icon, children }) => (
  <Card>
    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
      {Icon && <Icon size={15} className="text-[#2D5016]" />}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </Card>
);

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-1.5">
    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide sm:w-32 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-700">{value || '—'}</span>
  </div>
);

// ─── Stat pill ────────────────────────────────────────────────────────────────

const StatPill = ({ label, count, active, onClick, colorClass }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
      active
        ? 'bg-[#2D5016] text-white border-[#2D5016] shadow-sm'
        : `bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 ${colorClass || ''}`
    }`}
  >
    {label}
    <span
      className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {count}
    </span>
  </button>
);

// ─── Order Detail Panel ───────────────────────────────────────────────────────

const OrderDetail = ({ orderId, onBack, onStatusUpdated }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/orders/${orderId}`);
      setOrder(res.data);
      setNewStatus(res.data.status || 'pending');
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === order?.status) {
      toast.info('Status unchanged');
      return;
    }
    setUpdating(true);
    try {
      await axios.put(`${API}/api/admin/orders/${orderId}`, { status: newStatus });
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setOrder(prev => ({ ...prev, status: newStatus }));
      if (onStatusUpdated) onStatusUpdated(orderId, newStatus);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-gray-400">
        <ShoppingBag size={40} className="mx-auto mb-3 text-gray-200" />
        <p>Order not found.</p>
        <button onClick={onBack} className="mt-4 text-[#2D5016] text-sm hover:underline">Go back</button>
      </div>
    );
  }

  const customer = order.customer || {};
  const address = order.shipping_address || order.address || {};
  const items = order.items || order.order_items || [];
  const subtotal = order.subtotal ?? items.reduce((s, it) => s + (it.unit_price ?? it.price ?? 0) * (it.quantity ?? 1), 0);
  const discount = order.discount ?? 0;
  const shipping = order.shipping_cost ?? order.shipping ?? 0;
  const total = order.total ?? order.total_amount ?? (subtotal - discount + shipping);

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Order <span className="font-mono text-[#2D5016]">#{shortId(order._id || order.id)}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{fmtDateTime(order.created_at || order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} size="lg" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column: customer + shipping */}
        <div className="space-y-4">
          {/* Customer */}
          <CardSection title="Customer" Icon={User}>
            <div className="space-y-0.5">
              <InfoRow label="Name" value={customer.name || order.customer_name} />
              <InfoRow label="Email" value={customer.email || order.customer_email} />
              <InfoRow label="Phone" value={customer.phone || order.customer_phone || address.phone} />
            </div>
          </CardSection>

          {/* Shipping Address */}
          <CardSection title="Shipping Address" Icon={MapPin}>
            {Object.keys(address).length === 0 ? (
              <p className="text-sm text-gray-400">No address on record.</p>
            ) : (
              <div className="space-y-0.5">
                {address.name && <InfoRow label="Name" value={address.name} />}
                {address.line1 && <InfoRow label="Line 1" value={address.line1} />}
                {address.line2 && <InfoRow label="Line 2" value={address.line2} />}
                {address.city && <InfoRow label="City" value={address.city} />}
                {address.state && <InfoRow label="State" value={address.state} />}
                {address.pincode && <InfoRow label="Pincode" value={address.pincode} />}
                {address.country && <InfoRow label="Country" value={address.country} />}
              </div>
            )}
          </CardSection>

          {/* Payment */}
          <CardSection title="Payment" Icon={CreditCard}>
            <div className="space-y-0.5">
              <InfoRow label="Method" value={order.payment_method} />
              <InfoRow label="Status" value={order.payment_status} />
              {order.payment_id && <InfoRow label="Ref ID" value={order.payment_id} />}
            </div>
          </CardSection>
        </div>

        {/* Right column: items + summary + status update */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Items */}
          <Card>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
              <ShoppingBag size={15} className="text-[#2D5016]" />
              <h3 className="text-sm font-semibold text-gray-700">
                Order Items
                <span className="ml-2 text-xs font-normal text-gray-400">({items.length} item{items.length !== 1 ? 's' : ''})</span>
              </h3>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 p-5">No items found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Product', 'Size', 'Qty', 'Unit Price', 'Total'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => {
                      const unitPrice = item.unit_price ?? item.price ?? 0;
                      const qty = item.quantity ?? item.qty ?? 1;
                      const lineTotal = unitPrice * qty;
                      const img = item.image || item.product_image || item.product?.images?.[0];
                      const name = item.name || item.product_name || item.product?.name || 'Product';

                      return (
                        <tr key={item._id || item.id || idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  <ShoppingBag size={14} className="text-gray-300" />
                                )}
                              </div>
                              <span className="text-sm text-gray-800 font-medium line-clamp-2 max-w-[180px]">{name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {item.size || item.variant || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{qty}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">₹{fmt(unitPrice)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">₹{fmt(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{fmt(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount</span>
                    <span>− ₹{fmt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping > 0 ? `₹${fmt(shipping)}` : <span className="text-green-600 font-medium">Free</span>}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>₹{fmt(total)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Status Update */}
          <Card>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
              <RefreshCw size={15} className="text-[#2D5016]" />
              <h3 className="text-sm font-semibold text-gray-700">Update Status</h3>
            </div>
            <div className="p-5 flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5 flex-1 min-w-40">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New Status</label>
                <div className="relative">
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white text-gray-700"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === order.status}
                className="flex items-center gap-2 bg-[#2D5016] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Updating…
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Update Status
                  </>
                )}
              </button>
              {newStatus === order.status && (
                <p className="text-xs text-gray-400 self-center">Current status</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Orders List ──────────────────────────────────────────────────────────────

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchOrders = useCallback(async (status) => {
    setLoading(true);
    try {
      const params = {};
      if (status && status !== 'all') params.status = status;
      const res = await axios.get(`${API}/api/admin/orders`, { params });
      setOrders(res.data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(statusFilter);
  }, [fetchOrders, statusFilter]);

  const handleViewOrder = (id) => {
    setSelectedOrderId(id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedOrderId(null);
  };

  const handleStatusUpdated = (orderId, newStatus) => {
    setOrders(prev =>
      prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status: newStatus } : o)
    );
  };

  // Client-side search filter (order ID or customer name)
  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const id = String(o._id || o.id || '').toLowerCase();
    const name = (o.customer?.name || o.customer_name || '').toLowerCase();
    const email = (o.customer?.email || o.customer_email || '').toLowerCase();
    return id.includes(q) || name.includes(q) || email.includes(q);
  });

  // Stats
  const stats = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});
  stats.all = orders.length;

  if (view === 'detail') {
    return (
      <OrderDetail
        orderId={selectedOrderId}
        onBack={handleBack}
        onStatusUpdated={handleStatusUpdated}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {orders.length} total order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill
            label="All"
            count={stats.all}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          {ALL_STATUSES.map(s => (
            <StatPill
              key={s}
              label={STATUS_CONFIG[s].label}
              count={stats[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID or customer name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>
        {/* Status filter pill buttons */}
        <div className="flex flex-wrap gap-1.5">
          {['all', ...ALL_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                statusFilter === s
                  ? 'bg-[#2D5016] text-white border-[#2D5016]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No orders found</p>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="mt-3 text-sm text-[#2D5016] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Payment</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => {
                  const id = order._id || order.id;
                  const customerName = order.customer?.name || order.customer_name || '—';
                  const customerEmail = order.customer?.email || order.customer_email || '';
                  const itemCount = (order.items || order.order_items || []).length;
                  const total = order.total ?? order.total_amount ?? 0;
                  const paymentMethod = order.payment_method || '—';
                  const date = order.created_at || order.createdAt;

                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Order ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-[#2D5016] bg-[#2D5016]/5 px-2 py-0.5 rounded">
                          #{shortId(id)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{customerName}</p>
                        {customerEmail && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{customerEmail}</p>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-800">₹{fmt(total)}</span>
                      </td>

                      {/* Payment Method */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium capitalize">
                          {paymentMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">{fmtDate(date)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleViewOrder(id)}
                          title="View order details"
                          className="p-1.5 rounded-lg hover:bg-[#2D5016]/10 text-gray-400 hover:text-[#2D5016] transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {orders.length} orders
            </p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-xs text-[#2D5016] hover:underline"
              >
                Show all statuses
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
