import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SiteContent {
  id: string;
  section: string;
  key: string;
  value: string;
  lastUpdated: string;
}

interface ContentContextType {
  content: SiteContent[];
  updateContent: (section: string, key: string, value: string) => void;
  getContent: (section: string, key: string, defaultValue: string) => string;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent[]>(() => {
    const savedContent = localStorage.getItem('quoteus_content');
    return savedContent ? JSON.parse(savedContent) : [];
  });

  useEffect(() => {
    localStorage.setItem('quoteus_content', JSON.stringify(content));
  }, [content]);

  const updateContent = (section: string, key: string, value: string) => {
    setContent(prev => {
      const existingIndex = prev.findIndex(c => c.section === section && c.key === key);
      const newContent = {
        id: existingIndex >= 0 ? prev[existingIndex].id : Math.random().toString(36).substr(2, 9),
        section,
        key,
        value,
        lastUpdated: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        const newArr = [...prev];
        newArr[existingIndex] = newContent;
        return newArr;
      }
      return [...prev, newContent];
    });
  };

  const getContent = (section: string, key: string, defaultValue: string) => {
    const item = content.find(c => c.section === section && c.key === key);
    return item ? item.value : defaultValue;
  };

  return (
    <ContentContext.Provider value={{ content, updateContent, getContent }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}
