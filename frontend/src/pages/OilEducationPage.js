import React from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import SEO from '../components/SEO';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const OilEducationPage = () => {
  const { images: oilImages, imgUrl: oilImgUrl } = usePageImages('oil');
  const { videos: oilVideos, vidUrl: oilVidUrl } = usePageVideos('oil');

  const oils = [
    { name: 'Groundnut Oil', benefits: ['High smoke point', 'Heart-healthy fats', 'Rich in Vitamin E'], uses: 'Deep frying, everyday cooking', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300' },
    { name: 'Coconut Oil', benefits: ['Boosts immunity', 'Natural moisturizer', 'Antimicrobial'], uses: 'South Indian cooking, baking, hair care', image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300' },
    { name: 'Gingelly (Sesame) Oil', benefits: ['Rich in antioxidants', 'Skin nourishing', 'Traditional flavor'], uses: 'Tempering, pickles, massage', image: 'https://images.unsplash.com/photo-1612187715738-2cb7b935e35e?w=300' },
    { name: 'Mustard Oil', benefits: ['Antibacterial', 'Improves digestion', 'Natural preservative'], uses: 'Bengali & North Indian cooking, pickles', image: 'https://images.unsplash.com/photo-1599451897608-71ae0ae4d0d3?w=300' },
    { name: 'Flaxseed Oil', benefits: ['Highest Omega-3', 'Anti-inflammatory', 'Brain health'], uses: 'Salad dressings, smoothies (not for cooking)', image: 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=300' },
    { name: 'Sunflower Oil', benefits: ['Light texture', 'High in Vitamin E', 'Good for heart'], uses: 'Light cooking, baking', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=300' },
  ];

  const faqs = [
    {
      question: 'What is cold pressing?',
      answer: 'Cold pressing is a traditional method of extracting oil using a wooden press (ghani/chekku) at low temperatures, typically below 50°C. This preserves the natural nutrients, flavor, and color of the oil unlike refined oils that use high heat and chemicals.'
    },
    {
      question: 'Why is cold pressed oil better than refined oil?',
      answer: 'Cold pressed oils retain all their natural antioxidants, vitamins, and essential fatty acids. Refined oils lose most nutrients during processing and may contain traces of chemical solvents used in extraction.'
    },
    {
      question: 'How should I store cold pressed oils?',
      answer: 'Store in a cool, dark place away from direct sunlight. Use within 6 months of opening. Glass bottles or food-grade containers are best. Refrigeration is not necessary but can extend shelf life.'
    },
    {
      question: 'Can I use cold pressed oil for deep frying?',
      answer: 'Yes! Groundnut and coconut oil have high smoke points suitable for deep frying. However, we recommend using them at moderate temperatures to preserve nutrients. Oils like flaxseed should not be heated.'
    },
    {
      question: 'Why does cold pressed oil look different from regular oil?',
      answer: 'Cold pressed oils retain their natural color and may appear darker or cloudier than refined oils. This is a sign of authenticity - the oil hasn\'t been bleached or stripped of its natural properties.'
    },
    {
      question: 'Is cold pressed oil suitable for all cooking?',
      answer: 'Different oils suit different purposes. Groundnut and coconut are versatile for most cooking. Gingelly is perfect for tempering. Flaxseed should only be consumed raw. Check each oil\'s smoke point before use.'
    }
  ];

  const comparison = [
    { aspect: 'Extraction Method', coldPressed: 'Traditional wooden press at room temperature', refined: 'Chemical solvents, high heat (200°C+)' },
    { aspect: 'Nutrients', coldPressed: 'All vitamins & antioxidants preserved', refined: 'Most nutrients destroyed' },
    { aspect: 'Chemicals Used', coldPressed: 'None - 100% natural', refined: 'Hexane, bleaching agents, deodorants' },
    { aspect: 'Taste & Aroma', coldPressed: 'Natural, authentic, rich flavor', refined: 'Bland, odorless' },
    { aspect: 'Color', coldPressed: 'Natural golden/amber', refined: 'Artificially clear/pale' },
    { aspect: 'Shelf Life', coldPressed: '6-12 months', refined: '2+ years (with preservatives)' },
    { aspect: 'Price', coldPressed: 'Higher (premium quality)', refined: 'Lower (mass produced)' },
  ];

  const oilSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Krishi Foods – Oil Education",
    "url": "https://www.krishifoods.in/pages/oil",
    "description": "Learn about cold-pressed oils, their health benefits, smoke points, and the difference from refined oils.",
    "teaches": "Cold-pressed oil extraction, nutritional benefits of traditional oils, oil selection guide"
  };

  return (
    <>
    <SEO
      title="Cold-Pressed Oil Education – Benefits, Uses & Guide"
      description="Learn everything about cold-pressed oils – what they are, how they're made, their health benefits, smoke points, and which oil to use for what cooking. Complete guide by Krishi Foods."
      canonical="/pages/oil"
      schema={oilSchema}
    />
    <div className="bg-[#F5EDD6]" data-testid="oil-education-page">
      {/* CMS Oil Banner */}
      {(oilImages.length > 0 || oilVideos.length > 0) && (
        <section className="relative h-64 md:h-80 overflow-hidden">
          {oilVideos.length > 0 ? (
            <video src={oilVidUrl(oilVideos[0].id)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={oilImgUrl(oilImages[0].id)} alt="Oil Education" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[#1A2F0D]/60 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white text-center px-4" style={{ fontFamily: 'Playfair Display, serif' }}>The Science of Cold Pressing</h1>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative py-20 md:py-28 bg-[#2D5016]">
        <div className="container-krishi text-center">
          <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#C8602B]">Learn</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            The Complete Guide to<br />Cold Pressed Oils
          </h1>
          <p className="text-[#F5EDD6]/80 max-w-2xl mx-auto">
            Everything you need to know about traditional oils – types, benefits, 
            uses, and why they're better for your health.
          </p>
        </div>
      </section>

      {/* What is Cold Pressing */}
      <section className="section-padding">
        <div className="container-krishi">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="label-accent">The Basics</span>
              <h2 className="heading-h2 mt-2 mb-6">What is Cold Pressing?</h2>
              <div className="space-y-4 text-[#4A5D3F]">
                <p>
                  Cold pressing is an ancient oil extraction method that uses mechanical 
                  pressure to squeeze oil from seeds and nuts. Unlike modern industrial 
                  methods, no external heat or chemical solvents are used.
                </p>
                <p>
                  The traditional wooden press (called "ghani" in Hindi or "chekku" in 
                  Tamil) rotates slowly, creating gentle friction that keeps temperatures 
                  below 50°C – hence "cold" pressed.
                </p>
                <p>
                  This low-temperature process ensures that all the natural nutrients, 
                  antioxidants, and flavors remain intact in the final oil.
                </p>
              </div>
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1709293287084-544575bb1398?w=600" 
                alt="Cold pressing process"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="section-padding bg-white">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">Know The Difference</span>
            <h2 className="heading-h2 mt-2">Cold Pressed vs Refined</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b-2 border-[#2D5016]/20">
                  <th className="text-left py-4 px-4 font-semibold text-[#1A2F0D]">Aspect</th>
                  <th className="text-left py-4 px-4 font-semibold text-[#2D5016] bg-[#2D5016]/5">Cold Pressed</th>
                  <th className="text-left py-4 px-4 font-semibold text-red-600">Refined</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#2D5016]/10">
                    <td className="py-4 px-4 font-medium text-[#1A2F0D]">{row.aspect}</td>
                    <td className="py-4 px-4 bg-[#2D5016]/5">
                      <span className="flex items-start gap-2 text-[#2D5016]">
                        <Check size={18} className="mt-0.5 flex-shrink-0" /> {row.coldPressed}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="flex items-start gap-2 text-red-600">
                        <X size={18} className="mt-0.5 flex-shrink-0" /> {row.refined}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Oil Types */}
      <section className="section-padding">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">Types</span>
            <h2 className="heading-h2 mt-2">Popular Cold Pressed Oils</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {oils.map((oil, idx) => (
              <div key={idx} className="card-krishi">
                <div className="aspect-video rounded-xl overflow-hidden mb-4">
                  <img 
                    src={oil.image} 
                    alt={oil.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="heading-h3 mb-3">{oil.name}</h3>
                <div className="mb-4">
                  <p className="text-sm font-medium text-[#1A2F0D] mb-2">Benefits:</p>
                  <ul className="space-y-1">
                    {oil.benefits.map((benefit, i) => (
                      <li key={i} className="text-sm text-[#4A5D3F] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#C8602B] rounded-full"></span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-[#4A5D3F]">
                  <span className="font-medium text-[#1A2F0D]">Best for:</span> {oil.uses}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section-padding bg-[#EBE1C5]">
        <div className="container-krishi">
          <div className="text-center mb-12">
            <span className="label-accent">FAQ</span>
            <h2 className="heading-h2 mt-2">Common Questions</h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, idx) => (
                <AccordionItem 
                  key={idx} 
                  value={`faq-${idx}`}
                  className="bg-white rounded-2xl px-6 border-none"
                >
                  <AccordionTrigger className="text-left font-semibold text-[#1A2F0D] hover:text-[#2D5016] hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#4A5D3F] pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CMS Oil Gallery */}
      {oilImages.length > 1 && (
        <section className="section-padding bg-white">
          <div className="container-krishi">
            <div className="text-center mb-8">
              <span className="label-accent">Our Process</span>
              <h2 className="heading-h2 mt-2">Cold Pressing In Action</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {oilImages.slice(1).map(img => (
                <div key={img.id} className="aspect-video rounded-2xl overflow-hidden">
                  <img src={oilImgUrl(img.id)} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-padding bg-[#2D5016]">
        <div className="container-krishi text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ready to Make the Switch?
          </h2>
          <p className="text-[#F5EDD6]/80 mb-8 max-w-2xl mx-auto">
            Experience the authentic taste and health benefits of traditional cold-pressed oils.
          </p>
          <Link to="/collections/cold-pressed-oils" className="btn-accent">
            Shop Cold Pressed Oils <ArrowRight className="ml-2" size={18} />
          </Link>
        </div>
      </section>
    </div>
    </>
  );
};

export default OilEducationPage;
