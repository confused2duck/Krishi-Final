import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "./components/ui/sonner";

// Layout Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import FirstOrderPopup from "./components/FirstOrderPopup";
import ExitIntentPopup from "./components/ExitIntentPopup";

// Pages
import HomePage from "./pages/HomePage";
import CollectionPage from "./pages/CollectionPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import BundleBuilderPage from "./pages/BundleBuilderPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import ContactPage from "./pages/ContactPage";
import OilEducationPage from "./pages/OilEducationPage";

// Admin Pages
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import BlogListPage from "./pages/admin/BlogListPage";
import BlogEditorPage from "./pages/admin/BlogEditorPage";
import ProductsPage from "./pages/admin/ProductsPage";
import OrdersPage from "./pages/admin/OrdersPage";
import CustomersPage from "./pages/admin/CustomersPage";
import ContactsPage from "./pages/admin/ContactsPage";
import ImagesPage from "./pages/admin/ImagesPage";

// Analytics placeholder component
const AnalyticsScripts = () => {
  // GTM Container placeholder - replace YOUR_GTM_ID with actual GTM container ID
  React.useEffect(() => {
    // Google Tag Manager placeholder
    const gtmScript = document.createElement('script');
    gtmScript.innerHTML = `
      // GTM Placeholder - Replace with actual GTM container
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      // gtag('config', 'YOUR_GTM_ID');
    `;
    document.head.appendChild(gtmScript);

    // Meta Pixel placeholder
    const metaScript = document.createElement('script');
    metaScript.innerHTML = `
      // Meta Pixel Placeholder - Replace with actual Pixel ID
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      // fbq('init', 'YOUR_PIXEL_ID');
      // fbq('track', 'PageView');
    `;
    document.head.appendChild(metaScript);
  }, []);

  return null;
};

// Layout wrapper for pages with header/footer
const MainLayout = ({ children }) => (
  <>
    <Header />
    <main>{children}</main>
    <Footer />
    <WhatsAppButton />
    <FirstOrderPopup />
    <ExitIntentPopup />
  </>
);

// Auth layout without header/footer
const AuthLayout = ({ children }) => (
  <main>{children}</main>
);

// Admin protected route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AnalyticsScripts />
          <Toaster position="top-center" richColors />
          <Routes>
            {/* Auth routes without header/footer */}
            <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
            
            {/* Main routes with header/footer */}
            <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
            <Route path="/collections/:slug" element={<MainLayout><CollectionPage /></MainLayout>} />
            <Route path="/products/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />
            <Route path="/cart" element={<MainLayout><CartPage /></MainLayout>} />
            <Route path="/bundle" element={<MainLayout><BundleBuilderPage /></MainLayout>} />
            <Route path="/account" element={<MainLayout><AccountPage /></MainLayout>} />
            <Route path="/account/orders" element={<MainLayout><AccountPage /></MainLayout>} />
            <Route path="/account/subscriptions" element={<MainLayout><AccountPage /></MainLayout>} />
            <Route path="/about" element={<MainLayout><AboutPage /></MainLayout>} />
            <Route path="/blogs/news" element={<MainLayout><BlogPage /></MainLayout>} />
            <Route path="/blogs/news/:slug" element={<MainLayout><BlogPage /></MainLayout>} />
            <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
            <Route path="/pages/oil" element={<MainLayout><OilEducationPage /></MainLayout>} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/blog" element={<AdminRoute><BlogListPage /></AdminRoute>} />
            <Route path="/admin/blog/new" element={<AdminRoute><BlogEditorPage /></AdminRoute>} />
            <Route path="/admin/blog/edit/:slug" element={<AdminRoute><BlogEditorPage /></AdminRoute>} />
            <Route path="/admin/products" element={<AdminRoute><ProductsPage /></AdminRoute>} />
            <Route path="/admin/orders" element={<AdminRoute><OrdersPage /></AdminRoute>} />
            <Route path="/admin/customers" element={<AdminRoute><CustomersPage /></AdminRoute>} />
            <Route path="/admin/contacts" element={<AdminRoute><ContactsPage /></AdminRoute>} />
            <Route path="/admin/images" element={<AdminRoute><ImagesPage /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<MainLayout><HomePage /></MainLayout>} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
