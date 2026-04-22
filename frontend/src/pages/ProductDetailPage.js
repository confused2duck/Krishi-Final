import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Minus, Plus, ShoppingCart, Heart, Truck, Shield, RefreshCw, ChevronDown, Star, MapPin, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Switch } from '../components/ui/switch';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const API = process.env.REACT_APP_BACKEND_URL || "";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionFrequency, setSubscriptionFrequency] = useState('monthly');
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [mainImage, setMainImage] = useState(0);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const [productRes, relatedRes] = await Promise.all([
          axios.get(`${API}/api/products/${slug}`),
          axios.get(`${API}/api/products/${slug}/related`)
        ]);
        setProduct(productRes.data);
        setRelatedProducts(relatedRes.data);
        if (productRes.data.sizes?.length > 0) {
          setSelectedSize(productRes.data.sizes[0]);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setStickyBarVisible(scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    try {
      await addToCart({
        product_id: product.slug,
        quantity,
        size: selectedSize?.name || null,
        is_subscription: isSubscription,
        frequency: isSubscription ? subscriptionFrequency : null,
        price: calculatePrice(),
        name: product.name,
        image: product.images?.[0] || ''
      });
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/cart');
  };

  const checkPincode = async () => {
    try {
      const response = await axios.post(`${API}/api/check-pincode`, { pincode });
      setPincodeResult(response.data);
    } catch (error) {
      setPincodeResult({ serviceable: false, message: 'Invalid pincode' });
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;
    let price = product.price;
    if (selectedSize?.price_modifier) {
      price += selectedSize.price_modifier;
    }
    if (isSubscription) {
      price = price * 0.9; // 10% off
    }
    return Math.round(price);
  };

  const calculateSavings = () => {
    if (quantity >= 3) return 60;
    if (quantity >= 2) return 30;
    return 0;
  };

  if (loading) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen py-12">
        <div className="container-krishi">
          <div className="grid md:grid-cols-2 gap-12 animate-pulse">
            <div className="aspect-square bg-[#EBE1C5] rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-6 bg-[#EBE1C5] rounded w-1/3"></div>
              <div className="h-10 bg-[#EBE1C5] rounded w-2/3"></div>
              <div className="h-8 bg-[#EBE1C5] rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="heading-h2 mb-4">Product Not Found</h2>
          <Link to="/collections/all" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  const comparisonData = [
    { label: 'Extraction', coldPressed: 'Traditional wooden press', refined: 'Chemical solvents & high heat' },
    { label: 'Nutrients', coldPressed: '100% preserved', refined: 'Mostly destroyed' },
    { label: 'Chemicals', coldPressed: 'Zero', refined: 'Hexane, bleach' },
    { label: 'Taste', coldPressed: 'Natural, authentic', refined: 'Bland' },
  ];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.images?.length ? product.images : ["https://www.krishifoods.in/og-image.jpg"],
    "sku": product.slug,
    "brand": { "@type": "Brand", "name": "Krishi Foods" },
    "offers": {
      "@type": "Offer",
      "url": `https://www.krishifoods.in/products/${product.slug}`,
      "priceCurrency": "INR",
      "price": product.price,
      "priceValidUntil": "2026-12-31",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": "Krishi Foods" }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "124"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.krishifoods.in" },
        { "@type": "ListItem", "position": 2, "name": product.collection?.replace(/-/g, ' '), "item": `https://www.krishifoods.in/collections/${product.collection}` },
        { "@type": "ListItem", "position": 3, "name": product.name, "item": `https://www.krishifoods.in/products/${product.slug}` }
      ]
    }
  };

  return (
    <>
    <SEO
      title={`${product.name} - Buy Online`}
      description={`Buy ${product.name} from Krishi Foods. ${product.description?.slice(0, 120)}. Free shipping above Rs999. 100% pure, no chemicals.`}
      canonical={`/products/${product.slug}`}
      ogType="product"
      schema={productSchema}
    />
    <div className="bg-[#F5EDD6] min-h-screen" data-testid="product-detail-page">
      {/* Breadcrumb */}
      <div className="container-krishi py-4">
        <nav className="text-sm text-[#4A5D3F]">
          <Link to="/" className="hover:text-[#2D5016]">Home</Link>
          <span className="mx-2">/</span>
          <Link to={`/collections/${product.collection}`} className="hover:text-[#2D5016] capitalize">
            {product.collection?.replace(/-/g, ' ')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#2D5016]">{product.name}</span>
        </nav>
      </div>

      {/* Main Product Section */}
      <div className="container-krishi pb-12">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-white" data-testid="main-image">
              <img
                src={product.images?.[mainImage] || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800'}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                width="800"
                height="800"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      mainImage === idx ? 'border-[#2D5016]' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className="label-accent">{product.collection?.replace(/-/g, ' ')}</span>
              <h1 className="heading-h1 text-3xl md:text-4xl mt-2" data-testid="product-name">{product.name}</h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3" data-testid="product-price">
              <span className="text-3xl font-bold text-[#2D5016]">Rs{calculatePrice()}</span>
              {product.compare_price && (
                <span className="text-xl text-[#4A5D3F] line-through">Rs{product.compare_price}</span>
              )}
              {isSubscription && (
                <span className="text-sm bg-[#2D5016] text-white px-2 py-1 rounded-full">10% off - Subscribe</span>
              )}
            </div>

            {/* Urgency */}
            {product.stock < 20 && (
              <p className="text-[#C8602B] font-medium" data-testid="stock-urgency">
                Only {product.stock} left in stock!
              </p>
            )}

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div>
                <p className="font-medium text-[#1A2F0D] mb-3">Size</p>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size.name}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 md:px-6 py-2 md:py-3 rounded-full border-2 font-medium transition-all text-sm md:text-base ${
                        selectedSize?.name === size.name
                          ? 'border-[#2D5016] bg-[#2D5016] text-white'
                          : 'border-[#2D5016]/20 text-[#1A2F0D] hover:border-[#2D5016]'
                      }`}
                      data-testid={`size-${size.name}`}
                    >
                      {size.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subscribe & Save */}
            <div className="card-krishi bg-[#EBE1C5]/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium text-[#2D5016]">Subscribe & Save 10%</p>
                  <p className="text-sm text-[#4A5D3F]">Never run out of your favorites</p>
                </div>
                <Switch 
                  checked={isSubscription} 
                  onCheckedChange={setIsSubscription}
                  data-testid="subscription-toggle"
                />
              </div>
              {isSubscription && (
                <div className="flex gap-3">
                  {['monthly', 'bi-monthly'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setSubscriptionFrequency(freq)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        subscriptionFrequency === freq
                          ? 'border-[#2D5016] bg-[#2D5016] text-white'
                          : 'border-[#2D5016]/20 text-[#1A2F0D]'
                      }`}
                      data-testid={`freq-${freq}`}
                    >
                      {freq === 'monthly' ? 'Every Month' : 'Every 2 Months'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity Discount */}
            <div className="bg-[#2D5016]/5 rounded-xl p-4">
              <p className="font-medium text-[#2D5016] mb-2">Quantity Discounts</p>
              <div className="flex gap-4 text-sm">
                <span className={`${quantity >= 2 ? 'text-[#2D5016] font-medium' : 'text-[#4A5D3F]'}`}>
                  Buy 2 save Rs30
                </span>
                <span className={`${quantity >= 3 ? 'text-[#2D5016] font-medium' : 'text-[#4A5D3F]'}`}>
                  Buy 3 save Rs60
                </span>
              </div>
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex gap-4">
              <div className="flex items-center border border-[#2D5016]/20 rounded-full">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center text-[#2D5016] hover:bg-[#2D5016]/5 rounded-l-full"
                  data-testid="quantity-decrease"
                >
                  <Minus size={18} />
                </button>
                <span className="w-12 text-center font-medium" data-testid="quantity-value">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center text-[#2D5016] hover:bg-[#2D5016]/5 rounded-r-full"
                  data-testid="quantity-increase"
                >
                  <Plus size={18} />
                </button>
              </div>
              <button onClick={handleAddToCart} className="btn-primary flex-1" data-testid="add-to-cart-btn">
                <ShoppingCart className="mr-2" size={18} />
                Add to Cart {calculateSavings() > 0 && `(Save Rs${calculateSavings()})`}
              </button>
            </div>

            <button onClick={handleBuyNow} className="btn-accent w-full" data-testid="buy-now-btn">
              Buy Now
            </button>

            {/* Pincode Checker */}
            <div className="border border-[#2D5016]/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-[#2D5016]" />
                <span className="font-medium text-[#1A2F0D]">Check Delivery</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="input-krishi flex-1"
                  maxLength={6}
                  data-testid="pincode-input"
                />
                <button onClick={checkPincode} className="btn-secondary" data-testid="check-pincode-btn">
                  Check
                </button>
              </div>
              {pincodeResult && (
                <p className={`mt-3 flex items-center gap-2 ${pincodeResult.serviceable ? 'text-[#2D5016]' : 'text-red-600'}`}>
                  {pincodeResult.serviceable ? <Check size={16} /> : <X size={16} />}
                  {pincodeResult.message}
                </p>
              )}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-[#2D5016]/10">
              <div className="flex items-center gap-2 text-sm text-[#4A5D3F]">
                <Shield size={16} className="text-[#2D5016]" /> FSSAI Certified
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4A5D3F]">
                <Truck size={16} className="text-[#2D5016]" /> Free shipping Rs999+
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4A5D3F]">
                <RefreshCw size={16} className="text-[#2D5016]" /> Easy returns
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container-krishi pb-16 md:pb-8">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-[#2D5016]/10 rounded-none h-auto p-0 gap-4 md:gap-8 overflow-x-auto flex-nowrap">
            <TabsTrigger value="description" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
              Description
            </TabsTrigger>
            <TabsTrigger value="benefits" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
              Benefits
            </TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
              Compare
            </TabsTrigger>
            <TabsTrigger value="transparency" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
              Sourcing
            </TabsTrigger>
            {product.uses && product.uses.length > 0 && (
              <TabsTrigger value="uses" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
                How to Use
              </TabsTrigger>
            )}
            {(product.nutritional_facts || product.storage) && (
              <TabsTrigger value="nutrition" className="data-[state=active]:text-[#2D5016] data-[state=active]:border-[#2D5016] border-b-2 border-transparent rounded-none py-3 md:py-4 px-0 whitespace-nowrap text-sm md:text-base">
                Nutrition
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="description" className="pt-6">
            <p className="text-[#4A5D3F] leading-relaxed max-w-3xl">{product.description}</p>
          </TabsContent>
          
          <TabsContent value="benefits" className="pt-6">
            <ul className="space-y-3 max-w-3xl">
              {product.benefits?.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="text-[#2D5016] mt-1 flex-shrink-0" size={18} />
                  <span className="text-[#4A5D3F]">{benefit}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
          
          <TabsContent value="comparison" className="pt-6">
            <div className="card-krishi max-w-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2D5016]/10">
                    <th className="text-left py-3 font-medium text-[#1A2F0D]"></th>
                    <th className="text-left py-3 font-medium text-[#2D5016]">Cold Pressed</th>
                    <th className="text-left py-3 font-medium text-red-600">Refined</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#2D5016]/10 last:border-0">
                      <td className="py-3 text-[#1A2F0D] font-medium">{row.label}</td>
                      <td className="py-3 text-[#2D5016]">Yes - {row.coldPressed}</td>
                      <td className="py-3 text-red-600">No - {row.refined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          
          <TabsContent value="transparency" className="pt-6">
            <div className="max-w-3xl space-y-4">
              <p className="text-[#4A5D3F]">
                This product is sourced directly from small-scale farmers in Karnataka and processed using traditional wooden cold press methods.
              </p>
              <p className="text-[#4A5D3F]">
                Our facility is FSSAI certified (License No: XXXXXXXXXXX) and follows strict quality control measures.
              </p>
              <button className="text-[#C8602B] font-medium hover:underline">
                View Lab Report ->
              </button>
            </div>
          </TabsContent>

          <TabsContent value="uses" className="pt-6">
            <ul className="space-y-3 max-w-3xl">
              {product.uses?.map((use, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center flex-shrink-0 text-sm font-medium mt-0.5">{idx + 1}</span>
                  <span className="text-[#4A5D3F]">{use}</span>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="nutrition" className="pt-6">
            <div className="max-w-3xl space-y-6">
              {product.nutritional_facts && (
                <div>
                  <h3 className="heading-h3 mb-4">Nutritional Information</h3>
                  <div className="card-krishi">
                    <p className="text-[#4A5D3F] leading-relaxed">{product.nutritional_facts}</p>
                  </div>
                </div>
              )}
              {product.storage && (
                <div>
                  <h3 className="heading-h3 mb-3">Storage Instructions</h3>
                  <p className="text-[#4A5D3F] leading-relaxed">{product.storage}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pairs Well With */}
      {relatedProducts.length > 0 && (
        <section className="bg-white py-16" data-testid="related-products">
          <div className="container-krishi">
            <h2 className="heading-h2 mb-8">Pairs Well With</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((prod) => (
                <Link key={prod.slug} to={`/products/${prod.slug}`} className="product-card">
                  <div className="aspect-square overflow-hidden">
                    <img 
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'} 
                      alt={prod.name}
                      className="product-card-image"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#1A2F0D] mb-2">{prod.name}</h3>
                    <span className="text-lg font-bold text-[#2D5016]">Rs{prod.price}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile Sticky Bar */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-[#2D5016]/10 p-4 z-40 transition-transform duration-300 md:hidden ${
          stickyBarVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        data-testid="mobile-sticky-bar"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[#1A2F0D]">{product.name}</p>
            <p className="text-lg font-bold text-[#2D5016]">Rs{calculatePrice()}</p>
          </div>
          <button onClick={handleAddToCart} className="btn-primary">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductDetailPage;
