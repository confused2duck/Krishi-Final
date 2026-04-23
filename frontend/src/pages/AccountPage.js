import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Package, RefreshCw, Calendar, Pause, Play, SkipForward, X, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { resolveMediaUrl } from '../lib/utils';

const API = process.env.REACT_APP_BACKEND_URL || "";

const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [ordersRes, subsRes] = await Promise.all([
        axios.get(`${API}/api/orders`),
        axios.get(`${API}/api/subscriptions`)
      ]);
      setOrders(ordersRes.data);
      setSubscriptions(subsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionAction = async (subscriptionId, action) => {
    try {
      await axios.patch(
        `${API}/api/subscriptions/${subscriptionId}`,
        { action },
        { withCredentials: true }
      );
      toast.success(`Subscription ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to ${action} subscription`);
    }
  };

  const handleReorder = async (order) => {
    // Add all items from order to cart
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <>
    <SEO title="My Account" description="Manage your Krishi Foods orders, subscriptions, and account details." canonical="/account" noindex={true} />
    <div className="bg-[#F5EDD6] min-h-screen" data-testid="account-page">
      {/* Header */}
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
          {/* Sidebar */}
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
                <Link to="/account/subscriptions" className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2D5016]/5 text-[#4A5D3F]">
                  <span>Subscriptions</span>
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

          {/* Main Content */}
          <main className="md:col-span-3">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-[#2D5016]/10 rounded-none h-auto p-0 gap-8 mb-6">
                <TabsTrigger value="orders" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-4 px-0">
                  Orders
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-4 px-0">
                  Subscriptions
                </TabsTrigger>
              </TabsList>

              {/* Orders Tab */}
              <TabsContent value="orders" data-testid="orders-tab">
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
                                className="w-10 h-10 rounded object-cover"
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
              </TabsContent>

              {/* Subscriptions Tab */}
              <TabsContent value="subscriptions" data-testid="subscriptions-tab">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="card-krishi animate-pulse">
                        <div className="h-6 bg-[#EBE1C5] rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-[#EBE1C5] rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : subscriptions.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar size={48} className="mx-auto text-[#2D5016]/30 mb-4" />
                    <h3 className="heading-h3 mb-2">No Subscriptions</h3>
                    <p className="text-[#4A5D3F] mb-6">Subscribe & Save 10% on your favorite products</p>
                    <Link to="/collections/cold-pressed-oils" className="btn-primary">
                      Start Subscribing
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subscriptions.map((sub, idx) => (
                      <div key={idx} className="card-krishi" data-testid={`subscription-${idx}`}>
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div>
                            <p className="font-semibold text-[#1A2F0D]">
                              {sub.frequency === 'monthly' ? 'Monthly' : 'Bi-monthly'} Subscription
                            </p>
                            <p className="text-sm text-[#4A5D3F]">
                              Next delivery: {sub.next_delivery_date ? formatDate(sub.next_delivery_date) : 'TBD'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            sub.status === 'active' ? 'bg-[#2D5016]/10 text-[#2D5016]' :
                            sub.status === 'paused' ? 'bg-[#C8602B]/10 text-[#C8602B]' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-4">
                          {sub.items?.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-2 bg-[#EBE1C5]/50 rounded-lg p-2">
                              <img 
                              src={resolveMediaUrl(item.image, API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=100'}
                                alt={item.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <span className="text-sm text-[#1A2F0D]">{item.name}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {sub.status === 'active' && (
                            <>
                              <button 
                                onClick={() => handleSubscriptionAction(sub.id, 'pause')}
                                className="btn-secondary text-sm py-2"
                                data-testid={`pause-${idx}`}
                              >
                                <Pause size={16} className="mr-2" /> Pause
                              </button>
                              <button 
                                onClick={() => handleSubscriptionAction(sub.id, 'skip')}
                                className="btn-secondary text-sm py-2"
                                data-testid={`skip-${idx}`}
                              >
                                <SkipForward size={16} className="mr-2" /> Skip Next
                              </button>
                            </>
                          )}
                          {sub.status === 'paused' && (
                            <button 
                              onClick={() => handleSubscriptionAction(sub.id, 'resume')}
                              className="btn-primary text-sm py-2"
                              data-testid={`resume-${idx}`}
                            >
                              <Play size={16} className="mr-2" /> Resume
                            </button>
                          )}
                          {sub.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleSubscriptionAction(sub.id, 'cancel')}
                              className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                              data-testid={`cancel-${idx}`}
                            >
                              <X size={16} className="mr-2 inline" /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
    </>
  );
};

export default AccountPage;
