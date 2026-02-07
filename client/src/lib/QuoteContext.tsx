import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from './api';

export interface Activity {
  id: string;
  type: 'status_change' | 'assignment' | 'note' | 'email_sent' | 'system';
  content: string;
  createdAt?: string; // From database
  timestamp?: string; // For backwards compatibility
  author: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  type: 'Auto' | 'Home' | 'Tenant' | 'Business' | 'Life' | 'Travel' | 'Pet' | 'Mortgage' | 'General';
  clientName: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  date?: string; // For backwards compatibility
  createdAt?: string; // From database
  status: 'New' | 'Contacted' | 'Quoted' | 'Bound' | 'Follow-Up' | 'Closed' | 'Lost' | 'Win' | 'Lose' | 'Expired';
  assignedTo?: string;
  assignedAt?: string;
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  internalNotes: string;
  activityLog: Activity[];
  details: any;
}

interface QuoteContextType {
  quotes: Quote[];
  loading: boolean;
  addQuote: (quote: Omit<Quote, 'id' | 'quoteNumber' | 'date' | 'createdAt' | 'status' | 'priority' | 'source' | 'internalNotes' | 'activityLog'> & { priority?: Quote['priority'], source?: string }) => Promise<void>;
  updateStatus: (id: string, status: Quote['status'], author?: string) => Promise<void>;
  assignQuote: (quoteId: string, brokerId: string, author?: string) => Promise<void>;
  assignQuoteLocal: (quoteId: string, brokerId: string) => void;
  refreshQuotes: () => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  addNote: (id: string, note: string, author: string) => Promise<void>;
  logEmail: (id: string, subject: string, recipient: string, author: string) => Promise<void>;
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all quotes and their activities
  const fetchQuotes = async () => {
    try {
      const quotesData = await apiRequest<any[]>('/quotes');
      
      // Fetch activities for each quote and merge
      const quotesWithActivities = await Promise.all(
        quotesData.map(async (quote) => {
          try {
            const activities = await apiRequest<Activity[]>(`/quotes/${quote.id}/activities`);
            return {
              ...quote,
              date: quote.createdAt, // Backwards compatibility
              activityLog: activities.map(a => ({
                ...a,
                timestamp: a.createdAt || a.timestamp || new Date().toISOString(),
              })),
            };
          } catch (error) {
            return {
              ...quote,
              date: quote.createdAt,
              activityLog: [],
            };
          }
        })
      );

      setQuotes(quotesWithActivities);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const addQuote = async (quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'date' | 'createdAt' | 'status' | 'priority' | 'source' | 'internalNotes' | 'activityLog'> & { priority?: Quote['priority'], source?: string }) => {
    try {
      const newQuote = await apiRequest<any>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          type: quoteData.type,
          clientName: quoteData.clientName,
          email: quoteData.email,
          phone: quoteData.phone,
          postalCode: quoteData.postalCode,
          priority: quoteData.priority || 'Medium',
          source: quoteData.source || 'Web Form',
          details: quoteData.details || {},
          assignedTo: quoteData.assignedTo,
          internalNotes: '',
        }),
      });

      // Fetch activities for the new quote
      const activities = await apiRequest<Activity[]>(`/quotes/${newQuote.id}/activities`);

      setQuotes(prev => [{
        ...newQuote,
        date: newQuote.createdAt,
        activityLog: activities.map(a => ({
          ...a,
          timestamp: a.createdAt || new Date().toISOString(),
        })),
      }, ...prev]);

      console.log(`[API] Quote ${newQuote.quoteNumber} created`);
    } catch (error) {
      console.error('Failed to add quote:', error);
      throw error;
    }
  };

  const updateStatus = async (id: string, status: Quote['status'], author: string = 'System') => {
    try {
      const currentQuote = quotes.find(q => q.id === id);
      if (!currentQuote) return;

      // Update quote status
      const updated = await apiRequest<any>(`/quotes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });

      // Log activity
      await apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          quoteId: id,
          type: 'status_change',
          content: `Status changed from ${currentQuote.status} to ${status}`,
          author,
        }),
      });

      // Refresh activities
      const activities = await apiRequest<Activity[]>(`/quotes/${id}/activities`);

      setQuotes(prev => prev.map(q =>
        q.id === id ? {
          ...updated,
          date: updated.createdAt,
          activityLog: activities.map(a => ({
            ...a,
            timestamp: a.createdAt || new Date().toISOString(),
          })),
        } : q
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const assignQuote = async (quoteId: string, brokerId: string, author: string = 'System') => {
    try {
      // Update quote assignment
      const updated = await apiRequest<any>(`/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: brokerId === 'unassigned' ? null : brokerId }),
      });

      // Log activity
      await apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          quoteId,
          type: 'assignment',
          content: `Assigned to ${brokerId === 'unassigned' ? 'Unassigned' : brokerId}`,
          author,
        }),
      });

      // Refresh activities
      const activities = await apiRequest<Activity[]>(`/quotes/${quoteId}/activities`);

      setQuotes(prev => prev.map(q =>
        q.id === quoteId ? {
          ...updated,
          date: updated.createdAt,
          activityLog: activities.map(a => ({
            ...a,
            timestamp: a.createdAt || new Date().toISOString(),
          })),
        } : q
      ));
    } catch (error) {
      console.error('Failed to assign quote:', error);
    }
  };

  // Local state update only - used when server has already updated the assignment
  const assignQuoteLocal = (quoteId: string, brokerId: string) => {
    setQuotes(prev => prev.map(q =>
      q.id === quoteId ? {
        ...q,
        assignedTo: brokerId === 'unassigned' ? undefined : brokerId,
      } : q
    ));
  };

  // Refresh quotes from server
  const refreshQuotes = async () => {
    try {
      const data = await apiRequest<any[]>('/quotes');
      const quotesWithDates = data.map(q => ({
        ...q,
        date: q.createdAt,
        activityLog: q.activityLog || [],
      }));
      setQuotes(quotesWithDates);
    } catch (error) {
      console.error('Failed to refresh quotes:', error);
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      await apiRequest(`/quotes/${id}`, {
        method: 'DELETE',
      });
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (error) {
      console.error('Failed to delete quote:', error);
    }
  };

  const addNote = async (id: string, note: string, author: string) => {
    try {
      const currentQuote = quotes.find(q => q.id === id);
      if (!currentQuote) return;

      // Update internal notes
      const newNotes = currentQuote.internalNotes
        ? `${currentQuote.internalNotes}\n\n[${new Date().toLocaleDateString()} ${author}]: ${note}`
        : `[${new Date().toLocaleDateString()} ${author}]: ${note}`;

      const updated = await apiRequest<any>(`/quotes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ internalNotes: newNotes }),
      });

      // Log activity
      await apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          quoteId: id,
          type: 'note',
          content: `Note added: ${note}`,
          author,
        }),
      });

      // Refresh activities
      const activities = await apiRequest<Activity[]>(`/quotes/${id}/activities`);

      setQuotes(prev => prev.map(q =>
        q.id === id ? {
          ...updated,
          date: updated.createdAt,
          activityLog: activities.map(a => ({
            ...a,
            timestamp: a.createdAt || new Date().toISOString(),
          })),
        } : q
      ));
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const logEmail = async (id: string, subject: string, recipient: string, author: string) => {
    try {
      await apiRequest('/activities', {
        method: 'POST',
        body: JSON.stringify({
          quoteId: id,
          type: 'email_sent',
          content: `Email sent to ${recipient}: "${subject}"`,
          author,
        }),
      });

      // Refresh activities
      const activities = await apiRequest<Activity[]>(`/quotes/${id}/activities`);

      setQuotes(prev => prev.map(q =>
        q.id === id ? {
          ...q,
          activityLog: activities.map(a => ({
            ...a,
            timestamp: a.createdAt || new Date().toISOString(),
          })),
        } : q
      ));
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  };

  return (
    <QuoteContext.Provider value={{ quotes, loading, addQuote, updateStatus, assignQuote, assignQuoteLocal, refreshQuotes, deleteQuote, addNote, logEmail }}>
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
