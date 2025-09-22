import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SelectedDateContextType {
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  clearSelectedDate: () => void;
}

const SelectedDateContext = createContext<SelectedDateContextType | undefined>(undefined);

interface SelectedDateProviderProps {
  children: ReactNode;
}

export function SelectedDateProvider({ children }: SelectedDateProviderProps) {
  const [selectedDate, setSelectedDateState] = useState<string | null>(() => {
    // Recuperar do localStorage na inicialização
    const saved = localStorage.getItem('dimensiona_selected_date');
    return saved || null;
  });

  const setSelectedDate = (date: string | null) => {
    setSelectedDateState(date);
    if (date) {
      localStorage.setItem('dimensiona_selected_date', date);
    } else {
      localStorage.removeItem('dimensiona_selected_date');
    }
  };

  const clearSelectedDate = () => {
    setSelectedDate(null);
  };

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate, clearSelectedDate }}>
      {children}
    </SelectedDateContext.Provider>
  );
}

export function useSelectedDate() {
  const context = useContext(SelectedDateContext);
  if (context === undefined) {
    throw new Error('useSelectedDate must be used within a SelectedDateProvider');
  }
  return context;
}