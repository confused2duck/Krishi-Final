import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Minus, Plus, Trash2, Truck, ShoppingBag, ArrowRight, Check, X, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/api';
import {
  FREE_SHIPPING_MESSAGE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  resolveMediaUrl,
} from '../lib/utils';

const API = API_BASE_URL;
const COD_PAYMENT_METHOD = 'COD';
const RAZORPAY_PLACEHOLDER_METHOD = 'Razorpay Placeholder';

const CartPage = () => {
  const { cart, updateCart, removeFromCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState(COD_PAYMENT_METHOD);
  const [upsellProducts, setUpsellProducts] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shippingCheck, setShippingCheck] = useState(null);
  const [shippingForm, setShippingForm] = useState({
    name: user?.name || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: ''
  });

  useEffect(() => {
    const fetchUpsells = async () => {
      try {
        const response = await axios.get(`${API}/api/bestsellers`);
        setUpsellProducts(response.data.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch upsells:', error);
      }
    };

    fetchUpsells();
  }, []);

  useEffect(() => {
    const pincode = shippingForm.pincode.trim();

    if (pincode.length !== 6) {
      setShippingCheck(null);
      return;
    }

    let active = true;

    axios.post(`${API}/api/check-pincode`, { pincode })
      .then((response) => {
        if (active) {
          setShippingCheck(response.data);
        }
      })
      .catch(() => {
        if (active) {
          setShippingCheck({
            serviceable: false,
            within_10km: false,
            message: 'Unable to validate this pincode right now.'
          });
        }
      });

    return () => {
      active = false;
    };
  }, [shippingForm.pincode]);

  const subtotal = cart.subtotal || 0;
  const discount = cart.discount || 0;
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD && shippingCheck?.within_10km;
  const shipping = qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const total = subtotal - discount + shipping;
  const progressPercent = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const codSelected = paymentMethod === COD_PAYMENT_METHOD;
  const razorpayPlaceholderSelected = paymentMethod === RAZORPAY_PLACEHOLDER_METHOD;

  const updateQuantity = (productId, size, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId, size);
      return;
    }

    const newItems = cart.items.map((item) => {
      if (item.product_id === productId && item.size === size) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    updateCart(newItems);
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login');
      return;
    }

    setShippingForm((prev) => ({ ...prev, name: user?.name || '' }));
    setShowCheckout(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!shippingCheck?.serviceable) {
      toast.error('Please enter a valid serviceable pincode before placing the order.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const orderData = {
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
        })),
        subtotal,
        discount,
        shipping,
        total,
        payment_method: paymentMethod,
        shipping_address: shippingForm
      };

      const response = await axios.post(`${API}/api/orders`, orderData);
      setOrderDetails(response.data);
      setOrderPlaced(true);
      setShowCheckout(false);
      clearCart();
      toast.success(
        razorpayPlaceholderSelected
          ? 'Razorpay placeholder order created successfully.'
          : 'Order placed successfully!'
      );
    } catch (error) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen py-16" data-testid="order-success">
        <div className="container-krishi text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-[#2D5016] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-white" />
          </div>
          <h1 className="heading-h2 mb-4">Order Placed!</h1>
          <p className="text-[#4A5D3F] mb-2">
            Thank you for your order. We'll send you a confirmation shortly.
          </p>
          {orderDetails?.payment_method === RAZORPAY_PLACEHOLDER_METHOD && (
            <p className="text-sm text-[#4A5D3F] mb-4">
              Razorpay is currently set up as a placeholder, so this order has been saved for manual follow-up instead of collecting payment online.
            </p>
          )}
          {orderDetails?.order_id && (
            <p className="text-sm text-[#4A5D3F] mb-8">Order ID: <span className="font-medium text-[#1A2F0D]">{orderDetails.order_id}</span></p>
          )}
          <div className="flex gap-4 justify-center">
            <Link to="/account" className="btn-primary">Track Order</Link>
            <Link to="/collections/all" className="btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen py-16" data-testid="empty-cart">
        <div className="container-krishi text-center">
          <ShoppingBag size={64} className="mx-auto text-[#2D5016]/30 mb-6" />
          <h1 className="heading-h2 mb-4">Your Cart is Empty</h1>
          <p className="text-[#4A5D3F] mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link to="/collections/all" className="btn-primary">
            Start Shopping <ArrowRight className="ml-2" size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Your Cart" description="Review your Krishi Foods cart and checkout securely." canonical="/cart" noindex={true} />
      <div className="bg-[#F5EDD6] min-h-screen" data-testid="cart-page">
        {showCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" data-testid="checkout-modal">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-[#2D5016]/10">
                <h2 className="heading-h3">Shipping & Payment</h2>
                <button onClick={() => setShowCheckout(false)} className="text-[#4A5D3F] hover:text-[#1A2F0D]">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handlePlaceOrder} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1A2F0D] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.name}
                    onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                    className="input-krishi w-full"
                    data-testid="shipping-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A2F0D] mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                    className="input-krishi w-full"
                    data-testid="shipping-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A2F0D] mb-1">Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={shippingForm.address}
                    onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                    className="input-krishi w-full resize-none"
                    data-testid="shipping-address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A2F0D] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                      className="input-krishi w-full"
                      data-testid="shipping-city"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A2F0D] mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={shippingForm.state}
                      onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                      className="input-krishi w-full"
                      data-testid="shipping-state"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A2F0D] mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={shippingForm.pincode}
                    onChange={(e) => setShippingForm({ ...shippingForm, pincode: e.target.value })}
                    className="input-krishi w-full"
                    data-testid="shipping-pincode"
                  />
                </div>

                <div>
                  <p className="block text-sm font-medium text-[#1A2F0D] mb-2">Payment Method</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(COD_PAYMENT_METHOD)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        codSelected
                          ? 'border-[#2D5016] bg-[#2D5016]/5'
                          : 'border-[#2D5016]/10 hover:border-[#2D5016]/30'
                      }`}
                      data-testid="payment-method-cod"
                    >
                      <div className="flex items-center gap-2 text-[#1A2F0D]">
                        <Truck size={16} />
                        <span className="font-semibold">Cash on Delivery</span>
                      </div>
                      <p className="mt-2 text-sm text-[#4A5D3F]">Collect payment when the order reaches the customer.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(RAZORPAY_PLACEHOLDER_METHOD)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        razorpayPlaceholderSelected
                          ? 'border-[#C8602B] bg-[#C8602B]/5'
                          : 'border-[#2D5016]/10 hover:border-[#C8602B]/35'
                      }`}
                      data-testid="payment-method-razorpay-placeholder"
                    >
                      <div className="flex items-center gap-2 text-[#1A2F0D]">
                        <CreditCard size={16} />
                        <span className="font-semibold">Razorpay Placeholder</span>
                      </div>
                      <p className="mt-2 text-sm text-[#4A5D3F]">Placeholder only for now. Live Razorpay checkout will be connected later.</p>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#2D5016]/10 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-[#4A5D3F]">
                    <span>Subtotal</span><span>₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#2D5016]">
                      <span>5L Oil Offer</span><span>-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#4A5D3F]">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-[#2D5016]">FREE</span> : `₹${shipping}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1A2F0D] text-base pt-2 border-t border-[#2D5016]/10">
                    <span>Total</span><span>₹{total}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="btn-accent w-full disabled:opacity-50"
                  data-testid="place-order-btn"
                >
                  {checkoutLoading ? 'Placing Order...' : codSelected ? 'Place Order (COD)' : 'Create Razorpay Placeholder Order'}
                </button>

                {razorpayPlaceholderSelected && (
                  <p className="rounded-xl bg-[#F5EDD6] px-4 py-3 text-sm text-[#4A5D3F]">
                    This is a temporary placeholder for Razorpay. No online payment is collected yet, but the selected payment method will be saved with the order.
                  </p>
                )}

                <p className="text-sm text-[#4A5D3F]">{FREE_SHIPPING_MESSAGE}</p>
                {shippingCheck && (
                  <p className={`text-sm ${shippingCheck.within_10km ? 'text-[#2D5016]' : 'text-[#4A5D3F]'}`}>
                    {shippingCheck.message}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        <div className="bg-[#2D5016] py-4">
          <div className="container-krishi">
            <div className="text-center text-[#F5EDD6] mb-2">
              {remaining > 0 ? (
                <p>Add <span className="font-bold">₹{remaining}</span> more to unlock free shipping within 10 km.</p>
              ) : (
                <p className="font-medium">Free shipping unlocks at checkout for deliveries within 10 km.</p>
              )}
            </div>
            <div className="progress-bar max-w-md mx-auto">
              <div className="progress-bar-fill bg-[#C8602B]" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="mt-2 text-center text-sm text-[#F5EDD6]/80">{FREE_SHIPPING_MESSAGE}</p>
          </div>
        </div>

        <div className="container-krishi py-8 md:py-12">
          <h1 className="heading-h2 mb-8">Your Cart ({cart.items.length} items)</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item, index) => (
                <div key={`${item.product_id}-${item.size}`} className="card-krishi flex gap-4" data-testid={`cart-item-${index}`}>
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                    <img
                      src={resolveMediaUrl(item.image, API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200'}
                      alt={item.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <Link to={`/products/${item.product_id}`} className="font-semibold text-[#1A2F0D] hover:text-[#2D5016]">
                          {item.name}
                        </Link>
                        {item.size && <p className="text-sm text-[#4A5D3F]">Size: {item.size}</p>}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id, item.size)}
                        className="text-[#4A5D3F] hover:text-red-600 transition-colors"
                        data-testid={`remove-item-${index}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-[#2D5016]/20 rounded-full">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#2D5016] hover:bg-[#2D5016]/5 rounded-l-full"
                          data-testid={`decrease-${index}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#2D5016] hover:bg-[#2D5016]/5 rounded-r-full"
                          data-testid={`increase-${index}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-bold text-[#2D5016]">₹{Math.round(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="card-krishi sticky top-24">
                <h2 className="heading-h3 mb-6">Order Summary</h2>

                <div className="space-y-3 border-t border-[#2D5016]/10 pt-4">
                  <div className="flex justify-between text-[#4A5D3F]">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-[#2D5016]">
                      <span>5L Oil Offer</span>
                      <span>-₹{discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#4A5D3F]">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-[#2D5016]">FREE</span> : `₹${shipping}`}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-[#1A2F0D] pt-3 border-t border-[#2D5016]/10">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>
                </div>

                <div className="border-t border-[#2D5016]/10 mt-4 pt-4">
                  <p className="text-sm font-medium text-[#1A2F0D] mb-3">Payment Method</p>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(COD_PAYMENT_METHOD)}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                        codSelected
                          ? 'border-[#2D5016] bg-[#2D5016]/5'
                          : 'border-[#2D5016]/10 hover:border-[#2D5016]/30'
                      }`}
                      data-testid="summary-payment-cod"
                    >
                      <Truck size={18} className="mt-0.5 text-[#2D5016]" />
                      <div>
                        <p className="font-medium text-[#1A2F0D]">Cash on Delivery</p>
                        <p className="text-sm text-[#4A5D3F]">Pay after the order arrives.</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(RAZORPAY_PLACEHOLDER_METHOD)}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                        razorpayPlaceholderSelected
                          ? 'border-[#C8602B] bg-[#C8602B]/5'
                          : 'border-[#2D5016]/10 hover:border-[#C8602B]/35'
                      }`}
                      data-testid="summary-payment-razorpay-placeholder"
                    >
                      <CreditCard size={18} className="mt-0.5 text-[#C8602B]" />
                      <div>
                        <p className="font-medium text-[#1A2F0D]">Razorpay Placeholder</p>
                        <p className="text-sm text-[#4A5D3F]">Visible placeholder until live gateway integration is added.</p>
                      </div>
                    </button>
                  </div>
                </div>

                <button onClick={handleCheckout} className="btn-accent w-full mt-4" data-testid="checkout-btn">
                  {codSelected ? 'Place Order (COD)' : 'Proceed with Razorpay Placeholder'}
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#4A5D3F]">
                  <Truck size={16} />
                  <span>{FREE_SHIPPING_MESSAGE}</span>
                </div>
              </div>
            </div>
          </div>

          {upsellProducts.length > 0 && (
            <section className="mt-16" data-testid="upsell-section">
              <h2 className="heading-h3 mb-6">Customers Also Bought</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {upsellProducts.map((product) => (
                  <Link key={product.slug} to={`/products/${product.slug}`} className="product-card">
                    <div className="aspect-square overflow-hidden bg-white">
                      <img
                        src={resolveMediaUrl(product.images?.[0], API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'}
                        alt={product.name}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#1A2F0D] mb-2 text-sm">{product.name}</h3>
                      <span className="font-bold text-[#2D5016]">₹{product.price}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default CartPage;
