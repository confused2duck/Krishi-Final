import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { FileText, Save, ArrowLeft, Plus } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

const API = API_BASE_URL;

const EMPTY_FORM = {
  id: null,
  name: '',
  route: '',
  status: 'draft',
  content_html: '',
  sectionsText: '{}',
  seo_title: '',
  seo_description: '',
  og_title: '',
  og_description: '',
  og_image: '',
};

const parseSections = (value) => {
  if (!value.trim()) return {};
  return JSON.parse(value);
};

const PageEditor = ({ page, onCancel, onSaved }) => {
  const [form, setForm] = useState({
    id: page?.id || null,
    name: page?.name || '',
    route: page?.route || '',
    status: page?.status || 'draft',
    content_html: page?.content_html || '',
    sectionsText: JSON.stringify(page?.sections || {}, null, 2),
    seo_title: page?.seo_title || '',
    seo_description: page?.seo_description || '',
    og_title: page?.og_title || '',
    og_description: page?.og_description || '',
    og_image: page?.og_image || '',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Page name is required');
    if (!form.route.trim()) return toast.error('Route is required');

    let sections;
    try {
      sections = parseSections(form.sectionsText);
    } catch {
      toast.error('Sections JSON is invalid');
      return;
    }

    const payload = {
      name: form.name.trim(),
      route: form.route.trim(),
      status: form.status,
      content_html: form.content_html,
      sections,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      og_title: form.og_title || null,
      og_description: form.og_description || null,
      og_image: form.og_image || null,
    };

    setSaving(true);
    try {
      if (form.id) {
        await axios.put(`${API}/api/admin/pages/${form.id}`, payload);
        toast.success('CMS page updated');
      } else {
        await axios.post(`${API}/api/admin/pages`, payload);
        toast.success('CMS page created');
      }
      onSaved();
    } catch (error) {
      const message = error?.response?.data?.detail || 'Failed to save CMS page';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{form.id ? `Edit: ${form.name}` : 'New CMS Page'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Use `sections` JSON for frontend text, links, and media keys.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-5">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Page Name</span>
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
              placeholder="Home"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Route</span>
            <input
              value={form.route}
              onChange={(e) => setField('route', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
              placeholder="/"
            />
          </label>
        </div>

        <label className="space-y-1.5 block">
          <span className="block text-sm font-medium text-gray-700">Status</span>
          <select
            value={form.status}
            onChange={(e) => setField('status', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>

        <label className="space-y-1.5 block">
          <span className="block text-sm font-medium text-gray-700">Sections JSON</span>
          <textarea
            value={form.sectionsText}
            onChange={(e) => setField('sectionsText', e.target.value)}
            rows={16}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
            placeholder={'{\n  "hero_title": "Bringing Back Traditional Goodness"\n}'}
          />
        </label>

        <label className="space-y-1.5 block">
          <span className="block text-sm font-medium text-gray-700">Content HTML</span>
          <textarea
            value={form.content_html}
            onChange={(e) => setField('content_html', e.target.value)}
            rows={6}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
            placeholder="<p>Optional rich content block</p>"
          />
        </label>

        <div className="grid md:grid-cols-2 gap-5">
          <input value={form.seo_title} onChange={(e) => setField('seo_title', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]" placeholder="SEO Title" />
          <input value={form.og_title} onChange={(e) => setField('og_title', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]" placeholder="OG Title" />
          <textarea value={form.seo_description} onChange={(e) => setField('seo_description', e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]" placeholder="SEO Description" />
          <textarea value={form.og_description} onChange={(e) => setField('og_description', e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]" placeholder="OG Description" />
        </div>

        <label className="space-y-1.5 block">
          <span className="block text-sm font-medium text-gray-700">OG Image URL</span>
          <input
            value={form.og_image}
            onChange={(e) => setField('og_image', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
            placeholder="/api/images/..."
          />
        </label>

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#2D5016] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save CMS Page'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const PagesPage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingPage, setEditingPage] = useState(null);
  const [view, setView] = useState('list');

  const fetchPages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/admin/pages`);
      setPages(response.data);
    } catch {
      toast.error('Failed to load CMS pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) =>
      page.name?.toLowerCase().includes(query) || page.route?.toLowerCase().includes(query)
    );
  }, [pages, search]);

  if (view === 'form') {
    return (
      <PageEditor
        page={editingPage}
        onCancel={() => {
          setView('list');
          setEditingPage(null);
        }}
        onSaved={() => {
          setView('list');
          setEditingPage(null);
          fetchPages();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">CMS Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage published page content and section data used by the storefront.</p>
        </div>
        <button
          onClick={() => {
            setEditingPage(null);
            setView('form');
          }}
          className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors"
        >
          <Plus size={16} />
          New Page
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by route or name..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-400">Loading CMS pages...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No CMS pages found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{page.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">{page.route}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {page.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{page.updated_at ? new Date(page.updated_at).toLocaleString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingPage(page);
                          setView('form');
                        }}
                        className="text-sm font-medium text-[#2D5016] hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagesPage;
