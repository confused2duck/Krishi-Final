import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../lib/api';
import { calculateOilOfferDiscount } from '../lib/utils';

const API = API_BASE_URL;

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!user) {
      const localCart = localStorage.getItem('krishi_cart');
      if (localCart) {
        try { setCart(JSON.parse(localCart)); } catch (_) {}
      }
      return;
    }
    try {
      const response = await axios.get(`${API}/api/cart`);
      setCart(response.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (item) => {
    setLoading(true);
    try {
      if (user) {
        const response = await axios.post(`${API}/api/cart/add`, item);
        setCart(response.data);
      } else {
        const newItems = [...cart.items];
        const existingIndex = newItems.findIndex(
          i => i.product_id === item.product_id && i.size === item.size
        );
        if (existingIndex >= 0) {
          newItems[existingIndex].quantity += item.quantity;
        } else {
          newItems.push(item);
        }
        const newCart = {
          items: newItems,
          subtotal: newItems.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0),
          discount: calculateOilOfferDiscount(newItems),
          total: 0
        };
        newCart.total = newCart.subtotal - newCart.discount;
        setCart(newCart);
        localStorage.setItem('krishi_cart', JSON.stringify(newCart));
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCart = async (items) => {
    setLoading(true);
    try {
      if (user) {
        const response = await axios.post(`${API}/api/cart`, { items });
        setCart(response.data);
      } else {
        const newCart = {
          items,
          subtotal: items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0),
          discount: calculateOilOfferDiscount(items),
          total: 0
        };
        newCart.total = newCart.subtotal - newCart.discount;
        setCart(newCart);
        localStorage.setItem('krishi_cart', JSON.stringify(newCart));
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId, size) => {
    const newItems = cart.items.filter(
      item => !(item.product_id === productId && item.size === size)
    );
    await updateCart(newItems);
  };

  const clearCart = () => {
    setCart({ items: [], subtotal: 0, discount: 0, total: 0 });
    localStorage.removeItem('krishi_cart');
  };

  const cartItemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateCart,
      removeFromCart,
      clearCart,
      fetchCart,
      cartItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
