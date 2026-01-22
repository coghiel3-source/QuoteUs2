import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'broker' | 'customer';
  status: 'pending' | 'active' | 'denied' | 'paused' | 'cancelled';
  password?: string;
  balance?: string;
  stripeCustomerId?: string;
  createdAt?: string;
  lastLogin?: string;
  performance?: {
    conversionRate: number;
    responseTime: string;
  };
}

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (email: string, role: 'admin' | 'manager' | 'broker' | 'customer', password?: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password?: string, role?: 'broker' | 'customer' | 'manager' | 'admin', phone?: string) => Promise<void>;
  approveBroker: (id: string) => Promise<void>;
  denyBroker: (id: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  resetPassword: (id: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  // Seed database with initial users
  const seedUsers = async () => {
    try {
      const initialUsers = [
        { 
          name: 'Account Manager', 
          email: 'admin@quoteus.ca', 
          role: 'admin' as const, 
          status: 'active' as const, 
          password: 'password123',
          phone: '416-555-0100',
        },
        { 
          name: 'Sales Director', 
          email: 'manager@quoteus.ca', 
          role: 'manager' as const, 
          status: 'active' as const, 
          password: 'password123',
          phone: '416-555-0101',
        },
        { 
          name: 'John Broker', 
          email: 'john@quoteus.ca', 
          role: 'broker' as const, 
          status: 'active' as const, 
          password: 'password123',
          phone: '416-555-0102',
        },
        { 
          name: 'Sarah Agent', 
          email: 'sarah@quoteus.ca', 
          role: 'broker' as const, 
          status: 'pending' as const, 
          password: 'password123',
          phone: '416-555-0103',
        },
      ];

      for (const userData of initialUsers) {
        try {
          await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(userData),
          });
        } catch (e) {
          // User might already exist, skip
        }
      }
      setSeeded(true);
      localStorage.setItem('quoteus_seeded', 'true');
    } catch (error) {
      console.error('Failed to seed users:', error);
    }
  };

  // Fetch all users from API
  const fetchUsers = async () => {
    try {
      const data = await apiRequest<User[]>('/users');
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      // Check if we've seeded the database
      const hasSeeded = localStorage.getItem('quoteus_seeded');
      if (!hasSeeded) {
        await seedUsers();
      }
      await fetchUsers();
    };

    initializeAuth();
  }, []);

  const login = async (email: string, role: 'admin' | 'manager' | 'broker' | 'customer', password?: string): Promise<boolean> => {
    try {
      const foundUser = await apiRequest<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });

      if (!foundUser) {
        return false;
      }

      // Check password (simple mock check)
      if (password && foundUser.password && password !== foundUser.password) {
        return false;
      }

      if (foundUser.status !== 'active') {
        if (foundUser.status === 'paused') {
          alert("Your account has been temporarily paused. Please contact your administrator.");
          return false;
        }
        if (foundUser.status === 'cancelled' || foundUser.status === 'denied') {
          alert("Your account has been deactivated.");
          return false;
        }
        alert("Your account is pending approval.");
        return false;
      }

      setUser(foundUser);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const register = async (name: string, email: string, password?: string, role: 'broker' | 'customer' | 'manager' | 'admin' = 'broker', phone?: string) => {
    try {
      const newUser = await apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone,
          role,
          status: role === 'customer' ? 'active' : 'pending',
          password,
        }),
      });
      setUsers([...users, newUser]);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const approveBroker = async (id: string) => {
    try {
      const updated = await apiRequest<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      setUsers(users.map(u => u.id === id ? updated : u));
    } catch (error) {
      console.error('Failed to approve broker:', error);
    }
  };

  const denyBroker = async (id: string) => {
    try {
      const updated = await apiRequest<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'denied' }),
      });
      setUsers(users.map(u => u.id === id ? updated : u));
    } catch (error) {
      console.error('Failed to deny broker:', error);
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    try {
      const updated = await apiRequest<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      if (user && user.id === id) {
        setUser(updated);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const resetPassword = async (id: string, newPassword: string) => {
    try {
      await apiRequest(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword }),
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPassword } : u));
    } catch (error) {
      console.error('Failed to reset password:', error);
    }
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const updated = await apiRequest<User>(`/users/${user.id}`);
      setUser(updated);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, users, loading, login, logout, register, approveBroker, denyBroker, updateUser, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
