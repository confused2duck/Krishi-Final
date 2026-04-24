import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown, Image as ImageIcon,
  Package, Save, ArrowLeft, Upload
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

const API = API_BASE_URL;
const HIDDEN_COLLECTION_SLUGS = new Set(['unpolished-pulses', 'shikakai', 'wheat', 'frontpage']);

const COLLECTIONS = [
  { value: 'cold-pressed-oils', label: 'Cold Pressed Oils' },
  { value: 'ghee-honey', label: 'Ghee & Honey' },
  { value: 'traditional-rices', label: 'Traditional Rices' },
  { value: 'unpolished-millets', label: 'Unpolished Millets' },
  { value: 'jaggery-rocksalt', label: 'Jaggery & Rock Salt' },
  { value: 'spices', label: 'Spices & Pulses' },
  { value: 'chikkis', label: 'Chikkis' },
  { value: 'others', label: 'Others' },
].filter((collection) => !HIDDEN_COLLECTION_SLUGS.has(collection.value));

  
const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const EMPTY_FORM = {
  name: '',
  slug: '',
  description: '',
  collection: '',
  price: '',
  compare_price: '',
  stock: '',
  tags: '',
  images: [],
  benefits: [],
  uses: [],
  nutritional_facts: '',
  storage: '',
  sizes: [],
};

const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
    {children}
  </div>
);

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] ${className}`}
    {...props}
  />
);

const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] resize-y ${className}`}
    {...props}
  />
);

const SkeletonRow = () => (
  <tr>
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-4 py-4">
        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? 48 : '80%' }} />
      </td>
    ))}
  </tr>
);

const DynamicList = ({ label, hint, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };

  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-gray-700">{item}</span>
            <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder || 'Add item...'}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
          <button
            type="button"
            onClick={add}
            className="flex-shrink-0 px-3 py-2 bg-[#2D5016]/10 text-[#2D5016] rounded-lg hover:bg-[#2D5016]/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </Field>
  );
};

const SizesEditor = ({ sizes, onChange }) => {
  const [draftName, setDraftName] = useState('');
  const [draftMod, setDraftMod] = useState('');

  const add = () => {
    const name = draftName.trim();
    if (!name) return;
    onChange([...sizes, { name, price_modifier: parseFloat(draftMod) || 0 }]);
    setDraftName('');
    setDraftMod('');
  };

  const remove = (idx) => onChange(sizes.filter((_, i) => i !== idx));

  return (
    <Field label="Sizes / Variants" hint="e.g. 500ml with +Rs50 price modifier">
      <div className="space-y-2">
        {sizes.map((s, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-gray-700 font-medium">{s.name}</span>
            <span className="text-sm text-gray-500">
              {s.price_modifier >= 0 ? '+' : ''}Rs{s.price_modifier}
            </span>
            <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            placeholder="Size name (e.g. 500ml)"
            className="flex-1"
          />
          <Input
            value={draftMod}
            onChange={e => setDraftMod(e.target.value)}
            placeholder="Price mod (e.g. 50)"
            className="w-36"
            type="number"
          />
          <button
            type="button"
            onClick={add}
            className="flex-shrink-0 px-3 py-2 bg-[#2D5016]/10 text-[#2D5016] rounded-lg hover:bg-[#2D5016]/20 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </Field>
  );
};

const ImagesEditor = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));

  const processFiles = async (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    setUploading(true);
    const results = await Promise.all(
      imageFiles.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      }))
    );
    onChange([...images, ...results]);
    setUploading(false);
  };

  const handleFileInput = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  return (
    <Field label="Images" hint="First image is used as thumbnail; images stored with product">
      <div className="space-y-3">
        {/* Thumbnails */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((url, idx) => (
              <div key={idx} className="relative group">
                <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <img src={url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                </div>
                {idx === 0 && (
                  <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] bg-black/50 text-white py-0.5 rounded-b-lg">Cover</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#2D5016] bg-[#2D5016]/5' : 'border-gray-200 hover:border-[#2D5016]/50 hover:bg-gray-50'}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <div className="w-6 h-6 border-2 border-[#2D5016] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload size={24} />
              <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
              <p className="text-xs">PNG, JPG, WEBP - multiple files supported</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </Field>
  );
};

const ProductForm = ({ product, onSaved, onCancel }) => {
  const isEdit = !!product;
  const [form, setForm] = useState(() => {
    if (!product) return EMPTY_FORM;
    return {
      ...EMPTY_FORM,
      ...product,
      price: product.price ?? '',
      compare_price: product.compare_price ?? '',
      stock: product.stock ?? '',
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
      images: product.images || [],
      benefits: product.benefits || [],
      uses: product.uses || [],
      storage: product.storage ?? product.storage_info ?? '',
      sizes: product.sizes || [],
    };
  });
  const [saving, setSaving] = useState(false);
  const [slugLocked, setSlugLocked] = useState(isEdit);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(f => ({
      ...f,
      name,
      slug: slugLocked ? f.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Product name is required');
    if (!form.slug.trim()) return toast.error('Slug is required');
    if (!form.collection) return toast.error('Collection is required');
    if (!form.price) return toast.error('Price is required');

    setSaving(true);
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      compare_price: parseFloat(form.compare_price) || null,
      stock: parseInt(form.stock, 10) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    try {
      if (isEdit) {
        await axios.put(`${API}/api/admin/products/${product.slug}`, payload);
        toast.success('Product updated');
      } else {
        await axios.post(`${API}/api/admin/products`, payload);
        toast.success('Product created');
      }
      onSaved();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Failed to save product';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      {/* Form header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{isEdit ? `Edit: ${product.name}` : 'New Product'}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `Editing /${product.slug}` : 'Fill in the details below'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Core Info */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Core Details</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Product Name *">
              <Input
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. Cold Pressed Coconut Oil"
                required
              />
            </Field>
            <Field label="Slug *" hint="URL-friendly identifier">
              <div className="flex gap-2 items-center">
                <Input
                  value={form.slug}
                  onChange={e => set('slug', slugify(e.target.value))}
                  placeholder="cold-pressed-coconut-oil"
                  required
                />
                <button
                  type="button"
                  onClick={() => { setSlugLocked(!slugLocked); if (slugLocked) set('slug', slugify(form.name)); }}
                  className={`flex-shrink-0 text-xs px-2.5 py-2 rounded-lg border transition-colors ${slugLocked ? 'border-[#2D5016]/30 bg-[#2D5016]/5 text-[#2D5016]' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  title={slugLocked ? 'Unlock slug' : 'Lock slug'}
                >
                  {slugLocked ? 'Locked' : 'Auto'}
                </button>
              </div>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="Product description…"
            />
          </Field>

          <Field label="Collection *">
            <div className="relative">
              <select
                value={form.collection}
                onChange={e => set('collection', e.target.value)}
                className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white pr-8"
                required
              >
                <option value="">Select collection…</option>
                {COLLECTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        </section>

        {/* Pricing & Stock */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pricing & Stock</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <Field label="Price (₹) *">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  required
                />
              </div>
            </Field>
            <Field label="Compare Price (₹)" hint="Crossed-out price">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-500">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.compare_price}
                  onChange={e => set('compare_price', e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </Field>
            <Field label="Stock">
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
          <Field label="Tags" hint="Comma-separated: organic, cold-pressed, vegan">
            <Input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="organic, cold-pressed, vegan"
            />
          </Field>
        </section>

        {/* Images */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Images</h3>
          <ImagesEditor images={form.images} onChange={v => set('images', v)} />
        </section>

        {/* Product Details */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Product Details</h3>
          <DynamicList
            label="Benefits"
            hint="Key selling points shown on product page"
            items={form.benefits}
            onChange={v => set('benefits', v)}
            placeholder="e.g. Rich in antioxidants"
          />
          <DynamicList
            label="Uses"
            hint="How customers can use this product"
            items={form.uses}
            onChange={v => set('uses', v)}
            placeholder="e.g. Ideal for cooking at high heat"
          />
          <Field label="Nutritional Facts">
            <Textarea
              value={form.nutritional_facts}
              onChange={e => set('nutritional_facts', e.target.value)}
              rows={4}
              placeholder="Per 100ml: Calories 884kcal, Fat 100g…"
            />
          </Field>
          <Field label="Storage Info">
            <Textarea
              value={form.storage}
              onChange={e => set('storage', e.target.value)}
              rows={2}
              placeholder="Store in a cool, dry place away from direct sunlight."
            />
          </Field>
        </section>

        {/* Sizes */}
        <section className="space-y-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sizes & Variants</h3>
          <SizesEditor sizes={form.sizes} onChange={v => set('sizes', v)} />
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#2D5016] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
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

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [view, setView] = useState('list');
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/products`);
      setProducts(res.data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleDelete = async (slug, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/api/admin/products/${slug}`);
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.slug !== slug));
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setView('form');
  };

  const openNew = () => {
    setEditingProduct(null);
    setView('form');
  };

  const handleSaved = () => {
    setView('list');
    setEditingProduct(null);
    fetchProducts();
  };

  const handleCancel = () => {
    setView('list');
    setEditingProduct(null);
  };

  const filtered = products.filter(p => {
    const matchCol = collectionFilter === 'all' || p.collection === collectionFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q) || (Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '')).toLowerCase().includes(q);
    return matchCol && matchSearch;
  });

  const collectionLabel = (val) => COLLECTIONS.find(c => c.value === val)?.label || val || '—';

  if (view === 'form') {
    return (
      <div className="space-y-4">
        <ProductForm
          product={editingProduct}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} total
            {collectionFilter !== 'all' && ` · ${filtered.length} in ${collectionLabel(collectionFilter)}`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1A2F0D] transition-colors"
        >
          <Plus size={16} />
          New Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
          />
        </div>
        <div className="relative">
          <select
            value={collectionFilter}
            onChange={e => setCollectionFilter(e.target.value)}
            className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white text-gray-700"
          >
            <option value="all">All Collections</option>
            {COLLECTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Image', 'Name / Slug', 'Collection', 'Price', 'Stock', 'Tags', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <Package size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No products found</p>
          {search || collectionFilter !== 'all' ? (
            <button
              onClick={() => { setSearch(''); setCollectionFilter('all'); }}
              className="mt-3 text-sm text-[#2D5016] hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={openNew}
              className="mt-4 inline-flex items-center gap-2 text-[#2D5016] font-medium text-sm hover:underline"
            >
              <Plus size={14} /> Add your first product
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Image</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name / Slug</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Collection</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(product => {
                  const thumb = product.images?.[0];
                  const tags = Array.isArray(product.tags) ? product.tags : (product.tags ? product.tags.split(',').map(t => t.trim()) : []);
                  const hasStock = product.stock != null;
                  const stockColor = product.stock > 10 ? 'text-green-700 bg-green-50' : product.stock > 0 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

                  return (
                    <tr key={product.slug} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                          ) : (
                            <Package size={18} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(product)}
                          className="text-left group/name"
                        >
                          <p className="font-medium text-gray-800 text-sm group-hover/name:text-[#2D5016] transition-colors line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">/{product.slug}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs bg-[#2D5016]/8 text-[#2D5016] px-2 py-1 rounded-full font-medium">
                          {collectionLabel(product.collection)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">₹{product.price}</p>
                        {product.compare_price && (
                          <p className="text-xs text-gray-400 line-through">₹{product.compare_price}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {hasStock ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${stockColor}`}>
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-48">
                          {tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(product)}
                            title="Edit product"
                            className="p-1.5 rounded-lg hover:bg-[#2D5016]/10 text-gray-400 hover:text-[#2D5016] transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.slug, product.name)}
                            title="Delete product"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {products.length} products
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
