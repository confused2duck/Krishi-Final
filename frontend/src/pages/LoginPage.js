import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(typeof message === 'string' ? message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <SEO
      title="Login to Your Account"
      description="Sign in to your Krishi Foods account to track orders, manage subscriptions, and enjoy a personalised shopping experience."
      canonical="/login"
      noindex={true}
    />
    <div className="bg-[#F5EDD6] min-h-screen flex items-center justify-center py-12 px-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-[#2D5016]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Krishi
            </span>
          </Link>
          <h1 className="heading-h2 mt-6 mb-2">Welcome Back</h1>
          <p className="text-[#4A5D3F]">Login to access your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card-krishi">
          <div className="space-y-4">
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
                data-testid="login-email"
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
                  data-testid="login-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-[#2D5016]/20" />
                <span className="text-sm text-[#4A5D3F]">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-[#C8602B] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
              data-testid="login-submit"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <p className="text-center mt-6 text-[#4A5D3F]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#C8602B] font-medium hover:underline" data-testid="register-link">
            Create Account
          </Link>
        </p>
      </div>
    </div>
    </>
  );
};

export default LoginPage;
