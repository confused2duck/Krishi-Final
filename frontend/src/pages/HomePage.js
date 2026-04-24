import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Truck, Leaf, Users, Shield, ChevronLeft, ChevronRight, Play, Star } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { Switch } from '../components/ui/switch';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/api';
import { resolveMediaUrl } from '../lib/utils';
import { useCMSPage } from '../hooks/useCMSPage';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const API = API_BASE_URL;
const HIDDEN_COLLECTION_SLUGS = new Set(['unpolished-pulses', 'shikakai', 'wheat', 'frontpage']);

const heroSlides = [
  {
    image: '/images/hero/oil-hero-banner-final-v4.png',
    alt: 'Krishi homepage hero banner',
  },
];

const fallbackCollections = [
  { slug: 'cold-pressed-oils', name: 'Cold-Pressed Oil', image: '/images/collections/cold_pressed_oils.png', href: '/collections/cold-pressed-oils' },
  { slug: 'traditional-rices', name: 'Traditional Rices', image: '/images/collections/traditional_rices.png', href: '/collections/traditional-rices' },
  { slug: 'unpolished-millets', name: 'Unpolished Millets', image: '/images/collections/upolished_millets.png', href: '/collections/unpolished-millets' },
  { slug: 'spices', name: 'Spices & Pulses', image: '/images/collections/spices_pulses.png', href: '/collections/spices' },
  { slug: 'ghee-honey', name: 'Ghee & Honey', image: '/images/collections/ghee_honey.png', href: '/collections/ghee-honey' },
  { slug: 'jaggery-rocksalt', name: 'Jaggery & Rock Salt', image: '/images/collections/jaggery_salt.png', href: '/collections/jaggery-rocksalt' },
  { slug: 'chikkis', name: 'Chikkis', image: '/images/collections/chikkis.png', href: '/collections/chikkis' },
];

const HomePage = () => {
  const { getSection } = useCMSPage('/');
  const [bestsellers, setBestsellers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [showColdPressed, setShowColdPressed] = useState(true);
  const [blogPosts, setBlogPosts] = useState([]);

  const { images: homeImages, imgUrl: homeImgUrl } = usePageImages('home');
  const { videos: homeVideos, vidUrl: homeVidUrl } = usePageVideos('home');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bestsellersRes, blogRes, collectionsRes] = await Promise.all([
          axios.get(`${API}/api/bestsellers`),
          axios.get(`${API}/api/blog`),
          axios.get(`${API}/api/collections`)
        ]);
        setBestsellers(bestsellersRes.data);
        setBlogPosts(blogRes.data.slice(0, 3));
        setCollections(
          (collectionsRes.data || []).filter((collection) => !HIDDEN_COLLECTION_SLUGS.has(collection.slug))
        );
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const trustItems = [
    { icon: Shield, text: 'FSSAI Certified' },
    { icon: Leaf, text: 'Farm to Bottle' },
    { icon: Users, text: '10,000+ Families' },
    { icon: Truck, text: 'Free Shipping Above ₹2000' },
  ];

  const comparisonData = {
    coldPressed: {
      extraction: 'Traditional wooden press at room temperature',
      nutrients: 'All vitamins & antioxidants preserved',
      chemicals: 'Zero chemicals used',
      taste: 'Natural, authentic flavor',
      price: 'Premium but worth it',
    },
    refined: {
      extraction: 'High heat & chemical solvents',
      nutrients: 'Most nutrients destroyed',
      chemicals: 'Hexane, bleach, deodorants',
      taste: 'Bland, stripped flavor',
      price: 'Cheaper but at what cost?',
    }
  };

  const reviews = [
    { name: 'Priya S.', location: 'Bangalore', rating: 5, text: 'The groundnut oil tastes exactly like what my grandmother used to make!', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { name: 'Rajesh K.', location: 'Chennai', rating: 5, text: 'Finally found authentic cold-pressed oils. The difference is noticeable.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { name: 'Meera R.', location: 'Mumbai', rating: 5, text: 'The aroma and freshness make every bottle feel genuinely traditional.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
  ];

  const cmsCollectionCards = Array.isArray(getSection('collections_cards', null)) ? getSection('collections_cards', []) : [];
  const cmsTestimonialCards = Array.isArray(getSection('testimonials_cards', null)) ? getSection('testimonials_cards', []) : [];
  const cmsBlogCards = Array.isArray(getSection('blog_cards', null)) ? getSection('blog_cards', []) : [];

  const displayCollections = cmsCollectionCards.length > 0
    ? cmsCollectionCards.map((c, i) => ({
      slug: (c.link || '').replace('/collections/', '') || `custom-${i}`,
      name: c.title || `Collection ${i + 1}`,
      image: c.image || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
      href: c.link || '/collections/all',
    }))
    : collections.length > 0
      ? collections.map((collection) => ({
          slug: collection.slug,
          name: collection.name,
          image: resolveMediaUrl(collection.image, API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500',
          href: `/collections/${collection.slug}`,
        }))
      : fallbackCollections;

  const displayReviews = cmsTestimonialCards.length > 0
    ? cmsTestimonialCards.map((r, i) => ({
      name: r.name || r.title || `Customer ${i + 1}`,
      location: r.location || '',
      rating: Number(r.rating) || 5,
      text: r.text || '',
      image: r.image || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    }))
    : reviews;

  const displayBlogPosts = cmsBlogCards.length > 0
    ? cmsBlogCards.map((p, i) => ({
      slug: p.slug || `custom-post-${i}`,
      title: p.title || `Blog Post ${i + 1}`,
      excerpt: p.text || '',
      image: p.image || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800',
      category: p.category || 'Blog',
      href: p.link || '/blogs/news',
    }))
    : blogPosts.map((p) => ({ ...p, href: `/blogs/news/${p.slug}` }));

  const homeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.krishifoods.in/#organization",
        "name": "Krishi Foods",
        "url": "https://www.krishifoods.in",
        "logo": "https://www.krishifoods.in/logo.png",
        "description": "Pure cold-pressed oils and traditional Indian foods sourced directly from farmers.",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Krishi cold pressed 105, 2nd Main Rd, RHCS Layout, Annapoorneshwari Nagar, Nagarabhavi",
          "addressLocality": "Bangalore",
          "addressRegion": "Karnataka",
          "postalCode": "560091",
          "addressCountry": "IN"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-6361558094",
          "contactType": "customer service",
          "availableLanguage": ["English", "Hindi", "Kannada"]
        },
        "sameAs": [
          "https://www.instagram.com/krishifoods",
          "https://www.facebook.com/krishifoods"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://www.krishifoods.in/#website",
        "url": "https://www.krishifoods.in",
        "name": "Krishi Foods",
        "publisher": { "@id": "https://www.krishifoods.in/#organization" },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.krishifoods.in/collections/all?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <>
    <SEO
      title="Pure Cold-Pressed Oils & Traditional Indian Foods"
      description="Buy 100% pure cold-pressed oils, unpolished grains, organic spices and traditional Indian foods. Sourced directly from farmers across India."
      canonical="/"
      schema={homeSchema}
    />
    <div className="bg-[#F5EDD6]" data-testid="homepage">
      {/* Hero Section */}
      <section className="bg-[#F5EDD6]" data-testid="hero-section">
        <div className="relative w-full overflow-hidden bg-[#F5EDD6]">
          <img
            src={heroSlides[0].image}
            alt={heroSlides[0].alt}
            className="w-full h-auto object-cover"
            loading="eager"
            width="1920"
            height="1080"
          />

          <div className="absolute inset-x-0 bottom-0">
            <div className="flex min-h-[72px] items-center px-4 py-3 sm:min-h-[88px] sm:px-6 md:min-h-[108px] md:px-10 lg:min-h-[124px] lg:px-14">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 md:gap-4">
                <Link
                  to="/collections/cold-pressed-oils"
                  className="inline-flex min-w-[118px] items-center justify-center rounded-full bg-[#C9682A] px-5 py-2.5 text-[0.9rem] font-semibold text-white shadow-[0_8px_18px_rgba(201,104,42,0.22)] transition-colors hover:bg-[#b95c23] sm:min-w-[132px] sm:px-6 sm:text-[0.95rem]"
                  data-testid="hero-shop-now"
                >
                  Shop Now
                </Link>
                <Link
                  to="/pages/oil"
                  className="inline-flex min-w-[118px] items-center justify-center rounded-full border border-[#C8602B] bg-[#C8602B] px-5 py-2.5 text-[0.9rem] font-semibold text-white transition-colors hover:bg-[#b45424] hover:border-[#b45424] sm:min-w-[132px] sm:px-6 sm:text-[0.95rem]"
                  data-testid="hero-learn-more"
                >
                  Know More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="bg-[#2D5016] py-4 md:py-6" data-testid="trust-bar">
        <div className="container-krishi">
          <div className="grid grid-cols-2 md:flex md:flex-wrap md:justify-between items-center gap-4 md:gap-6">
            {trustItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-[#F5EDD6] justify-center md:justify-start">
                <item.icon size={18} className="text-[#C8602B] flex-shrink-0" />
                <span className="text-xs md:text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="section-padding" data-testid="collections-section">
        <div className="container-krishi">
          <div className="text-center mb-8 md:mb-12">
            <span className="label-accent">Explore</span>
            <h2 className="heading-h2 mt-2">Our Collections</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {displayCollections.map((collection, index) => (
              <Link 
                key={collection.slug}
                to={collection.href}
                className="group relative aspect-square rounded-xl md:rounded-2xl overflow-hidden"
                data-testid={`collection-${collection.slug}`}
              >
                <img
                  src={collection.image}
                  alt={collection.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A2F0D]/80 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                  <h3 className="text-white font-semibold text-sm md:text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {collection.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers Carousel */}
      <section className="section-padding bg-white" data-testid="bestsellers-section">
        <div className="container-krishi">
          <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="label-accent">Top Picks</span>
              <h2 className="heading-h2 mt-2">Bestsellers</h2>
            </div>
            <Link to="/collections/all" className="text-[#2D5016] font-medium hover:text-[#C8602B] transition-colors hidden md:flex items-center gap-2">
              View All <ArrowRight size={18} />
            </Link>
          </div>
          
          <Carousel className="w-full" opts={{ align: 'start', loop: true }}>
            <CarouselContent className="-ml-4">
              {bestsellers.map((product) => (
                <CarouselItem key={product.slug} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
                  <Link to={`/products/${product.slug}`} className="product-card block" data-testid={`bestseller-${product.slug}`}>
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={resolveMediaUrl(product.images?.[0], API) || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500'}
                        alt={product.name}
                        className="product-card-image"
                        loading="lazy"
                        width="500"
                        height="500"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-[#C8602B] uppercase tracking-wider mb-1">{product.collection?.replace(/-/g, ' ')}</p>
                      <h3 className="font-semibold text-[#1A2F0D] mb-2">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-[#2D5016]">₹{product.price}</span>
                        {product.compare_price && (
                          <span className="text-sm text-[#4A5D3F] line-through">₹{product.compare_price}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 bg-white border-[#2D5016]/20 hover:bg-[#2D5016] hover:text-white" />
            <CarouselNext className="hidden md:flex -right-4 bg-white border-[#2D5016]/20 hover:bg-[#2D5016] hover:text-white" />
          </Carousel>
          
          <Link to="/collections/all" className="btn-secondary mt-8 mx-auto md:hidden">
            View All Products
          </Link>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="section-padding" data-testid="comparison-section">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">Know The Difference</span>
            <h2 className="heading-h2 mt-2">Cold Pressed vs Refined</h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-center">
              <span className={`font-medium ${showColdPressed ? 'text-[#2D5016]' : 'text-[#4A5D3F]'}`}>Cold Pressed</span>
              <Switch 
                checked={!showColdPressed}
                onCheckedChange={() => setShowColdPressed(!showColdPressed)}
                data-testid="comparison-toggle"
              />
              <span className={`font-medium ${!showColdPressed ? 'text-[#2D5016]' : 'text-[#4A5D3F]'}`}>Refined</span>
            </div>
            
            <div className="overflow-x-auto">
              <div className="card-krishi min-w-[320px]">
                <table className="w-full">
                  <tbody>
                  {Object.entries(showColdPressed ? comparisonData.coldPressed : comparisonData.refined).map(([key, value]) => (
                    <tr key={key} className="border-b border-[#2D5016]/10 last:border-0">
                      <td className="w-1/3 py-4 pr-3 align-top text-sm font-medium capitalize text-[#2D5016] md:pr-4 md:text-base">{key}</td>
                      <td className="py-4 text-sm text-[#4A5D3F] md:text-base">
                        <span className={`inline-flex items-center gap-2 ${showColdPressed ? 'text-[#2D5016]' : 'text-red-600'}`}>
                          {showColdPressed ? '✓' : '✗'} {value}
                        </span>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Farmer Story */}
      <section className="section-padding" data-testid="farmer-story-section">
        <div className="container-krishi">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1707721690746-cdbdabadebc2?w=800"
                alt="Indian farmer in field"
                className="w-full h-full object-cover"
                loading="lazy"
                width="800"
                height="450"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors" data-testid="farmer-video-play">
                  <Play size={32} className="text-[#2D5016] ml-1" fill="#2D5016" />
                </button>
              </div>
            </div>
            
            <div>
              <span className="label-accent">Our Story</span>
              <h2 className="heading-h2 mt-2 mb-6">From Farm to Your Kitchen</h2>
              <p className="text-[#4A5D3F] mb-4 leading-relaxed">
                We work directly with small-scale farmers across Karnataka, Tamil Nadu, and Andhra Pradesh. Our oils are pressed using traditional wooden chekku (ghani) methods passed down through generations.
              </p>
              <p className="text-[#4A5D3F] mb-6 leading-relaxed">
                No middlemen, no compromise on quality. When you buy from Krishi, you support sustainable farming and get oils the way they were meant to be.
              </p>
              <Link to="/about" className="btn-secondary" data-testid="read-story-cta">
                Read Our Full Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section-padding bg-[#EBE1C5]" data-testid="reviews-section">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">What Our Customers Say</span>
            <h2 className="heading-h2 mt-2">Real Stories, Real Impact</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {displayReviews.map((review, index) => (
              <div key={index} className="card-krishi" data-testid={`review-${index}`}>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={review.image}
                    alt={review.name}
                    className="w-12 h-12 rounded-full object-cover"
                    loading="lazy"
                    width="100"
                    height="100"
                  />
                  <div>
                    <p className="font-semibold text-[#1A2F0D]">{review.name}</p>
                    <p className="text-sm text-[#4A5D3F]">{review.location}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-[#C8602B]" fill="#C8602B" />
                  ))}
                </div>
                <p className="text-[#4A5D3F]">"{review.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Teaser */}
      <section className="section-padding" data-testid="blog-section">
        <div className="container-krishi">
          <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="label-accent">From The Blog</span>
              <h2 className="heading-h2 mt-2">Learn & Discover</h2>
            </div>
            <Link to="/blogs/news" className="text-[#2D5016] font-medium hover:text-[#C8602B] transition-colors hidden md:flex items-center gap-2">
              All Posts <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {displayBlogPosts.map((post) => (
              <Link key={post.slug} to={post.href} className="group" data-testid={`blog-${post.slug}`}>
                <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                    width="800"
                    height="450"
                  />
                </div>
                <span className="label-accent">{post.category}</span>
                <h3 className="heading-h3 mt-2 group-hover:text-[#C8602B] transition-colors">{post.title}</h3>
                <p className="text-[#4A5D3F] mt-2 line-clamp-2">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CMS Home Media */}
      {(homeImages.length > 0 || homeVideos.length > 0) && (
        <section className="section-padding bg-white" data-testid="home-media-section">
          <div className="container-krishi">
            <div className="text-center mb-8 md:mb-12">
              <span className="label-accent">Gallery</span>
              <h2 className="heading-h2 mt-2">From Our Farm</h2>
            </div>
            {homeImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {homeImages.map(img => (
                  <div key={img.id} className="aspect-video rounded-2xl overflow-hidden">
                    <img src={homeImgUrl(img.id)} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </div>
            )}
            {homeVideos.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeVideos.map(vid => (
                  <div key={vid.id} className="aspect-video rounded-2xl overflow-hidden bg-gray-900">
                    <video src={homeVidUrl(vid.id)} controls className="w-full h-full" preload="metadata" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
    </>
  );
};

export default HomePage;
