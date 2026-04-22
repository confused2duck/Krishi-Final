import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Upload, Trash2, Copy, Image as ImageIcon, Film, Filter } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const CHUNK_SIZE = 3 * 1024 * 1024; // 3 MB — stays under Vercel's 4.5 MB body limit

const PAGE_OPTIONS = [
  { value: 'hero',      label: 'Hero' },
  { value: 'home',      label: 'Home' },
  { value: 'products',  label: 'Products' },
  { value: 'blog-news', label: 'Blog / News' },
  { value: 'contact',   label: 'Contact' },
  { value: 'oil',       label: 'Oil Education' },
  { value: 'bundle',    label: 'Bundle' },
  { value: 'about',     label: 'About' },
  { value: 'logo',      label: 'Logo' },
  { value: 'custom',    label: 'Custom key' },
];

const BADGE = {
  hero:       'bg-blue-50 text-blue-700',
  home:       'bg-purple-50 text-purple-700',
  products:   'bg-[#2D5016]/10 text-[#2D5016]',
  'blog-news':'bg-amber-50 text-amber-700',
  contact:    'bg-pink-50 text-pink-700',
  oil:        'bg-yellow-50 text-yellow-700',
  bundle:     'bg-indigo-50 text-indigo-700',
  about:      'bg-teal-50 text-teal-700',
  logo:       'bg-gray-100 text-gray-600',
};

const pageLabel = (val) => PAGE_OPTIONS.find(p => p.value === val)?.label || val;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const readBase64 = (blob) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = (e) => res(e.target.result.split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(blob);
});

const SkeletonCard = () => (
  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-pulse">
    <div className="w-full aspect-video bg-gray-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-100 rounded w-3/4" />
      <div className="h-5 bg-gray-100 rounded w-1/3" />
    </div>
  </div>
);

// ── Images section ────────────────────────────────────────────────────────────

const ImagesSection = () => {
  const [images, setImages]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);
  const [pageFilter, setPageFilter] = useState('all');
  const [selectedPage, setSelectedPage] = useState('hero');
  const [customPage, setCustomPage] = useState('');
  const [sectionKey, setSectionKey] = useState('');
  const fileRef = useRef(null);
  const resolvedPage = selectedPage === 'custom' ? customPage.trim() : selectedPage;

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/api/admin/images`); setImages(r.data); }
    catch { toast.error('Failed to load images'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const uploadFiles = async (files) => {
    const ok = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!ok.length) { toast.error('Only image files are supported'); return; }
    if (!resolvedPage) { toast.error('Please provide a page key'); return; }
    setUploading(true);
    let success = 0, fail = 0;
    await Promise.all(ok.map(async (file) => {
      try {
        const data = await readBase64(file);
        if (!resolvedPage) throw new Error('missing-page');
        await axios.post(`${API}/api/admin/images`, {
          name: file.name,
          data,
          mime_type: file.type,
          page: resolvedPage,
          section: sectionKey.trim() || null,
        });
        success++;
      } catch { fail++; }
    }));
    setUploading(false);
    if (success) { toast.success(`${success} image${success > 1 ? 's' : ''} uploaded`); fetchImages(); }
    if (fail)    toast.error(`${fail} upload${fail > 1 ? 's' : ''} failed`);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); };
  const handleFile = (e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; };
  const copyUrl    = (id) => navigator.clipboard.writeText(`/api/images/${id}`).then(() => toast.success('URL copied!')).catch(() => toast.error('Copy failed'));
  const remove     = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await axios.delete(`${API}/api/admin/images/${id}`); toast.success('Deleted'); setImages(p => p.filter(i => i.id !== id)); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = pageFilter === 'all' ? images : images.filter(i => i.page === pageFilter);

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Upload Images</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Section</label>
            <select
              value={selectedPage} onChange={e => setSelectedPage(e.target.value)}
              className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
            >
              {PAGE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {selectedPage === 'custom' && (
              <input
                value={customPage}
                onChange={e => setCustomPage(e.target.value)}
                placeholder="e.g. home-testimonials"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
              />
            )}
            <input
              value={sectionKey}
              onChange={e => setSectionKey(e.target.value)}
              placeholder="Section (optional), e.g. hero-main"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
            />
          </div>
        </div>
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#2D5016] bg-[#2D5016]/5' : 'border-gray-200 hover:border-[#2D5016]/50 hover:bg-gray-50'}`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        >
          {uploading
            ? <div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-[#2D5016] border-t-transparent rounded-full animate-spin" /><p className="text-sm text-gray-500">Uploading…</p></div>
            : <div className="flex flex-col items-center gap-2 text-gray-400"><Upload size={28} /><p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p><p className="text-xs">PNG, JPG, WEBP — multiple files supported</p></div>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400" />
        <span className="text-sm text-gray-500 mr-1">Filter:</span>
        {['all', ...Array.from(new Set([...images.map(i => i.page).filter(Boolean), ...PAGE_OPTIONS.map(p => p.value).filter(v => v !== 'custom')]))].map(val => (
          <button key={val} onClick={() => setPageFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pageFilter === val ? 'bg-[#2D5016] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2D5016]/40 hover:text-[#2D5016]'}`}
          >{val === 'all' ? 'All' : pageLabel(val)}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <ImageIcon size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">{pageFilter === 'all' ? 'No images uploaded yet' : `No images in "${pageLabel(pageFilter)}"`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(img => (
            <div key={img.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden group">
              <div className="w-full aspect-video bg-gray-50 overflow-hidden">
                <img src={`${API}/api/images/${img.id}`} alt={img.name} className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-700 font-medium truncate" title={img.name}>{img.name}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[img.page] || BADGE.general}`}>{pageLabel(img.page)}</span>
                {img.section && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 ml-1">
                    {img.section}
                  </span>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <button onClick={() => copyUrl(img.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-[#2D5016]/40 hover:text-[#2D5016] hover:bg-[#2D5016]/5 transition-colors">
                    <Copy size={12} /> Copy URL
                  </button>
                  <button onClick={() => remove(img.id, img.name)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Videos section ────────────────────────────────────────────────────────────

const VideosSection = () => {
  const [videos, setVideos]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [dragOver, setDragOver]     = useState(false);
  const [pageFilter, setPageFilter] = useState('all');
  const [selectedPage, setSelectedPage] = useState('hero');
  const [customPage, setCustomPage] = useState('');
  const [sectionKey, setSectionKey] = useState('');
  const fileRef = useRef(null);
  const resolvedPage = selectedPage === 'custom' ? customPage.trim() : selectedPage;

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/api/admin/videos`); setVideos(r.data); }
    catch { toast.error('Failed to load videos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const uploadFile = async (file) => {
    if (!file.type.startsWith('video/')) { toast.error('Only video files are supported'); return; }
    if (!resolvedPage) { toast.error('Please provide a page key'); return; }
    setUploading(true);
    setProgress(0);
    const fileId = uid();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    try {
      for (let i = 0; i < totalChunks; i++) {
        const slice = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const data = await readBase64(slice);
        await axios.post(`${API}/api/admin/videos/chunk`, {
          file_id: fileId, chunk_index: i, total_chunks: totalChunks,
          name: file.name, mime_type: file.type, page: resolvedPage, section: sectionKey.trim() || null, data,
        });
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      toast.success('Video uploaded');
      fetchVideos();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); };
  const handleFile = (e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; };
  const copyUrl    = (id) => navigator.clipboard.writeText(`/api/videos/${id}`).then(() => toast.success('URL copied!')).catch(() => toast.error('Copy failed'));
  const remove     = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await axios.delete(`${API}/api/admin/videos/${id}`); toast.success('Deleted'); setVideos(p => p.filter(v => v.id !== id)); }
    catch { toast.error('Delete failed'); }
  };

  const filtered = pageFilter === 'all' ? videos : videos.filter(v => v.page === pageFilter);

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Upload Videos</h2>
            <p className="text-xs text-gray-400 mt-0.5">MP4, WEBM, MOV — uploaded in 3 MB chunks, any size supported</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Section</label>
            <select
              value={selectedPage} onChange={e => setSelectedPage(e.target.value)}
              className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016] bg-white"
            >
              {PAGE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {selectedPage === 'custom' && (
              <input
                value={customPage}
                onChange={e => setCustomPage(e.target.value)}
                placeholder="e.g. home-testimonials"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
              />
            )}
            <input
              value={sectionKey}
              onChange={e => setSectionKey(e.target.value)}
              placeholder="Section (optional), e.g. hero-main"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30 focus:border-[#2D5016]"
            />
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-[#2D5016] bg-[#2D5016]/5' : 'border-gray-200 hover:border-[#2D5016]/50 hover:bg-gray-50'}`}
          onClick={() => !uploading && fileRef.current?.click()}
          onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-xs bg-gray-100 rounded-full h-2">
                <div className="bg-[#2D5016] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-gray-500">Uploading… {progress}%</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Film size={28} />
              <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
              <p className="text-xs">MP4, WEBM, MOV — one file at a time</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={15} className="text-gray-400" />
        <span className="text-sm text-gray-500 mr-1">Filter:</span>
        {['all', ...Array.from(new Set([...videos.map(v => v.page).filter(Boolean), ...PAGE_OPTIONS.map(p => p.value).filter(v => v !== 'custom')]))].map(val => (
          <button key={val} onClick={() => setPageFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${pageFilter === val ? 'bg-[#2D5016] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2D5016]/40 hover:text-[#2D5016]'}`}
          >{val === 'all' ? 'All' : pageLabel(val)}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-16 text-center">
          <Film size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">{pageFilter === 'all' ? 'No videos uploaded yet' : `No videos in "${pageLabel(pageFilter)}"`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(vid => (
            <div key={vid.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden group">
              <div className="w-full aspect-video bg-gray-900 overflow-hidden">
                <video
                  src={`${API}/api/videos/${vid.id}`}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  onMouseEnter={e => e.target.play()}
                  onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }}
                />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-gray-700 font-medium truncate" title={vid.name}>{vid.name}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[vid.page] || BADGE.general}`}>{pageLabel(vid.page)}</span>
                {vid.section && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 ml-1">
                    {vid.section}
                  </span>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <button onClick={() => copyUrl(vid.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-[#2D5016]/40 hover:text-[#2D5016] hover:bg-[#2D5016]/5 transition-colors">
                    <Copy size={12} /> Copy URL
                  </button>
                  <button onClick={() => remove(vid.id, vid.name)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page shell ────────────────────────────────────────────────────────────────

const ImagesPage = () => {
  const [tab, setTab] = useState('images');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Media Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload and manage images and videos for any page</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('images')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'images' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ImageIcon size={15} /> Images
        </button>
        <button
          onClick={() => setTab('videos')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'videos' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Film size={15} /> Videos
        </button>
      </div>

      {tab === 'images' ? <ImagesSection /> : <VideosSection />}
    </div>
  );
};

export default ImagesPage;
