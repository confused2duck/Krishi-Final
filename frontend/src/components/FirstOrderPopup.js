import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';

const FirstOrderPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('krishi_first_order_popup');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 10000); // 10 seconds delay
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('krishi_first_order_popup', 'true');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-[#F5EDD6] border-none" data-testid="first-order-popup">
        <DialogTitle className="sr-only">First Order Discount</DialogTitle>
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-[#2D5016] hover:text-[#1F3A0F] transition-colors"
          data-testid="popup-close"
        >
          <X size={24} />
        </button>
        
        <div className="text-center py-6">
          {!submitted ? (
            <>
              <span className="label-accent">Welcome Offer</span>
              <h2 className="heading-h2 mt-2 mb-4">Get 8% Off</h2>
              <p className="text-[#4A5D3F] mb-6">
                Subscribe to our newsletter and get 8% off on your first order!
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-krishi w-full"
                  required
                  data-testid="popup-email-input"
                />
                <button type="submit" className="btn-primary w-full" data-testid="popup-submit">
                  Get My 8% Off
                </button>
              </form>
              
              <p className="text-xs text-[#4A5D3F] mt-4">
                No spam, we promise! Unsubscribe anytime.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#2D5016] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h2 className="heading-h3 mb-2">You're In!</h2>
              <p className="text-[#4A5D3F]">
                Use code <span className="font-bold text-[#C8602B]">WELCOME8</span> at checkout
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FirstOrderPopup;
