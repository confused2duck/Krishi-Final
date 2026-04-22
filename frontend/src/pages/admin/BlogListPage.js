import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/blog`);
      setPosts(res.data);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (slug) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/api/admin/blog/${slug}`);
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.slug !== slug));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const togglePublish = async (post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      await axios.put(`${API}/api/admin/blog/${post.slug}`, { status: newStatus });
      toast.success(`Post ${newStatus === 'published' ? 'published' : 'moved to draft'}`);
      fetchPosts();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = posts.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} total · {posts.filter(p => p.status === 'published').length} published · {posts.filter(p => p.status === 'draft').length} drafts</p>
        </div>
        <Link to="/admin/blog/new" className="flex items-center gap-2 bg-[#2D5016] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1F3A0F] transition-colors">
          <Plus size={16} /> New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/30"
          />
        </div>
        {['all', 'published', 'draft'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-[#2D5016] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#2D5016]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No posts found</p>
          <Link to="/admin/blog/new" className="mt-4 inline-flex items-center gap-2 text-[#2D5016] font-medium text-sm hover:underline">
            <Plus size={14} /> Create your first post
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">SEO Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(post => {
                // Quick SEO score
                const checks = [
                  !!(post.seo_title && post.seo_title.length >= 50 && post.seo_title.length <= 60),
                  !!(post.seo_description && post.seo_description.length >= 150 && post.seo_description.length <= 160),
                  !!(post.focus_keyword),
                  !!(post.faqs && post.faqs.length >= 3),
                  !!(post.geo_summary),
                  !!(post.og_image || post.image),
                ];
                const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
                const scoreColor = score >= 80 ? 'text-green-600 bg-green-50' : score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

                return (
                  <tr key={post.slug} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800 text-sm line-clamp-1">{post.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">/{post.slug}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{post.category}</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${scoreColor}`}>{score}%</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">{formatDate(post.created_at)}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {post.status || 'published'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => togglePublish(post)} title={post.status === 'published' ? 'Move to draft' : 'Publish'} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          {post.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <Link to={`/admin/blog/edit/${post.slug}`} className="p-1.5 rounded-lg hover:bg-[#2D5016]/10 text-gray-400 hover:text-[#2D5016] transition-colors">
                          <Edit2 size={15} />
                        </Link>
                        <button onClick={() => handleDelete(post.slug)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
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
      )}
    </div>
  );
};

export default BlogListPage;
