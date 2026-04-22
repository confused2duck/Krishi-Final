import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      await register(name, email, password, phone);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(typeof message === 'string' ? message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SEO
      title="Create Your Account"
      description="Join Krishi Foods and get access to exclusive member deals, order tracking, and Subscribe & Save on pure cold-pressed oils and traditional Indian foods."
      canonical="/register"
      noindex={true}
    />
    <div className="bg-[#F5EDD6] min-h-screen flex items-center justify-center py-12 px-4" data-testid="register-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-[#2D5016]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Krishi
            </span>
          </Link>
          <h1 className="heading-h2 mt-6 mb-2">Create Account</h1>
          <p className="text-[#4A5D3F]">Join the Krishi family today</p>
        </div>

        <form onSubmit={handleSubmit} className="card-krishi">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-krishi w-full"
                placeholder="Your full name"
                required
                data-testid="register-name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-krishi w-full"
                placeholder="you@example.com"
                required
                data-testid="register-email"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-krishi w-full"
                    placeholder="06361558094"
                data-testid="register-phone"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-krishi w-full pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5D3F]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1A2F0D] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-krishi w-full"
                placeholder="••••••••"
                required
                data-testid="register-confirm-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
              data-testid="register-submit"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-xs text-center text-[#4A5D3F]">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-[#C8602B] hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-[#C8602B] hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </form>

        <p className="text-center mt-6 text-[#4A5D3F]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#C8602B] font-medium hover:underline" data-testid="login-link">
            Login
          </Link>
        </p>
      </div>
    </div>
    </>
  );
};

export default RegisterPage;
