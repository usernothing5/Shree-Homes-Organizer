import { useState, useCallback, useEffect } from 'react';
import { User } from '../types';

// In a real app, this would involve a library like Firebase Auth or an OAuth flow.
// For this example, we'll simulate it using localStorage.

const FAKE_USER: User = { email: 'user@example.com' };
const AUTH_KEY = 'crm-auth-user';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = window.localStorage.getItem(AUTH_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to read user from localStorage", error);
    } finally {
        setLoading(false);
    }
  }, []);

  const signIn = useCallback(() => {
    try {
      // Simulate a successful Google sign-in
      const loggedInUser = FAKE_USER;
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
    } catch (error) {
      console.error("Failed to save user to localStorage", error);
    }
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(AUTH_KEY);
      setUser(null);
    } catch (error) {
      console.error("Failed to remove user from localStorage", error);
    }
  }, []);

  return { user, loading, signIn, signOut };
};
