import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'broker' | 'customer';
  status: 'pending' | 'active' | 'denied';
  password?: string; // For mock login
  lastLogin?: string;
  performance?: {
    conversionRate: number; // Percentage
    responseTime: string; // e.g. "2h"
  };
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, role: 'admin' | 'manager' | 'broker' | 'customer', password?: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, password?: string, role?: 'broker' | 'customer') => void;
  approveBroker: (id: string) => void;
  denyBroker: (id: string) => void;
  updateUser: (id: string, data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock Users
  const [users, setUsers] = useState<User[]>([
    { 
      id: 'admin1', 
      name: 'Account Manager', 
      email: 'admin@quoteus.ca', 
      role: 'admin', 
      status: 'active', 
      password: 'password123',
      phone: '416-555-0100',
      lastLogin: new Date().toISOString()
    },
    { 
      id: 'manager1', 
      name: 'Sales Director', 
      email: 'manager@quoteus.ca', 
      role: 'manager', 
      status: 'active', 
      password: 'password123',
      phone: '416-555-0101',
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
      performance: { conversionRate: 0, responseTime: 'N/A' }
    },
    { 
      id: 'broker1', 
      name: 'John Broker', 
      email: 'john@quoteus.ca', 
      role: 'broker', 
      status: 'active', 
      password: 'password123',
      phone: '416-555-0102',
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
      performance: { conversionRate: 15, responseTime: '2h' }
    },
    { 
      id: 'broker2', 
      name: 'Sarah Agent', 
      email: 'sarah@quoteus.ca', 
      role: 'broker', 
      status: 'pending', 
      password: 'password123',
      phone: '416-555-0103',
      lastLogin: undefined,
      performance: { conversionRate: 0, responseTime: 'N/A' }
    },
    { 
      id: 'customer1', 
      name: 'John Doe', 
      email: 'john@example.com', 
      role: 'customer', 
      status: 'active', 
      password: 'password123',
      phone: '416-555-0199',
      lastLogin: new Date(Date.now() - 7200000).toISOString()
    },
  ]);

  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: 'admin' | 'manager' | 'broker' | 'customer', password?: string) => {
    // Simple mock login: check if email exists and matches role and password
    
    // For customers, we might be lenient with role check if they try to login via generic form
    const foundUser = users.find(u => u.email === email && (u.role === role || (role === 'customer' && u.role === 'customer')));
    
    if (foundUser) {
      if (password && foundUser.password && password !== foundUser.password) {
        return false;
      }

      if (foundUser.status !== 'active') {
         alert("Your account is pending approval.");
         return false;
      }
      
      // Update last login
      const updatedUser = { ...foundUser, lastLogin: new Date().toISOString() };
      updateUser(foundUser.id, { lastLogin: updatedUser.lastLogin });
      setUser(updatedUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const register = (name: string, email: string, password?: string, role: 'broker' | 'customer' = 'broker') => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role,
      status: role === 'customer' ? 'active' : 'pending', // Customers are active immediately
      password,
      lastLogin: undefined
    };
    setUsers([...users, newUser]);
  };

  const approveBroker = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'active' } : u));
  };

  const denyBroker = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'denied' } : u));
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    if (user && user.id === id) {
      setUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, users, login, logout, register, approveBroker, denyBroker, updateUser }}>
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
