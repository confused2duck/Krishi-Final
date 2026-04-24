import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const API = API_BASE_URL;

const BundleBuilderPage = () => {
  const [step, setStep] = useState(1);
  const [oils, setOils] = useState([]);
  const [addons, setAddons] = useState([]);
  const [selectedOils, setSelectedOils] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { images: bundleImages, imgUrl: bundleImgUrl } = usePageImages('bundle');
  const { videos: bundleVideos, vidUrl: bundleVidUrl } = usePageVideos('bundle');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [oilsRes, addonsRes] = await Promise.all([
          axios.get(`${API}/api/products`, { params: { collection: 'cold-pressed-oils' } }),
          axios.get(`${API}/api/products`, { params: { collection: 'ghee-honey' } })
        ]);
        setOils(oilsRes.data);
        setAddons(addonsRes.data.slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const toggleOil = (oil) => {
    const exists = selectedOils.find((o) => o.slug === oil.slug);
    if (exists) {
      setSelectedOils(selectedOils.filter((o) => o.slug !== oil.slug));
    } else if (selectedOils.length < 4) {
      setSelectedOils([...selectedOils, oil]);
    } else {
      toast.error('Maximum 4 oils allowed in a bundle');
    }
  };

  const toggleAddon = (addon) => {
    const exists = selectedAddons.find((a) => a.slug === addon.slug);
    if (exists) {
      setSelectedAddons(selectedAddons.filter((a) => a.slug !== addon.slug));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const calculateTotal = () => {
    const oilsTotal = selectedOils.reduce((sum, oil) => sum + oil.price, 0);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const subtotal = oilsTotal + addonsTotal;

    return { subtotal, discount: 0, total: subtotal };
  };

  const handleAddBundle = async () => {
    if (!user) {
      toast.error('Please login to add bundle to cart');
      navigate('/login');
      return;
    }

    const allItems = [...selectedOils, ...selectedAddons];

    for (const item of allItems) {
      await addToCart({
        product_id: item.slug,
        quantity: 1,
        size: item.sizes?.[0]?.name || null,
        price: item.price,
        name: item.name,
        image: resolveMediaUrl(item.images?.[0], API),
        collection: item.collection,
      });
    }

    toast.success('Bundle added to cart!');
    navigate('/cart');
  };

  const { subtotal, total } = calculateTotal();

  const steps = [
    { num: 1, title: 'Pick Oils', desc: 'Choose 2-4 oils' },
    { num: 2, title: 'Add-ons', desc: 'Optional extras' },
  ];

  if (loading) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen py-12">
        <div className="container-krishi">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-[#EBE1C5] rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-[#EBE1C5] rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Build Your Custom Oil Bundle"
        description="Create your personalised cold-pressed oil bundle. Mix and match from Krishi's traditional oils and pantry staples."
        canonical="/bundle"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Build Your Custom Oil Bundle",
          "url": "https://www.krishifoods.in/bundle",
          "description": "Customise your cold-pressed oil bundle from Krishi Foods.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.krishifoods.in" },
              { "@type": "ListItem", "position": 2, "name": "Build Combo", "item": "https://www.krishifoods.in/bundle" }
            ]
          }
        }}
      />
      <div className="bg-[#F5EDD6] min-h-screen" data-testid="bundle-builder-page">
        {(bundleImages.length > 0 || bundleVideos.length > 0) && (
          <div className="relative h-48 md:h-64 overflow-hidden rounded-2xl mb-8 mx-auto max-w-5xl">
            {bundleVideos.length > 0 ? (
              <video src={bundleVidUrl(bundleVideos[0].id)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={bundleImgUrl(bundleImages[0].id)} alt="Bundle Builder" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[#1A2F0D]/40"></div>
          </div>
        )}

        <div className="bg-[#2D5016] py-12">
          <div className="container-krishi">
            <h1 className="text-3xl md:text-4xl font-bold text-white text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
              Build Your Custom Combo
            </h1>
            <p className="text-[#F5EDD6]/80 text-center mt-2">
              Pick your favorite oils and pantry staples in one order.
            </p>
          </div>
        </div>

        <div className="bg-white border-b border-[#2D5016]/10">
          <div className="container-krishi py-6">
            <div className="flex justify-center items-center gap-4 md:gap-8">
              {steps.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => setStep(s.num)}
                    className={`flex items-center gap-3 ${step >= s.num ? 'text-[#2D5016]' : 'text-[#4A5D3F]/50'}`}
                    data-testid={`step-${s.num}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > s.num ? 'bg-[#2D5016] text-white' :
                      step === s.num ? 'bg-[#2D5016] text-white' : 'bg-[#EBE1C5] text-[#4A5D3F]'
                    }`}>
                      {step > s.num ? <Check size={16} /> : s.num}
                    </span>
                    <div className="hidden md:block text-left">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-[#4A5D3F]">{s.desc}</p>
                    </div>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className={`w-12 md:w-24 h-0.5 ${step > s.num ? 'bg-[#2D5016]' : 'bg-[#EBE1C5]'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="container-krishi py-8 md:py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {step === 1 && (
                <div data-testid="step-1-content">
                  <h2 className="heading-h3 mb-6">Select 2-4 Oils ({selectedOils.length}/4)</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {oils.map((oil) => {
                      const isSelected = selectedOils.find((o) => o.slug === oil.slug);
                      return (
                        <button
                          key={oil.slug}
                          onClick={() => toggleOil(oil)}
                          className={`product-card text-left transition-all ${isSelected ? 'ring-2 ring-[#2D5016]' : ''}`}
                          data-testid={`oil-${oil.slug}`}
                        >
                          <div className="relative aspect-square overflow-hidden bg-white">
                            <img
                              src={resolveMediaUrl(oil.images?.[0], API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'}
                              alt={oil.name}
                              className="w-full h-full object-contain p-4"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-[#2D5016] rounded-full flex items-center justify-center">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-[#1A2F0D] text-sm">{oil.name}</h3>
                            <p className="font-bold text-[#2D5016]">₹{oil.price}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      disabled={selectedOils.length < 2}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="next-step-1"
                    >
                      Continue <ArrowRight className="ml-2" size={18} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div data-testid="step-2-content">
                  <h2 className="heading-h3 mb-6">Add Optional Extras</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {addons.map((addon) => {
                      const isSelected = selectedAddons.find((a) => a.slug === addon.slug);
                      return (
                        <button
                          key={addon.slug}
                          onClick={() => toggleAddon(addon)}
                          className={`product-card text-left transition-all ${isSelected ? 'ring-2 ring-[#2D5016]' : ''}`}
                          data-testid={`addon-${addon.slug}`}
                        >
                          <div className="relative aspect-square overflow-hidden bg-white">
                            <img
                              src={resolveMediaUrl(addon.images?.[0], API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'}
                              alt={addon.name}
                              className="w-full h-full object-contain p-4"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-[#2D5016] rounded-full flex items-center justify-center">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-[#1A2F0D] text-sm">{addon.name}</h3>
                            <p className="font-bold text-[#2D5016]">₹{addon.price}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-8 flex justify-between">
                    <button onClick={() => setStep(1)} className="btn-secondary" data-testid="back-step-2">
                      Back
                    </button>
                    <button onClick={handleAddBundle} className="btn-accent" data-testid="add-bundle-btn">
                      Add Bundle to Cart
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="card-krishi sticky top-24" data-testid="bundle-summary">
                <h3 className="heading-h3 mb-6">Your Bundle</h3>

                {selectedOils.length === 0 && selectedAddons.length === 0 ? (
                  <p className="text-[#4A5D3F] text-center py-8">
                    Start by selecting oils from the grid
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 mb-6">
                      {selectedOils.map((oil) => (
                        <div key={oil.slug} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveMediaUrl(oil.images?.[0], API)}
                              alt={oil.name}
                              className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                            />
                            <span className="text-sm text-[#1A2F0D]">{oil.name}</span>
                          </div>
                          <span className="text-sm font-medium text-[#2D5016]">₹{oil.price}</span>
                        </div>
                      ))}
                      {selectedAddons.map((addon) => (
                        <div key={addon.slug} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveMediaUrl(addon.images?.[0], API)}
                              alt={addon.name}
                              className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                            />
                            <span className="text-sm text-[#1A2F0D]">{addon.name}</span>
                          </div>
                          <span className="text-sm font-medium text-[#2D5016]">₹{addon.price}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-[#2D5016]/10 pt-4 space-y-2">
                      <div className="flex justify-between text-[#4A5D3F]">
                        <span>Subtotal</span>
                        <span>₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-[#1A2F0D] pt-2 border-t border-[#2D5016]/10">
                        <span>Total</span>
                        <span>₹{total}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BundleBuilderPage;
