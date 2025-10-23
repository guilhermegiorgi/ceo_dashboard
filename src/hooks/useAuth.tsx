import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  tenant_id?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if token exists
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      console.log('🔑 [useAuth] Token exists:', !!token);
      
      if (!token) {
        console.warn('⚠️ [useAuth] No token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }
      
      console.log('🚀 [useAuth] Fetching user data...');
      
      // Use the getCurrentUser method from apiClient
      const userData = await apiClient.getCurrentUser();
      
      console.log('✅ [useAuth] User data received:', userData);
      
      if (userData) {
        setUser(userData);
      }
    } catch (err: any) {
      console.error('❌ [useAuth] Error fetching user:', err);
      setError(err.message || 'Erro ao carregar usuário');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
      // Force logout even if API fails
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    refetch: fetchUser,
    logout
  };
}
