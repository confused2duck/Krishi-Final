import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Save, Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, XCircle, Info, ArrowLeft, Globe,
  MessageSquare, Cpu, Search
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORIES = ['Education', 'Tips', 'Health', 'Recipes', 'News', 'Guides'];
const SCHEMA_TYPES = ['BlogPosting', 'Article', 'FAQPage', 'HowTo', 'NewsArticle'];

// ── SEO Score Calculator ──────────────────────────────────────────────────────
const calcSeoScore = (form) => {
  const wordCount = form.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
  const kw = (form.focus_keyword || '').toLowerCase();
  const titleHasKw = kw && (form.seo_title || form.title || '').toLowerCase().includes(kw);
  const descHasKw = kw && (form.seo_description || form.excerpt || '').toLowerCase().includes(kw);
  const contentHasKw = kw && form.content.toLowerCase().includes(kw);

  const checks = [
    { id: 'title_len', label: 'SEO title 50–60 characters', pass: !!(form.seo_title && form.seo_title.length >= 50 && form.seo_title.length <= 60), warn: !!(form.seo_title && form.seo_title.length > 0) },
    { id: 'desc_len', label: 'Meta description 150–160 characters', pass: !!(form.seo_description && form.seo_description.length >= 150 && form.seo_description.length <= 160), warn: !!(form.seo_description && form.seo_description.length > 0) },
    { id: 'kw_set', label: 'Focus keyword defined', pass: !!kw },
    { id: 'kw_title', label: 'Focus keyword in SEO title', pass: titleHasKw },
    { id: 'kw_desc', label: 'Focus keyword in meta description', pass: descHasKw },
    { id: 'kw_content', label: 'Focus keyword in body content', pass: contentHasKw },
    { id: 'word_count', label: 'Content ≥ 600 words', pass: wordCount >= 600, warn: wordCount >= 300 },
    { id: 'image', label: 'Featured image set', pass: !!(form.og_image || form.image) },
    { id: 'og', label: 'OG title and description set', pass: !!(form.og_title && form.og_description) },
    { id: 'faqs', label: 'FAQs added (AEO)', pass: form.faqs.length >= 3, warn: form.faqs.length >= 1 },
    { id: 'geo', label: 'AI summary written (GEO)', pass: !!(form.geo_summary && form.geo_summary.length >= 80) },
    { id: 'entities', label: 'Named entities listed (GEO)', pass: form.entities.length >= 2 },
  ];
  const passed = checks.filter(c => c.pass).length;
  return { checks, score: Math.round((passed / checks.length) * 100), wordCount };
};

// ── Reusable field components ─────────────────────────────────────────────────
const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
    {children}
  </div>
);

const Input = ({ className = '', ...props }) => (
  <input className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] ${className}`} {...props} />
);

const Textarea = ({ className = '', ...props }) => (
  <textarea className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] resize-y ${className}`} {...props} />
);

const CharCount = ({ value, min, max }) => {
  const len = (value || '').length;
  const color = len >= min && len <= max ? 'text-green-600' : len > 0 ? 'text-amber-600' : 'text-gray-400';
  return <span className={`text-xs ${color}`}>{len}/{max} chars {len >= min && len <= max ? '✓' : `(ideal: ${min}–${max})`}</span>;
};

// ── Formatting toolbar ────────────────────────────────────────────────────────
const ToolbarBtn = ({ onClick, children, title }) => (
  <button type="button" onClick={onClick} title={title}
    className="px-2 py-1 text-xs font-mono border border-gray-200 rounded hover:bg-gray-100 text-gray-700 transition-colors">
    {children}
  </button>
);

const insertTag = (textareaRef, setter, openTag, closeTag) => {
  const el = textareaRef.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;
  const selected = val.substring(start, end) || 'text';
  const newVal = val.substring(0, start) + openTag + selected + closeTag + val.substring(end);
  setter(newVal);
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
  }, 10);
};

// ── Main component ────────────────────────────────────────────────────────────
const EMPTY = {
  title: '', slug: '', content: '', excerpt: '', category: 'Education',
  image: '', author: 'Krishi Team', status: 'draft',
  seo_title: '', seo_description: '', focus_keyword: '', canonical_url: '',
  og_title: '', og_description: '', og_image: '',
  faqs: [], geo_summary: '', entities: [], schema_type: 'BlogPosting', tags: [],
};

const BlogEditorPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isEdit = !!slug;

  const [form, setForm] = useState(EMPTY);
  const [activeTab, setActiveTab] = useState('content');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [seoResult, setSeoResult] = useState(null);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [entityInput, setEntityInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const contentRef = React.useRef(null);

  // Load post for editing
  useEffect(() => {
    if (!isEdit) return;
    axios.get(`${API}/api/admin/blog/${slug}`)
      .then(r => {
        const p = r.data;
        setForm({
          ...EMPTY, ...p,
          faqs: p.faqs || [],
          entities: p.entities || [],
          tags: p.tags || [],
          seo_title: p.seo_title || '',
          seo_description: p.seo_description || '',
          focus_keyword: p.focus_keyword || '',
          canonical_url: p.canonical_url || '',
          og_title: p.og_title || '',
          og_description: p.og_description || '',
          og_image: p.og_image || '',
          geo_summary: p.geo_summary || '',
        });
        setEntityInput((p.entities || []).join(', '));
        setTagInput((p.tags || []).join(', '));
      })
      .catch(() => toast.error('Failed to load post'));
  }, [slug, isEdit]);

  // Recalculate SEO score live
  useEffect(() => {
    setSeoResult(calcSeoScore(form));
  }, [form]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-slug from title
  const handleTitleChange = (v) => {
    set('title', v);
    if (!isEdit) {
      set('slug', v.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim());
    }
    if (!form.seo_title) set('seo_title', v.slice(0, 60));
    if (!form.og_title) set('og_title', v.slice(0, 60));
  };

  const handleExcerptChange = (v) => {
    set('excerpt', v);
    if (!form.seo_description) set('seo_description', v.slice(0, 160));
    if (!form.og_description) set('og_description', v.slice(0, 160));
  };

  const addFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    set('faqs', [...form.faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }]);
    setNewFaqQ(''); setNewFaqA('');
  };

  const removeFaq = (i) => set('faqs', form.faqs.filter((_, idx) => idx !== i));

  const handleSave = async (statusOverride) => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Title and slug are required');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      status: statusOverride || form.status,
      entities: entityInput.split(',').map(s => s.trim()).filter(Boolean),
      tags: tagInput.split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit) {
        await axios.put(`${API}/api/admin/blog/${slug}`, payload);
        toast.success('Post updated!');
      } else {
        await axios.post(`${API}/api/admin/blog`, payload);
        toast.success('Post created!');
        navigate(`/admin/blog/edit/${payload.slug}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'content', label: 'Content', icon: FileEdit },
    { id: 'seo', label: 'SEO', icon: Search },
    { id: 'aeo', label: 'AEO / GEO', icon: MessageSquare },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  // Inline SVG stand-ins for missing icons
  function FileEdit({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }

  const scoreColor = !seoResult ? 'gray' : seoResult.score >= 80 ? 'green' : seoResult.score >= 50 ? 'amber' : 'red';

  return (
    <div className="flex gap-6 h-full">
      {/* ── Main editor ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/blog')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{isEdit ? 'Edit Post' : 'New Blog Post'}</h1>
              {isEdit && <p className="text-xs text-gray-400">/{form.slug}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button onClick={() => handleSave()} disabled={saving} className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1F3A0F] disabled:opacity-60 transition-colors">
              <Save size={15} /> {saving ? 'Saving…' : 'Save'}
            </button>
            {form.status !== 'published' && (
              <button onClick={() => handleSave('published')} disabled={saving} className="flex items-center gap-2 bg-[#C8602B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#A94E21] disabled:opacity-60 transition-colors">
                <Globe size={15} /> Publish
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
          {[
            { id: 'content', label: 'Content' },
            { id: 'seo', label: 'SEO' },
            { id: 'aeo', label: 'AEO / GEO' },
            { id: 'preview', label: 'Preview' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-[#2D5016] text-[#2D5016] bg-[#2D5016]/5'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="bg-white rounded-b-xl rounded-tr-xl border border-t-0 border-gray-100 p-6 space-y-6">

          {/* ── CONTENT TAB ── */}
          {activeTab === 'content' && (
            <>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Title *">
                  <Input value={form.title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. 5 Reasons to Switch to Cold-Pressed Oil" />
                </Field>
                <Field label="Slug *" hint="URL-safe identifier (auto-generated from title)">
                  <Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="5-reasons-cold-pressed-oil" />
                </Field>
              </div>

              <Field label="Excerpt / Short Description" hint="Shown in blog listing cards (also auto-fills meta description if empty)">
                <Textarea rows={3} value={form.excerpt} onChange={e => handleExcerptChange(e.target.value)} placeholder="A compelling summary in 1–2 sentences…" />
              </Field>

              {/* Body */}
              <Field label="Body Content (HTML)" hint="Write in HTML. Use the toolbar for quick formatting.">
                {/* Formatting toolbar */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: 'H2', open: '<h2>', close: '</h2>', title: 'Heading 2' },
                    { label: 'H3', open: '<h3>', close: '</h3>', title: 'Heading 3' },
                    { label: 'B', open: '<strong>', close: '</strong>', title: 'Bold' },
                    { label: 'I', open: '<em>', close: '</em>', title: 'Italic' },
                    { label: 'UL', open: '<ul>\n  <li>', close: '</li>\n</ul>', title: 'Unordered list' },
                    { label: 'OL', open: '<ol>\n  <li>', close: '</li>\n</ol>', title: 'Ordered list' },
                    { label: 'LI', open: '<li>', close: '</li>', title: 'List item' },
                    { label: 'P', open: '<p>', close: '</p>', title: 'Paragraph' },
                    { label: 'A', open: '<a href="URL">', close: '</a>', title: 'Link' },
                    { label: 'IMG', open: '<img src="', close: '" alt="description" />', title: 'Image' },
                    { label: 'HR', open: '\n<hr />\n', close: '', title: 'Divider' },
                  ].map(({ label, open, close, title }) => (
                    <ToolbarBtn key={label} title={title} onClick={() => insertTag(contentRef, v => set('content', v), open, close)}>
                      {label}
                    </ToolbarBtn>
                  ))}
                  <span className="text-xs text-gray-400 self-center ml-2">{seoResult?.wordCount || 0} words</span>
                </div>
                <Textarea
                  ref={contentRef}
                  rows={20}
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  placeholder="<h2>Introduction</h2>&#10;<p>Your content here…</p>"
                  className="font-mono text-xs"
                />
              </Field>

              <div className="grid sm:grid-cols-3 gap-5">
                <Field label="Category">
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Author">
                  <Input value={form.author} onChange={e => set('author', e.target.value)} />
                </Field>
                <Field label="Featured Image URL">
                  <Input value={form.image} onChange={e => set('image', e.target.value)} placeholder="https://..." />
                </Field>
              </div>

              <Field label="Tags" hint="Comma-separated: cold-pressed, groundnut-oil, health">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="cold-pressed, cooking oil, health" />
              </Field>
            </>
          )}

          {/* ── SEO TAB ── */}
          {activeTab === 'seo' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                <strong>SEO Best Practices:</strong> Title 50–60 chars · Description 150–160 chars · Include focus keyword naturally in both · Set OG image for social sharing.
              </div>

              <Field label="Focus Keyword" hint="The primary keyword this post should rank for">
                <Input value={form.focus_keyword} onChange={e => set('focus_keyword', e.target.value)} placeholder="e.g. cold pressed groundnut oil" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="SEO Title" hint={<CharCount value={form.seo_title} min={50} max={60} />}>
                  <Input value={form.seo_title} onChange={e => set('seo_title', e.target.value)} placeholder="Cold Pressed Groundnut Oil – Benefits & Uses | Krishi" />
                  <p className="text-xs text-gray-400 mt-1">Google preview: <span className="text-blue-600">{form.seo_title || form.title}</span></p>
                </Field>
                <Field label="Canonical URL" hint="Leave blank to auto-generate">
                  <Input value={form.canonical_url} onChange={e => set('canonical_url', e.target.value)} placeholder="/blogs/news/your-slug" />
                </Field>
              </div>

              <Field label="Meta Description" hint={<CharCount value={form.seo_description} min={150} max={160} />}>
                <Textarea rows={3} value={form.seo_description} onChange={e => set('seo_description', e.target.value)} placeholder="Discover the health benefits of cold pressed groundnut oil…" />
                <p className="text-xs text-gray-400 mt-1">Google preview: <span className="text-gray-600">{form.seo_description || form.excerpt}</span></p>
              </Field>

              <hr className="border-gray-100" />
              <p className="text-sm font-semibold text-gray-600 flex items-center gap-2"><Globe size={14} /> Open Graph (Social Sharing)</p>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="OG Title" hint={<CharCount value={form.og_title} min={30} max={60} />}>
                  <Input value={form.og_title} onChange={e => set('og_title', e.target.value)} placeholder="Same as SEO title or a shareable variation" />
                </Field>
                <Field label="OG Image URL" hint="1200×630px recommended">
                  <Input value={form.og_image} onChange={e => set('og_image', e.target.value)} placeholder="https://..." />
                  {form.og_image && <img src={form.og_image} alt="OG preview" className="mt-2 w-full max-h-32 object-cover rounded-lg" />}
                </Field>
              </div>
              <Field label="OG Description" hint={<CharCount value={form.og_description} min={100} max={160} />}>
                <Textarea rows={2} value={form.og_description} onChange={e => set('og_description', e.target.value)} placeholder="Engaging description for Facebook, LinkedIn, Twitter…" />
              </Field>

              <Field label="Schema Type" hint="Structured data type for this post">
                <select value={form.schema_type} onChange={e => set('schema_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30">
                  {SCHEMA_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  BlogPosting = standard articles · FAQPage = FAQ-heavy content · HowTo = step-by-step guides · Article = news/editorial
                </p>
              </Field>
            </>
          )}

          {/* ── AEO / GEO TAB ── */}
          {activeTab === 'aeo' && (
            <>
              {/* AEO — FAQs */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare size={16} className="text-[#C8602B]" />
                  <h3 className="font-semibold text-gray-800">AEO — Frequently Asked Questions</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  FAQs appear in Google's "People Also Ask" section and voice search answers. Add at least 3 for maximum impact. These auto-generate <code>FAQPage</code> schema.
                </p>

                {/* FAQ list */}
                <div className="space-y-3 mb-4">
                  {form.faqs.map((faq, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">Q: {faq.question}</p>
                          <p className="text-sm text-gray-600 mt-1">A: {faq.answer}</p>
                        </div>
                        <button onClick={() => removeFaq(i)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add FAQ */}
                <div className="bg-[#2D5016]/5 border border-[#2D5016]/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#2D5016] uppercase tracking-wide">Add New FAQ</p>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Question</label>
                    <Input value={newFaqQ} onChange={e => setNewFaqQ(e.target.value)} placeholder="What are the benefits of cold pressed oil?" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Answer</label>
                    <Textarea rows={3} value={newFaqA} onChange={e => setNewFaqA(e.target.value)} placeholder="Cold pressed oils retain natural nutrients and antioxidants because no heat is used during extraction…" />
                  </div>
                  <button onClick={addFaq} className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1F3A0F] transition-colors">
                    <Plus size={14} /> Add FAQ
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* GEO */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cpu size={16} className="text-purple-600" />
                  <h3 className="font-semibold text-gray-800">GEO — Generative Engine Optimisation</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  GEO helps AI tools (ChatGPT, Perplexity, Gemini) cite your content accurately. Write a crisp factual summary and list key named entities so AI models can identify and reference your content.
                </p>

                <Field
                  label="AI Summary (2–3 sentences)"
                  hint="Write a factual, direct summary as if answering a question. Avoid marketing language. This is what AI models will cite."
                >
                  <Textarea rows={4} value={form.geo_summary} onChange={e => set('geo_summary', e.target.value)}
                    placeholder="Cold pressed groundnut oil is extracted from raw peanuts using a wooden press without heat, preserving Vitamin E, antioxidants, and natural fatty acids. Unlike refined oils, it retains its golden colour and authentic nutty flavour. It is suitable for everyday cooking, shallow frying, and salad dressings at temperatures up to 160°C." />
                  <CharCount value={form.geo_summary} min={80} max={300} />
                </Field>

                <Field
                  label="Named Entities"
                  hint="Comma-separated list of specific names, ingredients, places, brands, and concepts in this post. Helps AI knowledge graph association."
                >
                  <Input value={entityInput} onChange={e => setEntityInput(e.target.value)}
                    placeholder="Groundnut Oil, Vitamin E, Karnataka, Cold Pressing, Wooden Press, Arachidic Acid, FSSAI" />
                  <p className="text-xs text-gray-400 mt-1">
                    Include: ingredients, nutrients, places, processes, certifications, people
                  </p>
                </Field>
              </div>

              {/* Schema preview */}
              {form.faqs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated FAQ Schema Preview</p>
                  <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto">
                    {JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      "mainEntity": form.faqs.map(f => ({
                        "@type": "Question",
                        "name": f.question,
                        "acceptedAnswer": { "@type": "Answer", "text": f.answer }
                      }))
                    }, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}

          {/* ── PREVIEW TAB ── */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Google SERP preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Google Search Preview</p>
                <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-xl">
                  <p className="text-xs text-green-700">krishifoods.in › blogs › news › {form.slug || 'your-slug'}</p>
                  <p className="text-[#1a0dab] text-lg font-medium mt-0.5 hover:underline cursor-pointer line-clamp-1">
                    {form.seo_title || form.title || 'Your Post Title'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {form.seo_description || form.excerpt || 'Your meta description will appear here…'}
                  </p>
                </div>
              </div>

              {/* OG preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Social Share Preview</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden max-w-sm">
                  <div className="h-36 bg-gray-100">
                    {(form.og_image || form.image) ? (
                      <img src={form.og_image || form.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image set</div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase">krishifoods.in</p>
                    <p className="font-semibold text-gray-800 text-sm mt-0.5 line-clamp-1">{form.og_title || form.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.og_description || form.excerpt}</p>
                  </div>
                </div>
              </div>

              {/* Content preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Content Preview</p>
                <div className="border border-gray-200 rounded-xl p-6 prose prose-sm max-w-none">
                  <h1 className="text-2xl font-bold text-[#2D5016]">{form.title}</h1>
                  <p className="text-[#4A5D3F] italic">{form.excerpt}</p>
                  <div dangerouslySetInnerHTML={{ __html: form.content || '<p class="text-gray-400">No content yet…</p>' }} />
                  {form.faqs.length > 0 && (
                    <>
                      <h2 className="text-xl font-semibold text-[#2D5016] mt-6">Frequently Asked Questions</h2>
                      {form.faqs.map((f, i) => (
                        <div key={i} className="mt-3">
                          <p className="font-medium text-gray-800">Q: {f.question}</p>
                          <p className="text-gray-600 mt-1">A: {f.answer}</p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SEO Score sidebar ── */}
      <aside className="w-72 flex-shrink-0 space-y-4">
        {/* Score card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-700 text-sm">SEO / AEO / GEO Score</p>
            <span className={`text-lg font-bold ${
              scoreColor === 'green' ? 'text-green-600' : scoreColor === 'amber' ? 'text-amber-500' : 'text-red-500'
            }`}>{seoResult?.score ?? 0}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                scoreColor === 'green' ? 'bg-green-500' : scoreColor === 'amber' ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${seoResult?.score ?? 0}%` }}
            />
          </div>

          {/* Checks list */}
          <div className="space-y-2">
            {seoResult?.checks.map(c => (
              <div key={c.id} className="flex items-start gap-2">
                {c.pass
                  ? <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
                  : c.warn
                    ? <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    : <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                }
                <p className={`text-xs leading-tight ${c.pass ? 'text-gray-500' : 'text-gray-700'}`}>{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Word count */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Stats</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Words</span>
              <span className={`font-medium ${(seoResult?.wordCount || 0) >= 600 ? 'text-green-600' : 'text-amber-600'}`}>{seoResult?.wordCount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">FAQs</span>
              <span className={`font-medium ${form.faqs.length >= 3 ? 'text-green-600' : form.faqs.length > 0 ? 'text-amber-600' : 'text-red-500'}`}>{form.faqs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Entities</span>
              <span className={`font-medium ${entityInput.split(',').filter(Boolean).length >= 2 ? 'text-green-600' : 'text-gray-600'}`}>
                {entityInput.split(',').filter(s => s.trim()).length}
              </span>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"><Info size={12} /> Tips</p>
          <ul className="space-y-2 text-xs text-gray-500">
            <li><strong className="text-gray-700">SEO:</strong> Use focus keyword in the first 100 words of body content</li>
            <li><strong className="text-gray-700">AEO:</strong> Write FAQ answers in full sentences for voice search compatibility</li>
            <li><strong className="text-gray-700">GEO:</strong> AI summary should be factual, specific, and cite measurable details</li>
            <li><strong className="text-gray-700">Schema:</strong> Use FAQPage type if FAQs are the primary content</li>
          </ul>
        </div>
      </aside>
    </div>
  );
};

export default BlogEditorPage;
