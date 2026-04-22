import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';

const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('krishi_exit_intent_popup');
    if (hasSeenPopup) return;

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        setIsOpen(true);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('krishi_exit_intent_popup', 'true');
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
      <DialogContent className="sm:max-w-md bg-[#2D5016] border-none" data-testid="exit-intent-popup">
        <DialogTitle className="sr-only">Exit Intent Discount</DialogTitle>
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-[#F5EDD6] hover:text-white transition-colors"
          data-testid="exit-popup-close"
        >
          <X size={24} />
        </button>
        
        <div className="text-center py-6">
          {!submitted ? (
            <>
              <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#C8602B]">Wait!</span>
              <h2 className="text-3xl font-bold text-white mt-2 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Don't Leave Empty Handed
              </h2>
              <p className="text-[#F5EDD6]/80 mb-6">
                Get 8% off your first order when you subscribe to our newsletter!
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#C8602B]"
                  required
                  data-testid="exit-popup-email"
                />
                <button type="submit" className="btn-accent w-full" data-testid="exit-popup-submit">
                  Claim My 8% Off
                </button>
              </form>
              
              <button 
                onClick={handleClose}
                className="text-[#F5EDD6]/60 text-sm mt-4 hover:text-white transition-colors"
              >
                No thanks, I'll pay full price
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#C8602B] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Check Your Inbox!
              </h2>
              <p className="text-[#F5EDD6]/80">
                Your code <span className="font-bold text-[#C8602B]">WELCOME8</span> is on its way!
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
