import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import SEO from '../components/SEO';
import { API_BASE_URL } from '../lib/api';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const API = API_BASE_URL;

const BlogPage = () => {
  const { slug } = useParams();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const { images: blogImages, imgUrl: blogImgUrl } = usePageImages('blog-news');
  const { videos: blogVideos, vidUrl: blogVidUrl } = usePageVideos('blog-news');

  const categories = ['All', 'Education', 'Tips', 'Health', 'Recipes'];

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/api/blog`);
        setPosts(response.data);
        
        if (slug) {
          const post = response.data.find(p => p.slug === slug);
          setSelectedPost(post);
        }
      } catch (error) {
        console.error('Failed to fetch blog posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [slug]);

  const filteredPosts = activeCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === activeCategory);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-[#F5EDD6] min-h-screen py-12">
        <div className="container-krishi">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-[#EBE1C5] rounded w-1/3"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card-krishi">
                  <div className="aspect-video bg-[#EBE1C5] rounded-xl mb-4"></div>
                  <div className="h-4 bg-[#EBE1C5] rounded w-1/3 mb-2"></div>
                  <div className="h-6 bg-[#EBE1C5] rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single Post View
  if (slug && selectedPost) {
    const postSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": selectedPost.title,
      "description": selectedPost.excerpt,
      "image": selectedPost.image || "https://www.krishifoods.in/og-image.jpg",
      "author": { "@type": "Person", "name": selectedPost.author || "Krishi Team" },
      "publisher": {
        "@type": "Organization",
        "name": "Krishi Foods",
        "logo": { "@type": "ImageObject", "url": "https://www.krishifoods.in/logo.png" }
      },
      "datePublished": selectedPost.created_at,
      "mainEntityOfPage": { "@type": "WebPage", "@id": `https://www.krishifoods.in/blogs/news/${selectedPost.slug}` }
    };
    return (
      <>
      <SEO
        title={selectedPost.title}
        description={selectedPost.excerpt}
        canonical={`/blogs/news/${selectedPost.slug}`}
        ogType="article"
        ogImage={selectedPost.image || undefined}
        schema={postSchema}
      />
      <div className="bg-[#F5EDD6] min-h-screen" data-testid="blog-post-page">
        <div className="container-krishi py-8 md:py-12">
          <Link to="/blogs/news" className="inline-flex items-center gap-2 text-[#2D5016] hover:text-[#C8602B] mb-8">
            <ArrowLeft size={18} /> Back to Blog
          </Link>
          
          <article className="max-w-3xl mx-auto">
            <header className="mb-8">
              <span className="label-accent">{selectedPost.category}</span>
              <h1 className="heading-h1 text-3xl md:text-4xl mt-2 mb-4">{selectedPost.title}</h1>
              <div className="flex items-center gap-4 text-sm text-[#4A5D3F]">
                <span className="flex items-center gap-2">
                  <User size={16} /> {selectedPost.author}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} /> {selectedPost.created_at ? formatDate(selectedPost.created_at) : 'Recent'}
                </span>
              </div>
            </header>

            <div className="aspect-video rounded-2xl overflow-hidden mb-8">
              <img 
                src={selectedPost.image} 
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-[#4A5D3F] leading-relaxed mb-6">
                {selectedPost.excerpt}
              </p>
              <div className="text-[#1A2F0D] leading-relaxed space-y-4">
                <p>
                  {selectedPost.content || `Cold pressing is an ancient method of extracting oil from seeds and nuts without the use of heat or chemicals. This traditional technique has been used in India for centuries, particularly in South India where wooden oil presses called "chekku" or "ghani" have been part of the cultural heritage.`}
                </p>
                <p>
                  Unlike modern refined oils that undergo extensive processing including high-heat extraction, chemical solvents, bleaching, and deodorizing, cold-pressed oils retain their natural color, flavor, and most importantly, their nutritional value.
                </p>
                <h2 className="heading-h3 mt-8 mb-4">Why Cold Pressed Matters</h2>
                <p>
                  When oils are extracted using heat and chemicals, many of the beneficial compounds are destroyed. Cold pressing preserves:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-[#4A5D3F]">
                  <li>Natural antioxidants that protect your body from free radicals</li>
                  <li>Essential fatty acids crucial for heart and brain health</li>
                  <li>Fat-soluble vitamins like Vitamin E and K</li>
                  <li>The authentic taste and aroma of the source ingredient</li>
                </ul>
                <h2 className="heading-h3 mt-8 mb-4">Making the Switch</h2>
                <p>
                  Transitioning to cold-pressed oils is simple. Start by replacing your everyday cooking oil with cold-pressed groundnut or coconut oil. You'll notice the difference in taste immediately – dishes will have more depth and authentic flavor.
                </p>
              </div>
            </div>

            {/* Related Posts */}
            <div className="mt-16 pt-8 border-t border-[#2D5016]/10">
              <h3 className="heading-h3 mb-6">More Articles</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {posts.filter(p => p.slug !== slug).slice(0, 2).map((post) => (
                  <Link key={post.slug} to={`/blogs/news/${post.slug}`} className="group">
                    <div className="aspect-video rounded-xl overflow-hidden mb-3">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <span className="label-accent">{post.category}</span>
                    <h4 className="font-semibold text-[#1A2F0D] mt-1 group-hover:text-[#C8602B] transition-colors">
                      {post.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
      </>
    );
  }

  const blogListSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Krishi Foods Blog",
    "url": "https://www.krishifoods.in/blogs/news",
    "description": "Tips, recipes, and education about cold-pressed oils, traditional foods, and healthy living from the Krishi Foods team.",
    "publisher": { "@type": "Organization", "name": "Krishi Foods", "url": "https://www.krishifoods.in" },
    "blogPost": posts.slice(0, 5).map(p => ({
      "@type": "BlogPosting",
      "headline": p.title,
      "url": `https://www.krishifoods.in/blogs/news/${p.slug}`,
      "description": p.excerpt,
      "author": { "@type": "Person", "name": p.author }
    }))
  };

  // Blog List View
  return (
    <>
    <SEO
      title="Blog – Oils, Recipes & Healthy Living Tips"
      description="Read expert tips on cold-pressed oils, traditional Indian recipes, and healthy eating from the Krishi Foods team. Education, health guides, and cooking inspiration."
      canonical="/blogs/news"
      schema={blogListSchema}
    />
    <div className="bg-[#F5EDD6] min-h-screen" data-testid="blog-page">
      {/* Header */}
      <div className="bg-[#2D5016] py-12 md:py-16">
        <div className="container-krishi">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
            Blog
          </h1>
          <p className="text-[#F5EDD6]/80 text-center mt-2">
            Learn about traditional foods, health tips, and more
          </p>
        </div>
      </div>

      <div className="container-krishi py-8 md:py-12">
        {/* CMS Blog Banner */}
        {(blogImages.length > 0 || blogVideos.length > 0) && (
          <div className="relative h-56 md:h-72 overflow-hidden rounded-2xl mb-8">
            {blogVideos.length > 0 ? (
              <video src={blogVidUrl(blogVideos[0].id)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={blogImgUrl(blogImages[0].id)} alt="Blog" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[#1A2F0D]/50 flex items-center justify-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>Latest From The Blog</h1>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-[#2D5016] text-white'
                  : 'bg-white text-[#4A5D3F] hover:bg-[#2D5016]/10'
              }`}
              data-testid={`category-${cat.toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#4A5D3F]">No posts found in this category.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Link 
                key={post.slug} 
                to={`/blogs/news/${post.slug}`} 
                className="card-krishi group"
                data-testid={`blog-card-${post.slug}`}
              >
                <div className="aspect-video rounded-xl overflow-hidden mb-4">
                  <img 
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <span className="label-accent">{post.category}</span>
                <h2 className="heading-h3 mt-2 group-hover:text-[#C8602B] transition-colors">
                  {post.title}
                </h2>
                <p className="text-[#4A5D3F] mt-2 line-clamp-2">{post.excerpt}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-[#4A5D3F]">
                  <span>{post.author}</span>
                  <span>{post.created_at ? formatDate(post.created_at) : 'Recent'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default BlogPage;
