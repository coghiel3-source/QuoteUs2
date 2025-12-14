import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'broker';
  status: 'pending' | 'active' | 'denied';
  password?: string; // For mock login
}

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, role: 'admin' | 'broker', password?: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, password?: string) => void;
  approveBroker: (id: string) => void;
  denyBroker: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock Users
  const [users, setUsers] = useState<User[]>([
    { id: 'admin1', name: 'Account Manager', email: 'admin@quoteus.ca', role: 'admin', status: 'active', password: 'password123' },
    { id: 'broker1', name: 'John Broker', email: 'john@quoteus.ca', role: 'broker', status: 'active', password: 'password123' },
    { id: 'broker2', name: 'Sarah Agent', email: 'sarah@quoteus.ca', role: 'broker', status: 'pending', password: 'password123' },
  ]);

  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: 'admin' | 'broker', password?: string) => {
    // Simple mock login: check if email exists and matches role and password
    
    const foundUser = users.find(u => u.email === email && u.role === role);
    
    if (foundUser) {
      if (password && foundUser.password && password !== foundUser.password) {
        return false;
      }

      if (foundUser.status !== 'active') {
         alert("Your account is pending approval.");
         return false;
      }
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const register = (name: string, email: string, password?: string) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      role: 'broker',
      status: 'pending',
      password
    };
    setUsers([...users, newUser]);
  };

  const approveBroker = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'active' } : u));
  };

  const denyBroker = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'denied' } : u));
  };

  return (
    <AuthContext.Provider value={{ user, users, login, logout, register, approveBroker, denyBroker }}>
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
