import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, Package, Users, ShoppingBag, Mail, ArrowRight, TrendingUp } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

const StatCard = ({ icon: Icon, label, value, color, to }) => (
  <Link to={to || '#'} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </Link>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/admin/stats`)
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome to the Krishi Foods CMS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Published Posts" value={stats?.blog_published} color="bg-[#2D5016]" to="/admin/blog" />
        <StatCard icon={TrendingUp} label="Draft Posts" value={stats?.blog_drafts} color="bg-[#C8602B]" to="/admin/blog" />
        <StatCard icon={Package} label="Products" value={stats?.products} color="bg-blue-600" to="/admin/products" />
        <StatCard icon={ShoppingBag} label="Orders" value={stats?.orders} color="bg-purple-600" to="/admin/orders" />
        <StatCard icon={Users} label="Customers" value={stats?.users} color="bg-indigo-600" to="/admin/customers" />
        <StatCard icon={Mail} label="New Enquiries" value={stats?.new_contacts} color="bg-amber-600" to="/admin/contacts" />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/admin/blog/new"
            className="bg-[#2D5016] text-white rounded-xl p-5 flex items-center justify-between hover:bg-[#1F3A0F] transition-colors group"
          >
            <div>
              <p className="font-semibold text-lg">Write New Blog Post</p>
              <p className="text-white/70 text-sm mt-1">Create SEO-optimised content</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/admin/blog"
            className="bg-white border border-gray-200 text-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">Manage Blog Posts</p>
              <p className="text-gray-500 text-sm mt-1">Edit, publish, or delete posts</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
          <Link
            to="/admin/products"
            className="bg-white border border-gray-200 text-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">Manage Products</p>
              <p className="text-gray-500 text-sm mt-1">Add, edit, or remove products</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
          <Link
            to="/admin/pages"
            className="bg-white border border-gray-200 text-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">Manage CMS Pages</p>
              <p className="text-gray-500 text-sm mt-1">Edit page sections that power the storefront</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
          <Link
            to="/admin/orders"
            className="bg-white border border-gray-200 text-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">View Orders</p>
              <p className="text-gray-500 text-sm mt-1">Track and update order status</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
          <Link
            to="/admin/customers"
            className="bg-white border border-gray-200 text-gray-800 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">Customers</p>
              <p className="text-gray-500 text-sm mt-1">View customer profiles & history</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-gray-400" />
          </Link>
          <Link
            to="/admin/contacts"
            className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-5 flex items-center justify-between hover:shadow-md transition-shadow group"
          >
            <div>
              <p className="font-semibold text-lg">Enquiries</p>
              <p className="text-amber-700 text-sm mt-1">{stats?.new_contacts ? `${stats.new_contacts} new message${stats.new_contacts > 1 ? 's' : ''}` : 'View contact form submissions'}</p>
            </div>
            <ArrowRight className="group-hover:translate-x-1 transition-transform text-amber-600" />
          </Link>
        </div>
      </div>

      {/* SEO Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
          <TrendingUp size={16} /> SEO / AEO / GEO Optimisation Tips
        </h3>
        <ul className="space-y-2 text-sm text-amber-700">
          <li>• <strong>SEO:</strong> Keep title 50–60 chars, description 150–160 chars, use focus keyword in both</li>
          <li>• <strong>AEO:</strong> Add 3+ FAQs per post — Google uses these for "People Also Ask" featured snippets</li>
          <li>• <strong>GEO:</strong> Write a concise 2–3 sentence AI Summary for ChatGPT/Perplexity/Gemini citations</li>
          <li>• <strong>Schema:</strong> Use <code>BlogPosting</code> for articles, <code>FAQPage</code> for FAQ-heavy posts, <code>HowTo</code> for guides</li>
          <li>• <strong>Entities:</strong> List named entities (ingredients, brands, places) to help knowledge graph indexing</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
