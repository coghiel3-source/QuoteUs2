import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Activity {
  id: string;
  type: 'status_change' | 'assignment' | 'note' | 'email_sent' | 'system';
  content: string;
  timestamp: string;
  author: string; // User ID or Name
}

export interface Quote {
  id: string;
  quoteNumber: string;
  type: 'Auto' | 'Home' | 'Tenant' | 'Business' | 'Life' | 'Travel' | 'Pet' | 'General';
  clientName: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  date: string;
  status: 'New' | 'Contacted' | 'Quoted' | 'Bound' | 'Follow-Up' | 'Closed' | 'Lost';
  assignedTo?: string; // Broker ID
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  internalNotes: string;
  activityLog: Activity[];
  details: any;
}

interface QuoteContextType {
  quotes: Quote[];
  addQuote: (quote: Omit<Quote, 'id' | 'quoteNumber' | 'date' | 'status' | 'priority' | 'source' | 'internalNotes' | 'activityLog'> & { priority?: Quote['priority'], source?: string }) => void;
  updateStatus: (id: string, status: Quote['status'], author?: string) => void;
  assignQuote: (quoteId: string, brokerId: string, author?: string) => void;
  deleteQuote: (id: string) => void;
  addNote: (id: string, note: string, author: string) => void;
  logEmail: (id: string, subject: string, recipient: string, author: string) => void;
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
        quoteNumber: 'Q-2025-1001',
        type: 'Auto',
        clientName: 'John Doe',
        email: 'john@example.com',
        phone: '416-555-0199',
        postalCode: 'M5V 2H1',
        date: new Date(Date.now() - 86400000).toISOString(),
        status: 'New',
        priority: 'High',
        source: 'Web Form',
        internalNotes: '',
        activityLog: [
          { id: 'a1', type: 'system', content: 'Lead created via Web Form', timestamp: new Date(Date.now() - 86400000).toISOString(), author: 'System' }
        ],
        details: { vehicle: '2020 Honda Civic' },
        assignedTo: 'broker1'
      },
      {
        id: '2',
        quoteNumber: 'Q-2025-1002',
        type: 'Home',
        clientName: 'Sarah Smith',
        email: 'sarah@example.com',
        phone: '647-555-0122',
        postalCode: 'K1A 0B1',
        date: new Date(Date.now() - 172800000).toISOString(),
        status: 'Contacted',
        priority: 'Medium',
        source: 'Referral',
        internalNotes: 'Client is looking for bundle discount.',
        activityLog: [
          { id: 'a2', type: 'system', content: 'Lead created via Manual Entry', timestamp: new Date(Date.now() - 172800000).toISOString(), author: 'Manager' },
          { id: 'a3', type: 'status_change', content: 'Status changed to Contacted', timestamp: new Date(Date.now() - 100000000).toISOString(), author: 'Sarah Agent' }
        ],
        details: { propertyType: 'Detached' },
        assignedTo: undefined
      }
    ];
  });

  // Save to localStorage whenever quotes change
  useEffect(() => {
    localStorage.setItem('quoteus_quotes', JSON.stringify(quotes));
  }, [quotes]);

  const addQuote = (quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'date' | 'status' | 'priority' | 'source' | 'internalNotes' | 'activityLog'> & { priority?: Quote['priority'], source?: string }) => {
    const quoteNumber = `Q-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote: Quote = {
      ...quoteData,
      id: Math.random().toString(36).substr(2, 9),
      quoteNumber,
      date: new Date().toISOString(),
      status: 'New',
      priority: quoteData.priority || 'Medium',
      source: quoteData.source || 'Web Form',
      internalNotes: '',
      activityLog: [
        { 
          id: Math.random().toString(36).substr(2, 9), 
          type: 'system', 
          content: `Lead created via ${quoteData.source || 'Web Form'}`, 
          timestamp: new Date().toISOString(), 
          author: 'System' 
        }
      ],
      details: quoteData.details || {}
    };
    setQuotes(prev => [newQuote, ...prev]);
    console.log(`[MOCK EMAIL] Sending submission notification for Quote #${quoteNumber} to info@quoteus.ca`);
  };

  const updateStatus = (id: string, status: Quote['status'], author: string = 'System') => {
    setQuotes(prev => prev.map(q => {
      if (q.id === id) {
        const newActivity: Activity = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'status_change',
          content: `Status changed from ${q.status} to ${status}`,
          timestamp: new Date().toISOString(),
          author
        };
        return { ...q, status, activityLog: [newActivity, ...q.activityLog] };
      }
      return q;
    }));
  };

  const assignQuote = (quoteId: string, brokerId: string, author: string = 'System') => {
    setQuotes(prev => prev.map(q => {
      if (q.id === quoteId) {
        const newActivity: Activity = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'assignment',
          content: `Assigned to ${brokerId === 'unassigned' ? 'Unassigned' : brokerId}`, // Simplified for log
          timestamp: new Date().toISOString(),
          author
        };
        return { ...q, assignedTo: brokerId === 'unassigned' ? undefined : brokerId, activityLog: [newActivity, ...q.activityLog] };
      }
      return q;
    }));
  };
  
  const deleteQuote = (id: string) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  const addNote = (id: string, note: string, author: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id === id) {
        const newActivity: Activity = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'note',
          content: `Note added: ${note}`,
          timestamp: new Date().toISOString(),
          author
        };
        return { 
          ...q, 
          internalNotes: q.internalNotes ? `${q.internalNotes}\n\n[${new Date().toLocaleDateString()} ${author}]: ${note}` : `[${new Date().toLocaleDateString()} ${author}]: ${note}`,
          activityLog: [newActivity, ...q.activityLog] 
        };
      }
      return q;
    }));
  };

  const logEmail = (id: string, subject: string, recipient: string, author: string) => {
     setQuotes(prev => prev.map(q => {
      if (q.id === id) {
        const newActivity: Activity = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'email_sent',
          content: `Email sent to ${recipient}: "${subject}"`,
          timestamp: new Date().toISOString(),
          author
        };
        return { ...q, activityLog: [newActivity, ...q.activityLog] };
      }
      return q;
    }));
  };

  return (
    <QuoteContext.Provider value={{ quotes, addQuote, updateStatus, assignQuote, deleteQuote, addNote, logEmail }}>
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
