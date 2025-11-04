
import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { User } from '../types';

// NOTE: In a real application, passwords should be hashed.
// This is a simplified frontend-only simulation.
type StoredUser = User & {
  password: string; // Plain text for simulation
};

export const useAuth = () => {
  const [users, setUsers] = useLocalStorage<StoredUser[]>('crm_users', []);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Check session storage on initial load
    try {
      const userJson = sessionStorage.getItem('crm_currentUser');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email: string, password: string): { success: boolean, error?: string } => {
    const user = users.find(u => u.email === email);
    if (user && user.password === password) {
      const { password, ...userToStore } = user;
      setCurrentUser(userToStore);
      sessionStorage.setItem('crm_currentUser', JSON.stringify(userToStore));
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password.' };
  }, [users]);

  const signup = useCallback((email: string, password: string): { success: boolean, error?: string } => {
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'User with this email already exists.' };
    }

    const newUser: StoredUser = { email, password };
    setUsers(prevUsers => [...prevUsers, newUser]);
    
    const { password: _, ...userToStore } = newUser;
    setCurrentUser(userToStore);
    sessionStorage.setItem('crm_currentUser', JSON.stringify(userToStore));
    
    return { success: true };
  }, [users, setUsers]);
  
  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('crm_currentUser');
  }, []);

  return { 
    user: currentUser, 
    login, 
    signup, 
    logout 
  };
};