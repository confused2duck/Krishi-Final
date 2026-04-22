import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Eye, ArrowLeft, Search, Users, ShoppingBag, TrendingUp,
  Mail, Phone, CalendarDays, ChevronDown, Clock, CheckCircle,
  Truck, PackageCheck, XCircle, UserCircle2,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n ?? 0);

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Deterministic avatar color based on name
const AVATAR_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { bg: 'bg-rose-100',    text: 'text-rose-700'    },
  { bg: 'bg-cyan-100',    text: 'text-cyan-700'    },
  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  { bg: 'bg-teal-100',    text: 'text-teal-700'    },
];

const avatarColor = (name = '') => {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
};

// ─── Order status config ──────────────────────────────────────────────────────

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

// ─── Reusable atoms ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    badgeClass: 'bg-gray-100 text-gray-500 border border-gray-200',
    dotClass: 'bg-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

const Avatar = ({ name, size = 'md' }) => {
  const { bg, text } = avatarColor(name);
  const sizeClass = size === 'lg'
    ? 'w-16 h-16 text-xl'
    : size === 'sm'
    ? 'w-8 h-8 text-xs'
    : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} ${bg} ${text} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, accent = false }) => (
  <div className={`rounded-xl border p-5 flex items-start gap-4 ${accent ? 'bg-[#2D5016] border-[#2D5016]' : 'bg-white border-gray-100'}`}>
    <div className={`p-2.5 rounded-lg ${accent ? 'bg-white/15' : 'bg-[#2D5016]/8'}`}>
      <Icon size={18} className={accent ? 'text-white' : 'text-[#2D5016]'} />
    </div>
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-xl font-bold leading-none ${accent ? 'text-white' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  </div>
);

// ─── List skeletons ───────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <tr>
    <td className="px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </td>
    {[80, 90, 48, 64, 72, 60, 28].map((w, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
      </td>
    ))}
  </tr>
);

// ─── Customer Detail ──────────────────────────────────────────────────────────

const CustomerDetail = ({ customerId, onBack }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/customers/${customerId}`);
      setCustomer(res.data);
    } catch {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  if (loading) {
    return (
      <div className="space-y-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </button>
        {/* Profile skeleton */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-64 bg-gray-100 rounded animate-pulse" />
            <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {[...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[60, 80, 100, 70, 64].map((w, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20 text-gray-400">
        <UserCircle2 size={44} className="mx-auto mb-3 text-gray-200" />
        <p className="font-medium">Customer not found.</p>
        <button onClick={onBack} className="mt-4 text-sm text-[#2D5016] hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const orders = customer.orders || [];
  const totalSpent = customer.total_spent ?? orders.reduce((s, o) => s + (o.total ?? o.total_amount ?? 0), 0);
  const avgOrder = orders.length > 0 ? totalSpent / orders.length : 0;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={customer.name} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-800">{customer.name || '—'}</h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
              {customer.email && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Mail size={13} className="text-gray-400 flex-shrink-0" />
                  {customer.email}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400 flex-shrink-0" />
                  {customer.phone}
                </span>
              )}
              {customer.created_at && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <CalendarDays size={13} className="text-gray-400 flex-shrink-0" />
                  Member since {fmtDate(customer.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={customer.order_count ?? orders.length}
          accent
        />
        <StatCard
          icon={TrendingUp}
          label="Total Spent"
          value={`₹${fmt(totalSpent)}`}
          sub="Lifetime value"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={`₹${fmt(avgOrder)}`}
          sub={orders.length > 0 ? `Across ${orders.length} order${orders.length !== 1 ? 's' : ''}` : 'No orders yet'}
        />
      </div>

      {/* Orders history */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <ShoppingBag size={15} className="text-[#2D5016]" />
          <h3 className="text-sm font-semibold text-gray-700">
            Order History
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({orders.length} order{orders.length !== 1 ? 's' : ''})
            </span>
          </h3>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-14">
            <ShoppingBag size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order ID', 'Date', 'Items', 'Status', 'Total'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order, idx) => {
                  const oid = order._id || order.id || idx;
                  const shortOid = String(oid).slice(0, 8).toUpperCase();
                  const items = order.items || order.order_items || [];
                  const itemCount = order.item_count ?? items.length;
                  const total = order.total ?? order.total_amount ?? 0;
                  const date = order.created_at || order.createdAt;

                  return (
                    <tr key={oid} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-semibold text-[#2D5016] bg-[#2D5016]/5 px-2 py-0.5 rounded">
                          #{shortOid}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{fmtDateTime(date)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-800">
                        ₹{fmt(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Customers List ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'recent',   label: 'Most Recent'    },
  { value: 'orders',   label: 'Most Orders'    },
  { value: 'spend',    label: 'Highest Spend'  },
];

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState('recent');
  const [view, setView]           = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/customers`);
      setCustomers(res.data);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleView = (id) => {
    setSelectedId(id);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedId(null);
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = customers.length;
    const withOrders = customers.filter(c => (c.order_count ?? 0) > 0).length;
    const totalSpent = customers.reduce((s, c) => s + (c.total_spent ?? 0), 0);
    const totalOrders = customers.reduce((s, c) => s + (c.order_count ?? 0), 0);
    const avg = totalOrders > 0 ? totalSpent / totalOrders : 0;
    return { total, withOrders, avg };
  }, [customers]);

  // Search filter
  const filtered = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name  || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }
    // Sort
    const sorted = [...list];
    if (sort === 'recent') {
      sorted.sort((a, b) => {
        const da = new Date(a.last_order_date || a.created_at || 0);
        const db = new Date(b.last_order_date || b.created_at || 0);
        return db - da;
      });
    } else if (sort === 'orders') {
      sorted.sort((a, b) => (b.order_count ?? 0) - (a.order_count ?? 0));
    } else if (sort === 'spend') {
      sorted.sort((a, b) => (b.total_spent ?? 0) - (a.total_spent ?? 0));
    }
    return sorted;
  }, [customers, search, sort]);

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail') {
    return <CustomerDetail customerId={selectedId} onBack={handleBack} />;
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${customers.length} total customer${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={loading ? '—' : customers.length}
          sub="All registered"
          accent
        />
        <StatCard
          icon={ShoppingBag}
          label="Customers with Orders"
          value={loading ? '—' : stats.withOrders}
          sub={loading ? '' : `${customers.length > 0 ? Math.round((stats.withOrders / customers.length) * 100) : 0}% conversion`}
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Order Value"
          value={loading ? '—' : `₹${fmt(stats.avg)}`}
          sub="Per order across all customers"
        />
      </div>

      {/* Search + Sort bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="appearance-none border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white text-gray-700"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Customer', 'Email', 'Phone', 'Orders', 'Total Spent', 'Member Since', 'Last Order', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...Array(7)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Users size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No customers found</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-sm text-[#2D5016] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Spent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Member Since</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Last Order</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(customer => {
                  const id = customer._id || customer.id;
                  const orderCount = customer.order_count ?? 0;

                  return (
                    <tr key={id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Customer cell */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">
                              {customer.name || '—'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px] md:hidden">
                              {customer.email || ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-gray-600 truncate max-w-[180px] block">
                          {customer.email || '—'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-gray-600">{customer.phone || '—'}</span>
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3.5">
                        {orderCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#2D5016]/8 text-[#2D5016]">
                            <ShoppingBag size={11} />
                            {orderCount}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${(customer.total_spent ?? 0) > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                          {(customer.total_spent ?? 0) > 0 ? `₹${fmt(customer.total_spent)}` : '—'}
                        </span>
                      </td>

                      {/* Member Since */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-gray-500">{fmtDate(customer.created_at)}</span>
                      </td>

                      {/* Last Order */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-gray-500">{fmtDate(customer.last_order_date)}</span>
                      </td>

                      {/* View button */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleView(id)}
                          title="View customer"
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

          {/* Table footer */}
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </p>
            {(search || sort !== 'recent') && (
              <button
                onClick={() => { setSearch(''); setSort('recent'); }}
                className="text-xs text-[#2D5016] hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
