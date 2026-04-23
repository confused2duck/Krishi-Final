import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { SlidersHorizontal, X, ChevronDown, ShoppingCart } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { resolveMediaUrl } from '../lib/utils';

const API = process.env.REACT_APP_BACKEND_URL || "";
const HIDDEN_COLLECTION_SLUGS = new Set(['unpolished-pulses', 'shikakai', 'wheat', 'frontpage']);

const CollectionPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const [products, setProducts] = useState([]);
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    collections: [],
    priceRange: [0, 1000],
    sort: 'default'
  });
  const [collections, setCollections] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsRes, collectionsRes] = await Promise.all([
          axios.get(`${API}/api/products`, {
            params: {
              collection: slug !== 'all' ? slug : undefined,
              search: searchQuery || undefined,
              min_price: filters.priceRange[0] > 0 ? filters.priceRange[0] : undefined,
              max_price: filters.priceRange[1] < 1000 ? filters.priceRange[1] : undefined,
              sort: filters.sort
            }
          }),
          axios.get(`${API}/api/collections`)
        ]);
        
        setProducts(productsRes.data);
        setCollections((collectionsRes.data || []).filter(c => !HIDDEN_COLLECTION_SLUGS.has(c.slug)));
        
        if (slug && slug !== 'all') {
          const col = collectionsRes.data.find(c => c.slug === slug);
          setCollection(col);
        } else {
          setCollection({ name: 'All Products', description: 'Browse our complete range of natural products' });
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, searchQuery, filters.priceRange, filters.sort]);

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    try {
      await addToCart({
        product_id: product.slug,
        quantity: 1,
        size: product.sizes?.[0]?.name || null,
        price: product.price,
        name: product.name,
        image: resolveMediaUrl(product.images?.[0], API)
      });
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  const FreeShippingBar = () => {
    const { cart } = useCart();
    const cartTotal = cart.subtotal || 0;
    const threshold = 999;
    const progress = Math.min((cartTotal / threshold) * 100, 100);
    const remaining = Math.max(threshold - cartTotal, 0);

    return (
      <div className="bg-[#2D5016] text-[#F5EDD6] py-3 px-4 rounded-xl mb-6" data-testid="free-shipping-bar">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span>
            {remaining > 0 ? `Add Rs${remaining} more for FREE shipping!` : "Free shipping unlocked!"}
          </span>
          <span className="font-medium">Rs{cartTotal}/Rs{threshold}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill bg-[#C8602B]" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    );
  };

  const FilterSidebar = ({ isMobile = false }) => (
    <div className={`space-y-6 ${isMobile ? '' : 'sticky top-24'}`}>
      {/* Collections Filter */}
      <div className="card-krishi">
        <h3 className="font-semibold text-[#2D5016] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Collections
        </h3>
        <div className="space-y-3">
          {collections.map((col) => (
            <Link 
              key={col.slug}
              to={`/collections/${col.slug}`}
              className={`block py-1 text-sm transition-colors ${
                slug === col.slug ? 'text-[#C8602B] font-medium' : 'text-[#4A5D3F] hover:text-[#2D5016]'
              }`}
              data-testid={`filter-${col.slug}`}
            >
              {col.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Price Filter */}
      <div className="card-krishi">
        <h3 className="font-semibold text-[#2D5016] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Price Range
        </h3>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
          min={0}
          max={1000}
          step={50}
          className="mb-4"
          data-testid="price-slider"
        />
        <div className="flex justify-between text-sm text-[#4A5D3F]">
          <span>Rs{filters.priceRange[0]}</span>
          <span>Rs{filters.priceRange[1]}</span>
        </div>
      </div>

      {/* Sort */}
      <div className="card-krishi">
        <h3 className="font-semibold text-[#2D5016] mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Sort By
        </h3>
        <select 
          value={filters.sort}
          onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
          className="input-krishi w-full"
          data-testid="sort-select"
        >
          <option value="default">Featured</option>
          <option value="name">Name (A-Z)</option>
          <option value="price">Price (Low to High)</option>
          <option value="price_desc">Price (High to Low)</option>
        </select>
      </div>
    </div>
  );

  const collectionTitle = collection?.name || 'All Products';
  const collectionDesc = collection?.description || `Shop all Krishi Foods products - pure cold-pressed oils, traditional grains, spices and more. Free shipping above Rs999.`;
  const collectionSlug = slug || 'all';

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${collectionTitle} - Krishi Foods`,
    "url": `https://www.krishifoods.in/collections/${collectionSlug}`,
    "description": collectionDesc,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.krishifoods.in" },
        { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://www.krishifoods.in/collections/all" },
        { "@type": "ListItem", "position": 3, "name": collectionTitle, "item": `https://www.krishifoods.in/collections/${collectionSlug}` }
      ]
    }
  };

  return (
    <>
    <SEO
      title={`${collectionTitle} - Buy Online`}
      description={`Shop ${collectionTitle} from Krishi Foods. ${collectionDesc.slice(0, 110)} Free shipping above Rs999.`}
      canonical={`/collections/${collectionSlug}`}
      schema={collectionSchema}
    />
    <div className="bg-[#F5EDD6] min-h-screen" data-testid="collection-page">
      {/* Header */}
      <div className="bg-[#2D5016] py-12 md:py-16">
        <div className="container-krishi">
          <nav className="text-[#F5EDD6]/60 text-sm mb-4">
            <Link to="/" className="hover:text-[#F5EDD6]">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-[#F5EDD6]">{collection?.name || 'Collections'}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="collection-title">
            {searchQuery ? `Search: "${searchQuery}"` : collection?.name || 'All Products'}
          </h1>
          {collection?.description && (
            <p className="text-[#F5EDD6]/80 mt-2 max-w-2xl">{collection.description}</p>
          )}
        </div>
      </div>

      <div className="container-krishi py-8 md:py-12">
        <FreeShippingBar />

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Mobile Filter Button */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden fixed bottom-20 left-4 z-40 btn-primary flex items-center gap-2" data-testid="mobile-filter-btn">
                <SlidersHorizontal size={18} /> Filters
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#F5EDD6] w-80">
              <SheetHeader>
                <SheetTitle className="text-[#2D5016]" style={{ fontFamily: 'Playfair Display, serif' }}>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterSidebar isMobile />
              </div>
            </SheetContent>
          </Sheet>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[#4A5D3F]">{products.length} products</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="product-card animate-pulse">
                    <div className="aspect-square bg-[#EBE1C5]"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-[#EBE1C5] rounded w-1/2"></div>
                      <div className="h-4 bg-[#EBE1C5] rounded w-3/4"></div>
                      <div className="h-4 bg-[#EBE1C5] rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#4A5D3F] text-lg">No products found</p>
                <Link to="/collections/all" className="btn-primary mt-4">View All Products</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map((product) => (
                  <Link 
                    key={product.slug}
                    to={`/products/${product.slug}`}
                    className="product-card group"
                    data-testid={`product-${product.slug}`}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={resolveMediaUrl(product.images?.[0], API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'}
                        alt={product.name}
                        className="product-card-image"
                        loading="lazy"
                        width="500"
                        height="500"
                      />
                      {product.stock < 10 && (
                        <span className="absolute top-2 right-2 bg-[#C8602B] text-white text-xs px-2 py-1 rounded-full">
                          Only {product.stock} left
                        </span>
                      )}
                      <button 
                        onClick={(e) => handleAddToCart(product, e)}
                        className="absolute bottom-4 right-4 w-10 h-10 bg-[#2D5016] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1F3A0F]"
                        data-testid={`quick-add-${product.slug}`}
                      >
                        <ShoppingCart size={18} />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-[#C8602B] uppercase tracking-wider mb-1">
                        {product.collection?.replace(/-/g, ' ')}
                      </p>
                      <h3 className="font-semibold text-[#1A2F0D] mb-2 line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#2D5016]">₹{product.price}</span>
                        {product.compare_price && (
                          <span className="text-sm text-[#4A5D3F] line-through">₹{product.compare_price}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CollectionPage;
