import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, Search, Phone } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../lib/api';
import { FREE_SHIPPING_MESSAGE } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const API = API_BASE_URL;
const HIDDEN_COLLECTION_SLUGS = new Set(['unpolished-pulses', 'shikakai', 'wheat', 'frontpage']);
const FALLBACK_COLLECTIONS = [
  { name: 'Cold-Pressed Oil', slug: 'cold-pressed-oils' },
  { name: 'Ghee & Honey', slug: 'ghee-honey' },
  { name: 'Jaggery & Salt', slug: 'jaggery-rocksalt' },
  { name: 'Rices', slug: 'traditional-rices' },
  { name: 'Unpolished Millets', slug: 'unpolished-millets' },
  { name: 'Spices & Pulses', slug: 'spices' },
  { name: 'Chikkis', slug: 'chikkis' },
  { name: 'Others', slug: 'others' },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collections, setCollections] = useState(FALLBACK_COLLECTIONS);
  const { user, logout } = useAuth();
  const { cartItemsCount } = useCart();
  const navigate = useNavigate();
  const logoUrl = '/images/branding/krishi-logo.png';

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await axios.get(`${API}/api/collections`);
        const backendCollections = (response.data || [])
          .filter((collection) => !HIDDEN_COLLECTION_SLUGS.has(collection.slug))
          .map((collection) => ({
            name: collection.name,
            slug: collection.slug,
          }));

        if (backendCollections.length > 0) {
          setCollections(backendCollections);
        }
      } catch (error) {
        console.error('Failed to fetch header collections:', error);
      }
    };

    fetchCollections();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/collections/all?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky-header" data-testid="main-header">
      <div className="border-b border-[#2D5016]/10 bg-[#2D5016]">
        <div className="container-krishi">
          <div className="flex min-h-[34px] items-center justify-center py-1 text-center text-[0.75rem] font-medium tracking-[0.01em] text-[#F5EDD6] sm:text-[0.82rem]">
            {FREE_SHIPPING_MESSAGE}
          </div>
        </div>
      </div>
      <div className="container-krishi">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            {logoUrl ? (
              <img src={logoUrl} alt="Krishi" className="h-10 md:h-12 w-auto" />
            ) : (
              <>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M16 2C16 2 6 8 6 18c0 5.523 4.477 10 10 10s10-4.477 10-10C26 8 16 2 16 2z" fill="#2D5016"/>
                  <path d="M16 10v18M16 14c-2-2-5-3-7-2M16 18c2-2 5-3 7-2" stroke="#F5EDD6" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="text-2xl md:text-3xl font-bold text-[#2D5016]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Krishi
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <DropdownMenu>
              <DropdownMenuTrigger className="text-[#1A2F0D] hover:text-[#2D5016] font-medium transition-colors" data-testid="shop-dropdown">
                Shop
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white border border-[#2D5016]/10 rounded-xl shadow-lg">
                {collections.map((col) => (
                  <DropdownMenuItem key={col.slug} asChild>
                    <Link 
                      to={`/collections/${col.slug}`} 
                      className="cursor-pointer hover:bg-[#F5EDD6]"
                      data-testid={`nav-${col.slug}`}
                    >
                      {col.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <Link to="/collections/all" className="cursor-pointer hover:bg-[#F5EDD6] font-medium text-[#C8602B]">
                    View All
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/bundle" className="text-[#1A2F0D] hover:text-[#2D5016] font-medium transition-colors" data-testid="nav-bundle">
              Build Combo
            </Link>
            <Link to="/pages/oil" className="text-[#1A2F0D] hover:text-[#2D5016] font-medium transition-colors" data-testid="nav-education">
              Oil Education
            </Link>
            <Link to="/about" className="text-[#1A2F0D] hover:text-[#2D5016] font-medium transition-colors" data-testid="nav-about">
              About Us
            </Link>
            <Link to="/blogs/news" className="text-[#1A2F0D] hover:text-[#2D5016] font-medium transition-colors" data-testid="nav-blog">
              Blog
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)} 
              className="p-2 text-[#2D5016] hover:bg-[#2D5016]/10 rounded-full transition-colors"
              data-testid="search-toggle"
            >
              <Search size={20} />
            </button>

            {/* WhatsApp */}
            <a 
                href="https://wa.me/916361558094"
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:flex p-2 text-[#25D366] hover:bg-[#25D366]/10 rounded-full transition-colors"
              data-testid="header-whatsapp"
            >
              <Phone size={20} />
            </a>

            {/* User */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 text-[#2D5016] hover:bg-[#2D5016]/10 rounded-full transition-colors" data-testid="user-menu">
                  <User size={20} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border border-[#2D5016]/10 rounded-xl shadow-lg">
                  <DropdownMenuItem className="font-medium text-[#2D5016]">
                    Hi, {user.name}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">My Account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/account/orders" className="cursor-pointer">Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="p-2 text-[#2D5016] hover:bg-[#2D5016]/10 rounded-full transition-colors" data-testid="login-link">
                <User size={20} />
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-[#2D5016] hover:bg-[#2D5016]/10 rounded-full transition-colors" data-testid="cart-link">
              <ShoppingCart size={20} />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C8602B] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium" data-testid="cart-count">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#2D5016]"
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="py-4 border-t border-[#2D5016]/10 animate-fade-in-up">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-krishi flex-1"
                data-testid="search-input"
                autoFocus
              />
              <button type="submit" className="btn-primary" data-testid="search-submit">
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#2D5016]/10 animate-fade-in-up">
            <nav className="flex flex-col space-y-4">
              <div className="space-y-2">
                <p className="label-accent">Collections</p>
                {collections.map((col) => (
                  <Link 
                    key={col.slug}
                    to={`/collections/${col.slug}`}
                    className="block py-2 text-[#1A2F0D] hover:text-[#2D5016]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {col.name}
                  </Link>
                ))}
              </div>
              <Link to="/bundle" className="py-2 text-[#1A2F0D] hover:text-[#2D5016] font-medium" onClick={() => setMobileMenuOpen(false)}>
                Build Combo
              </Link>
              <Link to="/pages/oil" className="py-2 text-[#1A2F0D] hover:text-[#2D5016] font-medium" onClick={() => setMobileMenuOpen(false)}>
                Oil Education
              </Link>
              <Link to="/about" className="py-2 text-[#1A2F0D] hover:text-[#2D5016] font-medium" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </Link>
              <Link to="/blogs/news" className="py-2 text-[#1A2F0D] hover:text-[#2D5016] font-medium" onClick={() => setMobileMenuOpen(false)}>
                Blog
              </Link>
              <Link to="/contact" className="py-2 text-[#1A2F0D] hover:text-[#2D5016] font-medium" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
