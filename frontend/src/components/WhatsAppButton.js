import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
  return (
    <a
        href="https://wa.me/916361558094?text=Hi%20Krishi!%20I%20have%20a%20question."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-[#20ba5a] transition-all duration-300 hover:scale-110"
      data-testid="whatsapp-floating-btn"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={24} fill="white" className="md:w-7 md:h-7" />
    </a>
  );
};

export default WhatsAppButton;
