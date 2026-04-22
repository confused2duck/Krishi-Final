import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Plus, LogOut, Menu, X,
  ChevronRight, ExternalLink, Package, ShoppingBag, Users, Mail, Images
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/blog', label: 'Blog Posts', icon: FileText },
    { path: '/admin/blog/new', label: 'New Post', icon: Plus },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/admin/customers', label: 'Customers', icon: Users },
    { path: '/admin/contacts', label: 'Enquiries', icon: Mail },
    { path: '/admin/images', label: 'Images', icon: Images },
  ];

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-[#1A2F0D] text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          {sidebarOpen && (
            <Link to="/" target="_blank" className="flex items-center gap-2 group">
              <img src="/images/branding/krishi-logo.png" alt="Krishi" className="h-10 w-auto" />
              <ExternalLink size={12} className="text-white/40 group-hover:text-white/70" />
            </Link>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/60 hover:text-white p-1">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Admin badge */}
        {sidebarOpen && (
          <div className="px-4 py-3 bg-[#2D5016]/50">
            <p className="text-xs text-white/50 uppercase tracking-wider">Admin CMS</p>
            <p className="text-sm font-medium text-white truncate">{user?.name || user?.email}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(path)
                  ? 'bg-[#C8602B] text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-white/70 hover:bg-red-900/40 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Admin</span>
            {location.pathname !== '/admin' && (
              <>
                <ChevronRight size={14} />
                <span className="text-gray-800 font-medium capitalize">
                  {location.pathname.replace('/admin/', '').replace('/new', ' / New').replace('/edit/', ' / Edit ')}
                </span>
              </>
            )}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2D5016] hover:underline flex items-center gap-1"
          >
            View Site <ExternalLink size={11} />
          </a>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
