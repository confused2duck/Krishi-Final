import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Leaf, Users, Award, Heart } from 'lucide-react';
import SEO from '../components/SEO';
import { useCMSPage } from '../hooks/useCMSPage';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const AboutPage = () => {
  const { getText, getImage } = useCMSPage('/about');
  const { images: aboutImages, imgUrl: aboutImgUrl } = usePageImages('about');
  const { videos: aboutVideos, vidUrl: aboutVidUrl } = usePageVideos('about');
  const storyImage = getImage(
    'story_image',
    aboutImages.length > 0 ? aboutImgUrl(aboutImages[0].id) : 'https://images.unsplash.com/photo-1707721690746-cdbdabadebc2?w=800'
  );

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Krishi Foods",
    "url": "https://www.krishifoods.in/about",
    "description": "Learn about Krishi Foods - our mission to bring pure cold-pressed oils and traditional Indian foods from farm to your table.",
    "publisher": {
      "@type": "Organization",
      "name": "Krishi Foods",
      "url": "https://www.krishifoods.in"
    }
  };
  const values = [
    { icon: Leaf, title: 'Pure & Natural', desc: 'No chemicals, no additives. Just pure goodness from nature.' },
    { icon: Users, title: 'Farmer First', desc: 'Direct partnerships ensuring fair prices for our farming communities.' },
    { icon: Award, title: 'Quality Assured', desc: 'Every batch tested for purity and authenticity.' },
    { icon: Heart, title: 'Health Focused', desc: 'Preserving nutrients through traditional methods.' },
  ];

  return (
    <>
    <SEO
      title="Our Story - Farm to Table with Integrity"
      description="Krishi Foods was founded to bring pure cold-pressed oils and traditional Indian foods directly from small-scale farmers to your kitchen. Learn about our story, mission, and values."
      canonical="/about"
      schema={aboutSchema}
    />
    <div className="bg-[#F5EDD6]" data-testid="about-page">
      {/* Hero */}
      <section className="relative py-16 md:py-32">
        <div className="container-krishi">
          <div className="max-w-3xl mx-auto text-center">
            <span className="label-accent">Our Story</span>
            <h1 className="heading-h1 mt-4 mb-6">{getText('hero_title', 'Bringing Back Traditional Goodness')}</h1>
            <p className="text-base leading-relaxed text-[#4A5D3F] sm:text-lg">
              {getText('hero_subtitle', "Krishi was born from a simple belief: the food our grandparents ate was healthier, purer, and more nutritious. We're on a mission to bring back those traditional practices to modern kitchens.")}
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="section-padding bg-white">
        <div className="container-krishi">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-video rounded-2xl overflow-hidden">
              <img
                src={storyImage}
                alt="Farmer in field"
                className="w-full h-full object-cover"
              />
              {aboutVideos.length > 0 ? (
                <video
                  src={aboutVidUrl(aboutVideos[0].id)}
                  controls
                  className="absolute inset-0 w-full h-full object-cover"
                  preload="metadata"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                    <Play size={32} className="text-[#2D5016] ml-1" fill="#2D5016" />
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <span className="label-accent">The Beginning</span>
              <h2 className="heading-h2 mt-2 mb-6">From Farm to Your Table</h2>
              <div className="space-y-4 text-[#4A5D3F]">
                <p>
                  It all started in 2018 when our founder, Rajesh, visited his ancestral village 
                  in Karnataka. He noticed something striking - the traditional wooden oil press 
                  (chekku) that his grandfather used was still producing the purest, most aromatic 
                  oils he had ever tasted.
                </p>
                <p>
                  Compared to the refined oils available in cities, these cold-pressed oils were 
                  completely different - richer in flavor, darker in color, and packed with nutrients 
                  that industrial processing destroys.
                </p>
                <p>
                  That visit sparked a journey. Today, Krishi works with over 100 farming families 
                  across South India, bringing their traditional wisdom directly to your kitchen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cold Press Process */}
      <section className="section-padding">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">The Process</span>
            <h2 className="heading-h2 mt-2">Traditional Cold Pressing</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#2D5016]">
                <span className="text-4xl text-white font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>1</span>
              </div>
              <h3 className="heading-h3 mb-4">Selection</h3>
              <p className="text-[#4A5D3F]">
                We source only the finest seeds and nuts from trusted farmers. 
                Each batch is hand-selected for quality.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#C8602B]">
                <span className="text-4xl text-white font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>2</span>
              </div>
              <h3 className="heading-h3 mb-4">Cold Pressing</h3>
              <p className="text-[#4A5D3F]">
                Using traditional wooden ghani (chekku), seeds are pressed slowly 
                at room temperature – never exceeding 50C.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#2D5016]">
                <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>3</span>
              </div>
              <h3 className="heading-h3 mb-4">Pure & Unrefined</h3>
              <p className="text-[#4A5D3F]">
                No filtering, no bleaching, no deodorizing. Just natural settling 
                to give you oil in its purest form.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-[#2D5016]">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#C8602B]">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              What We Stand For
            </h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
                <value.icon size={40} className="mx-auto mb-4 text-[#C8602B]" />
                <h3 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {value.title}
                </h3>
                <p className="text-[#F5EDD6]/80 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sourcing Transparency */}
      <section className="section-padding">
        <div className="container-krishi">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="label-accent">Transparency</span>
              <h2 className="heading-h2 mt-2 mb-6">Know Where It Comes From</h2>
              <div className="space-y-4 text-[#4A5D3F]">
                <p>
                  Every product at Krishi comes with complete traceability. We believe you 
                  have the right to know exactly where your food comes from and how it's made.
                </p>
                <p>
                  Our oils are sourced from specific villages and farming cooperatives. 
                  We visit our partner farms regularly and maintain direct relationships 
                  with the families who grow and process our products.
                </p>
              </div>
              
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#2D5016] rounded-full"></span>
                  <span className="text-[#1A2F0D]">100+ Partner Farming Families</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#2D5016] rounded-full"></span>
                  <span className="text-[#1A2F0D]">5 States Across South India</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-[#2D5016] rounded-full"></span>
                  <span className="text-[#1A2F0D]">FSSAI Certified Facility</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <img 
                src="https://images.unsplash.com/photo-1707721690626-10e5f0366bcb?w=400" 
                alt="Farmer group"
                className="rounded-2xl object-cover w-full h-48"
              />
              <img 
                src="https://images.unsplash.com/photo-1676619357571-b4f086f81299?w=400" 
                alt="Grains"
                className="rounded-2xl object-cover w-full h-48"
              />
              <img 
                src="https://images.unsplash.com/photo-1509358740172-f77c168f6312?w=400" 
                alt="Spices"
                className="rounded-2xl object-cover w-full h-48"
              />
              <img 
                src="https://images.unsplash.com/photo-1708521203160-2a1e7c8f774a?w=400" 
                alt="Seeds"
                className="rounded-2xl object-cover w-full h-48"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CMS About Gallery */}
      {aboutImages.length > 1 && (
        <section className="section-padding bg-[#EBE1C5]">
          <div className="container-krishi">
            <div className="text-center mb-8">
              <span className="label-accent">Our Journey</span>
              <h2 className="heading-h2 mt-2">Behind The Scenes</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {aboutImages.slice(1).map(img => (
                <div key={img.id} className="aspect-video rounded-2xl overflow-hidden">
                  <img src={aboutImgUrl(img.id)} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding bg-[#EBE1C5]">
        <div className="container-krishi text-center">
          <h2 className="heading-h2 mb-6">Experience Pure Tradition</h2>
          <p className="text-[#4A5D3F] mb-8 max-w-2xl mx-auto">
            Join over 10,000 families who have made the switch to pure, 
            traditional food products from Krishi.
          </p>
          <Link to="/collections/cold-pressed-oils" className="btn-primary">
            Shop Now
          </Link>
        </div>
      </section>
    </div>
    </>
  );
};

export default AboutPage;
