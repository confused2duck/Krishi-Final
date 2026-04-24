import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube } from 'lucide-react';

const Footer = () => {
  const logoUrl = '/images/branding/krishi-logo.png';
  const collections = [
    { name: 'Cold Pressed Oils', slug: 'cold-pressed-oils' },
    { name: 'Traditional Rices', slug: 'traditional-rices' },
    { name: 'Unpolished Millets', slug: 'unpolished-millets' },
    { name: 'Ghee & Honey', slug: 'ghee-honey' },
    { name: 'Spices', slug: 'spices' },
    { name: 'Chikkis', slug: 'chikkis' },
  ];

  const quickLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Build Combo', path: '/bundle' },
    { name: 'Oil Education', path: '/pages/oil' },
    { name: 'Blog', path: '/blogs/news' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <footer className="bg-[#2D5016] text-[#F5EDD6]" data-testid="main-footer">
      <div className="container-krishi py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" data-testid="footer-logo-link">
              {logoUrl ? (
                <img src={logoUrl} alt="Krishi" className="h-12 md:h-14 w-auto" />
              ) : (
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Krishi
                </h3>
              )}
            </Link>
            <p className="text-[#F5EDD6]/80 text-sm leading-relaxed">
              Pure. Cold Pressed. Chemical-Free. We bring traditional goodness from Indian farms directly to your kitchen.
            </p>
            <div className="flex space-x-4 pt-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8602B] transition-colors" data-testid="social-instagram">
                <Instagram size={20} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8602B] transition-colors" data-testid="social-facebook">
                <Facebook size={20} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C8602B] transition-colors" data-testid="social-youtube">
                <Youtube size={20} />
              </a>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Collections
            </h4>
            <ul className="space-y-3">
              {collections.map((col) => (
                <li key={col.slug}>
                  <Link 
                    to={`/collections/${col.slug}`} 
                    className="text-[#F5EDD6]/80 hover:text-[#C8602B] transition-colors text-sm"
                    data-testid={`footer-${col.slug}`}
                  >
                    {col.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path} 
                    className="text-[#F5EDD6]/80 hover:text-[#C8602B] transition-colors text-sm"
                    data-testid={`footer-link-${link.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              Contact Us
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Phone size={18} className="mt-0.5 text-[#C8602B]" />
                <div>
                  <a href="tel:06361558094" className="text-[#F5EDD6]/80 hover:text-white transition-colors text-sm">
                    06361558094
                  </a>
                  <p className="text-[#F5EDD6]/60 text-xs">WhatsApp Available</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <Mail size={18} className="mt-0.5 text-[#C8602B]" />
                <a href="mailto:hello@krishi.com" className="text-[#F5EDD6]/80 hover:text-white transition-colors text-sm">
                  hello@krishi.com
                </a>
              </li>
              <li className="flex items-start space-x-3">
                <MapPin size={18} className="mt-0.5 text-[#C8602B]" />
                <p className="break-words text-[#F5EDD6]/80 text-sm">
                  Krishi cold pressed 105, 2nd Main Rd, RHCS Layout,<br />
                  Annapoorneshwari Nagar, Nagarabhavi, Bangalore - 560091<br />
                  <span className="block mt-2">
                    36/2, Kenchena Halli Rd, Hemmigepura Ward 198,<br />
                    Rajarajeshwari Nagar, Bengaluru, Karnataka 560098
                  </span>
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-[#F5EDD6]/20">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-[#F5EDD6]/60">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#C8602B] rounded-full"></span>
              FSSAI Certified
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#C8602B] rounded-full"></span>
              100% Natural
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#C8602B] rounded-full"></span>
              No Chemicals
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#C8602B] rounded-full"></span>
              Secure Payments
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-[#F5EDD6]/20 text-center">
          <p className="text-[#F5EDD6]/60 text-sm">
            Copyright {new Date().getFullYear()} Krishi Cold Pressed Oils. All rights reserved.
          </p>
          <p className="mt-2 text-[#F5EDD6]/60 text-sm">
            Designed and Developed by{' '}
            <a
              href="https://junaix.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F5EDD6] hover:text-[#C8602B] transition-colors"
            >
              JunaiX
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
