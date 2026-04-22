import React, { useState } from 'react';
import axios from 'axios';
import { Phone, Mail, MapPin, MessageCircle, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { usePageImages, usePageVideos } from '../hooks/usePageMedia';

const API = process.env.REACT_APP_BACKEND_URL || "";

const ContactPage = () => {
  const getText = (_key, fallback = '') => fallback;
  const getImage = (_key, fallback = '') => fallback;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);

  const { images: contactImages, imgUrl: contactImgUrl } = usePageImages('contact');
  const { videos: contactVideos, vidUrl: contactVidUrl } = usePageVideos('contact');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/api/contact`, formData);
      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPincode = async () => {
    try {
      const response = await axios.post(`${API}/api/check-pincode`, { pincode });
      setPincodeResult(response.data);
    } catch (error) {
      setPincodeResult({ serviceable: false, message: 'Invalid pincode' });
    }
  };

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact Krishi Foods",
    "url": "https://www.krishifoods.in/contact",
    "description": "Get in touch with Krishi Foods via WhatsApp, phone, or email. Check delivery availability for your pincode.",
    "mainEntity": {
      "@type": "Organization",
      "name": "Krishi Foods",
      "telephone": "+91-6361558094",
      "email": "hello@krishi.com",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Krishi cold pressed 105, 2nd Main Rd, RHCS Layout, Annapoorneshwari Nagar, Nagarabhavi",
        "addressLocality": "Bangalore",
        "addressRegion": "Karnataka",
        "postalCode": "560091",
        "addressCountry": "IN"
      }
    }
  };

  return (
    <>
    <SEO
      title="Contact Us - Get in Touch"
      description="Have a question about our cold-pressed oils or your order? Contact Krishi Foods via WhatsApp, phone, or email. We respond within 1 hour on WhatsApp."
      canonical="/contact"
      schema={contactSchema}
    />
    <div className="bg-[#F5EDD6] min-h-screen" data-testid="contact-page">
      {/* CMS Contact Banner */}
      {(contactImages.length > 0 || contactVideos.length > 0 || !!getImage('banner_image', '')) && (
        <section className="relative h-64 md:h-80 overflow-hidden">
          {contactVideos.length > 0 ? (
            <video src={contactVidUrl(contactVideos[0].id)} autoPlay muted loop playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={getImage('banner_image', contactImgUrl(contactImages[0].id))} alt="Contact" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-[#1A2F0D]/50 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>{getText('banner_title', 'Get In Touch')}</h1>
          </div>
        </section>
      )}

      {/* Header */}
      <div className="bg-[#2D5016] py-12 md:py-16">
        <div className="container-krishi">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
            {getText('hero_title', 'Contact Us')}
          </h1>
          <p className="text-[#F5EDD6]/80 text-center mt-2">
            {getText('hero_subtitle', "We'd love to hear from you")}
          </p>
        </div>
      </div>

      <div className="container-krishi py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div>
              <h2 className="heading-h3 mb-6">Get in Touch</h2>
              <p className="text-[#4A5D3F] mb-8">
                Have questions about our products or need help with your order? 
                We're here to help! Reach out through any of the channels below.
              </p>
            </div>

            <div className="space-y-6">
              <a 
                href="https://wa.me/916361558094" 
                target="_blank" 
                rel="noopener noreferrer"
                className="card-krishi flex items-start gap-4 hover:shadow-lg transition-shadow"
                data-testid="whatsapp-contact"
              >
                <div className="w-12 h-12 bg-[#25D366]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={24} className="text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A2F0D]">WhatsApp</h3>
                  <p className="text-[#4A5D3F]">06361558094</p>
                  <p className="text-sm text-[#C8602B]">Fastest response - within 1 hour</p>
                </div>
              </a>

              <div className="card-krishi flex items-start gap-4">
                <div className="w-12 h-12 bg-[#2D5016]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone size={24} className="text-[#2D5016]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A2F0D]">Phone</h3>
                  <p className="text-[#4A5D3F]">06361558094</p>
                  <p className="text-sm text-[#4A5D3F]">Mon-Sat, 9 AM - 6 PM IST</p>
                </div>
              </div>

              <div className="card-krishi flex items-start gap-4">
                <div className="w-12 h-12 bg-[#2D5016]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail size={24} className="text-[#2D5016]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A2F0D]">Email</h3>
                  <p className="text-[#4A5D3F]">hello@krishi.com</p>
                  <p className="text-sm text-[#4A5D3F]">We respond within 24 hours</p>
                </div>
              </div>

              <div className="card-krishi flex items-start gap-4">
                <div className="w-12 h-12 bg-[#2D5016]/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} className="text-[#2D5016]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A2F0D]">Address</h3>
                  <p className="text-[#4A5D3F]">
                    Krishi cold pressed 105, 2nd Main Rd, RHCS Layout,<br />
                    Annapoorneshwari Nagar, Nagarabhavi, Bangalore - 560091<br />
                    <span className="block mt-3">
                      36/2, Kenchena Halli Rd, Hemmigepura Ward 198,<br />
                      Rajarajeshwari Nagar, Bengaluru, Karnataka 560098
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pincode Checker */}
            <div className="card-krishi bg-[#EBE1C5]/50">
              <h3 className="font-semibold text-[#1A2F0D] mb-4">Check Delivery Availability</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter your pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="input-krishi flex-1"
                  maxLength={6}
                  data-testid="pincode-input"
                />
                <button onClick={checkPincode} className="btn-primary" data-testid="check-delivery-btn">
                  Check
                </button>
              </div>
              {pincodeResult && (
                <p className={`mt-3 flex items-center gap-2 ${pincodeResult.serviceable ? 'text-[#2D5016]' : 'text-red-600'}`}>
                  {pincodeResult.serviceable ? <Check size={16} /> : '✗'}
                  {pincodeResult.message}
                </p>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="card-krishi">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#2D5016] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={32} className="text-white" />
                </div>
                <h3 className="heading-h3 mb-4">Message Sent!</h3>
                <p className="text-[#4A5D3F] mb-6">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button 
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', phone: '', message: '' }); }}
                  className="btn-secondary"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h2 className="heading-h3 mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                      Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-krishi w-full"
                      required
                      data-testid="contact-name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                      Email *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-krishi w-full"
                      required
                      data-testid="contact-email"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-krishi w-full"
                      data-testid="contact-phone"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="input-krishi w-full resize-none"
                      required
                      data-testid="contact-message"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50"
                    data-testid="contact-submit"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ContactPage;
