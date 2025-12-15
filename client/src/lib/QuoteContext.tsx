import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Quote {
  id: string;
  type: 'Auto' | 'Home' | 'Tenant' | 'Business' | 'Life' | 'Travel' | 'Pet' | 'General';
  clientName: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  date: string;
  status: 'New' | 'Contacted' | 'Quoted' | 'Closed';
  assignedTo?: string; // Broker ID
  details: any;
}

interface QuoteContextType {
  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'date' | 'status'>) => void;
  updateStatus: (id: string, status: Quote['status']) => void;
  assignQuote: (quoteId: string, brokerId: string) => void;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  // Initialize with localStorage data or default mock data
  const [quotes, setQuotes] = useState<Quote[]>(() => {
    const savedQuotes = localStorage.getItem('quoteus_quotes');
    if (savedQuotes) {
      return JSON.parse(savedQuotes);
    }
    return [
      {
        id: '1',
        type: 'Auto',
        clientName: 'John Doe',
        email: 'john@example.com',
        postalCode: 'M5V 2H1',
        date: new Date(Date.now() - 86400000).toISOString(),
        status: 'New',
        details: { vehicle: '2020 Honda Civic' },
        assignedTo: 'broker1'
      },
      {
        id: '2',
        type: 'Home',
        clientName: 'Sarah Smith',
        email: 'sarah@example.com',
        postalCode: 'K1A 0B1',
        date: new Date(Date.now() - 172800000).toISOString(),
        status: 'Contacted',
        details: { propertyType: 'Detached' },
        assignedTo: undefined
      }
    ];
  });

  // Save to localStorage whenever quotes change
  useEffect(() => {
    localStorage.setItem('quoteus_quotes', JSON.stringify(quotes));
  }, [quotes]);

  const addQuote = (quoteData: Omit<Quote, 'id' | 'date' | 'status'>) => {
    const newQuote: Quote = {
      ...quoteData,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      status: 'New'
    };
    setQuotes(prev => [newQuote, ...prev]);
  };

  const updateStatus = (id: string, status: Quote['status']) => {
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
  };

  const assignQuote = (quoteId: string, brokerId: string) => {
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, assignedTo: brokerId } : q));
  };

  return (
    <QuoteContext.Provider value={{ quotes, addQuote, updateStatus, assignQuote }}>
      {children}
    </QuoteContext.Provider>
  );
}

export function useQuotes() {
  const context = useContext(QuoteContext);
  if (context === undefined) {
    throw new Error('useQuotes must be used within a QuoteProvider');
  }
  return context;
}
