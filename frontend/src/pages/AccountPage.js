import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, RefreshCw, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';

const API = API_BASE_URL;

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    axios.get(`${API}/api/orders`)
      .then((response) => setOrders(response.data))
      .catch((error) => {
        console.error('Failed to fetch orders:', error);
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleReorder = async (order) => {
    for (const item of order.items) {
      try {
        await axios.post(`${API}/api/cart/add`, {
          product_id: item.product_id,
          quantity: item.quantity,
          size: item.size
        });
      } catch (error) {
        console.error('Failed to add item:', error);
      }
    }

    toast.success('Items added to cart!');
    navigate('/cart');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

  if (!user) {
    return null;
  }

  return (
    <>
      <SEO title="My Account" description="Manage your Krishi Foods orders and account details." canonical="/account" noindex={true} />
      <div className="bg-[#F5EDD6] min-h-screen" data-testid="account-page">
        <div className="bg-[#2D5016] py-12">
          <div className="container-krishi">
            <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              My Account
            </h1>
            <p className="text-[#F5EDD6]/80 mt-2">Welcome back, {user.name}!</p>
          </div>
        </div>

        <div className="container-krishi py-8 md:py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <aside className="md:col-span-1">
              <div className="card-krishi">
                <div className="space-y-2">
                  <Link to="/account" className="flex items-center justify-between p-3 rounded-lg bg-[#2D5016]/5 text-[#2D5016] font-medium">
                    <span>Dashboard</span>
                    <ChevronRight size={18} />
                  </Link>
                  <Link to="/account/orders" className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2D5016]/5 text-[#4A5D3F]">
                    <span>Orders</span>
                    <ChevronRight size={18} />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 text-red-600"
                    data-testid="logout-btn"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </aside>

            <main className="md:col-span-3">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="card-krishi animate-pulse">
                      <div className="h-6 bg-[#EBE1C5] rounded w-1/4 mb-4"></div>
                      <div className="h-4 bg-[#EBE1C5] rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="mx-auto text-[#2D5016]/30 mb-4" />
                  <h3 className="heading-h3 mb-2">No Orders Yet</h3>
                  <p className="text-[#4A5D3F] mb-6">Start shopping to see your orders here</p>
                  <Link to="/collections/all" className="btn-primary">
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, idx) => (
                    <div key={idx} className="card-krishi" data-testid={`order-${idx}`}>
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                        <div>
                          <p className="text-sm text-[#4A5D3F]">Order #{order.order_id?.slice(-8) || idx + 1}</p>
                          <p className="font-semibold text-[#1A2F0D]">
                            {order.created_at ? formatDate(order.created_at) : 'Recent'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'delivered' ? 'bg-[#2D5016]/10 text-[#2D5016]' :
                            order.status === 'pending' ? 'bg-[#C8602B]/10 text-[#C8602B]' :
                            'bg-[#EBE1C5] text-[#4A5D3F]'
                          }`}>
                            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Processing'}
                          </span>
                          <span className="font-bold text-[#2D5016]">₹{order.total}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {order.items?.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2 bg-[#EBE1C5]/50 rounded-lg p-2">
                            <img
                              src={resolveMediaUrl(item.image, API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100'}
                              alt={item.name}
                              className="w-10 h-10 rounded object-contain bg-white p-1"
                            />
                            <span className="text-sm text-[#1A2F0D]">{item.name} x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleReorder(order)}
                        className="btn-secondary text-sm py-2"
                        data-testid={`reorder-${idx}`}
                      >
                        <RefreshCw size={16} className="mr-2" /> Reorder
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountPage;
