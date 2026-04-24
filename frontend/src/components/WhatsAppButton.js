import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = () => {
  return (
    <a
        href="https://wa.me/916361558094?text=Hi%20Krishi!%20I%20have%20a%20question."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-[#25D366] p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#20ba5a] md:bottom-6 md:right-6 md:p-4"
      data-testid="whatsapp-floating-btn"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={20} fill="white" className="md:h-7 md:w-7" />
    </a>
  );
};

export default WhatsAppButton;
