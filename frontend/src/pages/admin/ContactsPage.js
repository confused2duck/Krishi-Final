import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../lib/api';
import {
  Mail, Phone, User, Search, CheckCircle, Clock, Trash2, Eye,
  ArrowLeft, MessageSquare, ChevronDown, ChevronUp, InboxIcon,
} from 'lucide-react';

const API = API_BASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Atoms ────────────────────────────────────────────────────────────────────

const Avatar = ({ name, size = 'md' }) => {
  const { bg, text } = avatarColor(name);
  const sizeClass =
    size === 'lg' ? 'w-14 h-14 text-lg' :
    size === 'sm' ? 'w-8 h-8 text-xs' :
    'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} ${bg} ${text} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent = false }) => (
  <div className={`rounded-xl border p-5 flex items-start gap-4 ${accent ? 'bg-[#2D5016] border-[#2D5016]' : 'bg-white border-gray-100'}`}>
    <div className={`p-2.5 rounded-lg ${accent ? 'bg-white/15' : 'bg-[#2D5016]/8'}`}>
      <Icon size={18} className={accent ? 'text-white' : 'text-[#2D5016]'} />
    </div>
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-2xl font-bold leading-none ${accent ? 'text-white' : 'text-gray-800'}`}>{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const isNew = status === 'new' || status == null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${
        isNew
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNew ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {isNew ? 'New' : 'Replied'}
    </span>
  );
};

// ─── Skeletons ────────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-48 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
    </div>
  </div>
);

// ─── Contact Detail Panel ─────────────────────────────────────────────────────

const ContactDetail = ({ contact, onBack, onMarkReplied, onDelete, markingId }) => {
  const isNew = contact.status === 'new' || contact.status == null;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Enquiries
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={contact.name} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">{contact.name || '—'}</h2>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2D5016] transition-colors"
                  >
                    <Mail size={13} className="text-gray-400 flex-shrink-0" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Phone size={13} className="text-gray-400 flex-shrink-0" />
                    {contact.phone}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <StatusBadge status={contact.status} />
                <span className="text-xs text-gray-400">
                  {fmtDateTime(contact.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {contact.email && (
              <a
                href={`mailto:${contact.email}?subject=Re: Your enquiry&body=Hi ${contact.name || ''},%0D%0A%0D%0A`}
                className="flex items-center gap-2 bg-[#C8602B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b3501f] transition-colors"
              >
                <Mail size={14} />
                Reply via Email
              </a>
            )}
            {isNew && (
              <button
                onClick={() => onMarkReplied(contact.id || contact._id)}
                disabled={markingId === (contact.id || contact._id)}
                className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={14} />
                {markingId === (contact.id || contact._id) ? 'Saving…' : 'Mark as Replied'}
              </button>
            )}
            <button
              onClick={() => onDelete(contact.id || contact._id)}
              className="flex items-center gap-2 border border-red-200 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
          <MessageSquare size={15} className="text-[#2D5016]" />
          <h3 className="text-sm font-semibold text-gray-700">Message</h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {contact.message || <span className="text-gray-400 italic">No message content.</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Contact Card (list item, accordion) ─────────────────────────────────────

const ContactCard = ({ contact, expanded, onToggle, onMarkReplied, onDelete, onView, markingId }) => {
  const id = contact.id || contact._id;
  const isNew = contact.status === 'new' || contact.status == null;
  const isMarking = markingId === id;

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        expanded ? 'border-[#2D5016]/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      {/* Card header row — click to expand */}
      <button
        className="w-full text-left px-4 py-4"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          {/* Status dot + avatar */}
          <div className="relative flex-shrink-0 mt-0.5">
            <Avatar name={contact.name} size="sm" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                isNew ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              title={isNew ? 'New' : 'Replied'}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              {/* Name + email */}
              <div className="min-w-0">
                <span className={`text-sm font-semibold ${isNew ? 'text-gray-800' : 'text-gray-600'}`}>
                  {contact.name || '—'}
                </span>
                {contact.email && (
                  <span className="ml-2 text-xs text-gray-400">{contact.email}</span>
                )}
                {contact.phone && (
                  <span className="ml-2 text-xs text-gray-400 hidden sm:inline">· {contact.phone}</span>
                )}
              </div>

              {/* Date + status badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={contact.status} />
                <span className="text-xs text-gray-400">{fmtDate(contact.created_at)}</span>
                <span className="text-gray-300">
                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </span>
              </div>
            </div>

            {/* Message preview (collapsed) */}
            {!expanded && (
              <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {contact.message || <span className="italic">No message.</span>}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="ml-11 space-y-4">
            {/* Contact details row */}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2D5016] transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Mail size={13} className="text-gray-400 flex-shrink-0" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={13} className="text-gray-400 flex-shrink-0" />
                  {contact.phone}
                </span>
              )}
            </div>

            {/* Full message */}
            <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {contact.message || <span className="text-gray-400 italic">No message content.</span>}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onView(id); }}
                className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
              >
                <Eye size={13} />
                Full View
              </button>

              {contact.email && (
                <a
                  href={`mailto:${contact.email}?subject=Re: Your enquiry&body=Hi ${contact.name || ''},%0D%0A%0D%0A`}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs border border-[#C8602B]/30 text-[#C8602B] px-3 py-1.5 rounded-lg hover:bg-[#C8602B]/5 transition-colors font-medium"
                >
                  <Mail size={13} />
                  Reply via Email
                </a>
              )}

              {isNew && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkReplied(id); }}
                  disabled={isMarking}
                  className="flex items-center gap-1.5 text-xs border border-[#2D5016]/30 text-[#2D5016] px-3 py-1.5 rounded-lg hover:bg-[#2D5016]/5 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle size={13} />
                  {isMarking ? 'Saving…' : 'Mark as Replied'}
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                className="flex items-center gap-1.5 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors font-medium ml-auto"
              >
                <Trash2 size={13} />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ContactsPage = () => {
  const [contacts, setContacts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all'); // 'all' | 'new' | 'replied'
  const [expandedId, setExpandedId] = useState(null);
  const [markingId, setMarkingId]   = useState(null);
  const [view, setView]             = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/contacts`);
      setContacts(res.data);
    } catch {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleMarkReplied = useCallback(async (id) => {
    setMarkingId(id);
    try {
      await axios.put(`${API}/api/admin/contacts/${id}`, { status: 'replied' });
      setContacts(prev =>
        prev.map(c => (c.id === id || c._id === id) ? { ...c, status: 'replied' } : c)
      );
      toast.success('Marked as replied');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setMarkingId(null);
    }
  }, []);

  const handleDelete = useCallback((id) => {
    const confirmed = window.confirm('Remove this enquiry from the list? This cannot be undone.');
    if (!confirmed) return;
    setContacts(prev => prev.filter(c => c.id !== id && c._id !== id));
    // Navigate back to list if currently viewing the deleted contact
    if (view === 'detail' && selectedId === id) {
      setView('list');
      setSelectedId(null);
    }
    if (expandedId === id) setExpandedId(null);
    toast.success('Enquiry removed');
  }, [view, selectedId, expandedId]);

  const handleToggleExpand = useCallback((id) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleView = useCallback((id) => {
    setSelectedId(id);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setSelectedId(null);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:   contacts.length,
    newCount: contacts.filter(c => c.status === 'new' || c.status == null).length,
    replied: contacts.filter(c => c.status === 'replied').length,
  }), [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;

    // Status filter
    if (filter === 'new') {
      list = list.filter(c => c.status === 'new' || c.status == null);
    } else if (filter === 'replied') {
      list = list.filter(c => c.status === 'replied');
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name    || '').toLowerCase().includes(q) ||
        (c.email   || '').toLowerCase().includes(q) ||
        (c.message || '').toLowerCase().includes(q)
      );
    }

    // Newest first
    return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [contacts, filter, search]);

  // ── Detail view ──────────────────────────────────────────────────────────────

  if (view === 'detail') {
    const contact = contacts.find(c => (c.id || c._id) === selectedId);
    if (!contact) {
      return (
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Enquiries
          </button>
          <div className="text-center py-20 text-gray-400">
            <InboxIcon size={44} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Enquiry not found.</p>
          </div>
        </div>
      );
    }
    return (
      <ContactDetail
        contact={contact}
        onBack={handleBack}
        onMarkReplied={handleMarkReplied}
        onDelete={handleDelete}
        markingId={markingId}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────

  const FILTER_OPTIONS = [
    { value: 'all',     label: 'All',     count: stats.total    },
    { value: 'new',     label: 'New',     count: stats.newCount },
    { value: 'replied', label: 'Replied', count: stats.replied  },
  ];

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Enquiries</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${stats.total} total enquir${stats.total !== 1 ? 'ies' : 'y'}`}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Enquiries"
          value={loading ? '—' : stats.total}
          accent
        />
        <StatCard
          icon={Clock}
          label="New / Unread"
          value={loading ? '—' : stats.newCount}
        />
        <StatCard
          icon={CheckCircle}
          label="Replied"
          value={loading ? '—' : stats.replied}
        />
      </div>

      {/* Filters + search bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Filter pills */}
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === opt.value
                  ? 'bg-[#2D5016] text-white border-[#2D5016] shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === opt.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opt.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or message…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>
      </div>

      {/* Contact list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <InboxIcon size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">
            {search || filter !== 'all' ? 'No enquiries match your filters' : 'No enquiries yet'}
          </p>
          {(search || filter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="mt-3 text-sm text-[#2D5016] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(contact => {
            const id = contact.id || contact._id;
            return (
              <ContactCard
                key={id}
                contact={contact}
                expanded={expandedId === id}
                onToggle={handleToggleExpand}
                onMarkReplied={handleMarkReplied}
                onDelete={handleDelete}
                onView={handleView}
                markingId={markingId}
              />
            );
          })}

          {/* Footer count */}
          <div className="px-1 pt-1 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {contacts.length} enquir{contacts.length !== 1 ? 'ies' : 'y'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all'); }}
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

export default ContactsPage;
