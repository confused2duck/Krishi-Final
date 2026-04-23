import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.role !== 'admin') {
        toast.error('Access denied. Admin accounts only.');
        return;
      }
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A2F0D] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/images/branding/krishi-logo.png" alt="Krishi" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A2F0D]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Admin CMS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage your website</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="admin@krishi.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/40 focus:border-[#2D5016]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016]/40 focus:border-[#2D5016]"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D5016] text-white py-3 rounded-lg font-medium hover:bg-[#1F3A0F] transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Default: admin@krishi.com / admin123
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
