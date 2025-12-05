
import React, { createContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SupplementPlan, SupplementPlanItem, SupplementSuggestion, WorkoutSession } from '../types';
import { reviewSupplementPlan } from '../services/supplementService';
import { useI18n } from '../hooks/useI18n';

export interface SupplementContextType {
  supplementPlan: SupplementPlan | null;
  setSupplementPlan: (plan: SupplementPlan | null) => void;
  userSupplements: SupplementPlanItem[];
  setUserSupplements: React.Dispatch<React.SetStateAction<SupplementPlanItem[]>>;
  takenSupplements: Record<string, string[]>;
  supplementLogs: Record<string, number[]>;
  toggleSupplementIntake: (date: string, itemId: string) => void;
  batchTakeSupplements: (date: string, itemIds: string[]) => void;
  snoozedSupplements: Record<string, number>;
  snoozeSupplement: (itemId: string) => void;
  batchSnoozeSupplements: (itemIds: string[]) => void;
  updateSupplementStock: (itemId: string, amountToAdd: number) => void;
  updateSupplementPlanItem: (itemId: string, updates: Partial<SupplementPlanItem>) => void;
  
  newSuggestions: SupplementSuggestion[];
  applyPlanSuggestion: (suggestionId: string) => void;
  applyAllPlanSuggestions: () => void;
  dismissSuggestion: (suggestionId: string) => void;
  dismissAllSuggestions: () => void;
  clearNewSuggestions: () => void;
  triggerManualPlanReview: (history: WorkoutSession[]) => void;
  
  importSupplementData: (data: any) => void;
}

export const SupplementContext = createContext<SupplementContextType>({} as SupplementContextType);

export const SupplementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [supplementPlan, setSupplementPlan] = useLocalStorage<SupplementPlan | null>('supplementPlan', null);
  const [userSupplements, setUserSupplements] = useLocalStorage<SupplementPlanItem[]>('userSupplements', []);
  const [takenSupplements, setTakenSupplements] = useLocalStorage<Record<string, string[]>>('takenSupplements', {});
  const [supplementLogs, setSupplementLogs] = useLocalStorage<Record<string, number[]>>('supplementLogs', {});
  const [snoozedSupplements, setSnoozedSupplements] = useLocalStorage<Record<string, number>>('snoozedSupplements', {});
  const [newSuggestions, setNewSuggestions] = useState<SupplementSuggestion[]>([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useLocalStorage<string[]>('dismissedSuggestions', []);
  
  const { t } = useI18n();

  const toggleSupplementIntake = useCallback((date: string, itemId: string) => {
      const dayList = takenSupplements[date] || [];
      const wasTaken = dayList.includes(itemId);
      const newTakenState = !wasTaken;
      
      setTakenSupplements(prev => {
          const currentDay = prev[date] || [];
          if (currentDay.includes(itemId)) {
              return { ...prev, [date]: currentDay.filter(id => id !== itemId) };
          }
          return { ...prev, [date]: [...currentDay, itemId] };
      });
      
      if (newTakenState) {
          setSupplementLogs(prev => {
              const currentLogs = prev[itemId] || [];
              return { ...prev, [itemId]: [...currentLogs, Date.now()] };
          });
      }

      const stockChange = newTakenState ? -1 : 1;
      const updateStockInList = (list: SupplementPlanItem[]) => {
          return list.map(item => {
              if (item.id === itemId && item.stock !== undefined) {
                  const currentStock = isNaN(item.stock) ? 0 : item.stock;
                  return { ...item, stock: Math.max(0, currentStock + stockChange) };
              }
              return item;
          });
      };
      
      setUserSupplements(prev => updateStockInList(prev));
      setSupplementPlan(prevPlan => prevPlan ? { ...prevPlan, plan: updateStockInList(prevPlan.plan) } : null);
  }, [takenSupplements, setTakenSupplements, setUserSupplements, setSupplementPlan, setSupplementLogs]);
  
  // NEW: Batch mark as taken (Log Stack)
  const batchTakeSupplements = useCallback((date: string, itemIds: string[]) => {
      // 1. Update Taken Status
      setTakenSupplements(prev => {
          const currentDay = new Set(prev[date] || []);
          // Filter out already taken ones to avoid double counting stock reduction if called multiple times
          const newlyTakenIds = itemIds.filter(id => !currentDay.has(id));
          
          if (newlyTakenIds.length === 0) return prev; // No changes needed

          newlyTakenIds.forEach(id => currentDay.add(id));
          return { ...prev, [date]: Array.from(currentDay) };
      });

      // 2. Update Logs
      setSupplementLogs(prev => {
          const nextLogs = { ...prev };
          itemIds.forEach(id => {
               // We only log if it wasn't already taken today, checking takenSupplements here might be stale
               // so we append optimistically or just append. 
               // For simplicity in a batch log context (usually "I just took these"), we append.
               nextLogs[id] = [...(nextLogs[id] || []), Date.now()];
          });
          return nextLogs;
      });

      // 3. Reduce Stock
      const updateStockInList = (list: SupplementPlanItem[]) => {
          return list.map(item => {
              if (itemIds.includes(item.id) && item.stock !== undefined) {
                   const currentStock = isNaN(item.stock) ? 0 : item.stock;
                   return { ...item, stock: Math.max(0, currentStock - 1) };
              }
              return item;
          });
      };

      setUserSupplements(prev => updateStockInList(prev));
      setSupplementPlan(prevPlan => prevPlan ? { ...prevPlan, plan: updateStockInList(prevPlan.plan) } : null);

  }, [setTakenSupplements, setSupplementLogs, setUserSupplements, setSupplementPlan]);

  // NEW: Batch Snooze
  const batchSnoozeSupplements = useCallback((itemIds: string[]) => {
      setSnoozedSupplements(prev => {
          const next = { ...prev };
          const snoozeUntil = Date.now() + 6 * 60 * 60 * 1000;
          itemIds.forEach(id => {
              next[id] = snoozeUntil;
          });
          return next;
      });
  }, [setSnoozedSupplements]);

  const updateSupplementStock = useCallback((itemId: string, amountToAdd: number) => {
      setUserSupplements(prev => prev.some(s => s.id === itemId) ? prev.map(s => s.id === itemId ? { ...s, stock: Math.max(0, (s.stock || 0) + amountToAdd) } : s) : prev);
      setSupplementPlan(prevPlan => (prevPlan && prevPlan.plan.some(s => s.id === itemId)) ? { ...prevPlan, plan: prevPlan.plan.map(s => s.id === itemId ? { ...s, stock: Math.max(0, (s.stock || 0) + amountToAdd) } : s) } : prevPlan);
  }, [setUserSupplements, setSupplementPlan]);

  const updateSupplementPlanItem = useCallback((itemId: string, updates: Partial<SupplementPlanItem>) => {
      setUserSupplements(prev => prev.some(s => s.id === itemId) ? prev.map(s => s.id === itemId ? { ...s, ...updates } : s) : prev);
      setSupplementPlan(prevPlan => (prevPlan && prevPlan.plan.some(s => s.id === itemId)) ? { ...prevPlan, plan: prevPlan.plan.map(s => s.id === itemId ? { ...s, ...updates } : s) } : prevPlan);
  }, [setUserSupplements, setSupplementPlan]);

  const snoozeSupplement = useCallback((itemId: string) => {
      setSnoozedSupplements(prev => ({ ...prev, [itemId]: Date.now() + 6 * 60 * 60 * 1000 }));
  }, [setSnoozedSupplements]);

  const dismissSuggestion = useCallback((suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          setDismissedSuggestions(prev => [...prev, suggestion.identifier]);
          setNewSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      }
  }, [newSuggestions, setDismissedSuggestions]);

  const applyPlanSuggestion = useCallback((suggestionId: string) => {
      const suggestion = newSuggestions.find(s => s.id === suggestionId);
      if (suggestion) {
          const action = suggestion.action;
          if (action.type === 'ADD') {
              if (action.item) setUserSupplements(prev => [...prev, { ...action.item, isCustom: true } as SupplementPlanItem]);
          } else if (action.type === 'REMOVE') {
              updateSupplementPlanItem(action.itemId, { restDayOnly: undefined, trainingDayOnly: undefined });
              setSupplementPlan(prev => prev ? ({ ...prev, plan: prev.plan.filter(i => i.id !== action.itemId) }) : null);
              setUserSupplements(prev => prev.filter(i => i.id !== action.itemId));
          } else if (action.type === 'UPDATE') {
              updateSupplementPlanItem(action.itemId, action.updates);
          }
          dismissSuggestion(suggestionId);
      }
  }, [newSuggestions, setUserSupplements, setSupplementPlan, updateSupplementPlanItem, dismissSuggestion]);

  const applyAllPlanSuggestions = useCallback(() => {
      newSuggestions.forEach(s => applyPlanSuggestion(s.id));
  }, [newSuggestions, applyPlanSuggestion]);

  const dismissAllSuggestions = useCallback(() => {
      setDismissedSuggestions(prev => [...prev, ...newSuggestions.map(s => s.identifier)]);
      setNewSuggestions([]);
  }, [newSuggestions, setDismissedSuggestions]);

  const clearNewSuggestions = useCallback(() => setNewSuggestions([]), []);

  const triggerManualPlanReview = useCallback((history: WorkoutSession[]) => {
      if (supplementPlan) {
        const suggestions = reviewSupplementPlan(supplementPlan, history, t, null, takenSupplements, supplementLogs);
        const filtered = suggestions.filter(s => !dismissedSuggestions.includes(s.identifier));
        setNewSuggestions(filtered);
      }
  }, [supplementPlan, t, dismissedSuggestions, takenSupplements, supplementLogs]);

  const importSupplementData = useCallback((data: any) => {
      if (data.supplementPlan) setSupplementPlan(data.supplementPlan);
      if (Array.isArray(data.userSupplements)) setUserSupplements(data.userSupplements);
      if (data.takenSupplements) setTakenSupplements(data.takenSupplements);
      if (data.supplementLogs) setSupplementLogs(data.supplementLogs);
      if (data.snoozedSupplements) setSnoozedSupplements(data.snoozedSupplements);
  }, [setSupplementPlan, setUserSupplements, setTakenSupplements, setSupplementLogs, setSnoozedSupplements]);

  const value = useMemo(() => ({
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements, takenSupplements, supplementLogs,
    toggleSupplementIntake, batchTakeSupplements, snoozedSupplements, snoozeSupplement, batchSnoozeSupplements, 
    updateSupplementStock, updateSupplementPlanItem,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    importSupplementData
  }), [
    supplementPlan, setSupplementPlan, userSupplements, setUserSupplements, takenSupplements, supplementLogs,
    toggleSupplementIntake, batchTakeSupplements, snoozedSupplements, snoozeSupplement, batchSnoozeSupplements,
    updateSupplementStock, updateSupplementPlanItem,
    newSuggestions, applyPlanSuggestion, applyAllPlanSuggestions, dismissSuggestion, dismissAllSuggestions, clearNewSuggestions, triggerManualPlanReview,
    importSupplementData
  ]);

  return <SupplementContext.Provider value={value}>{children}</SupplementContext.Provider>;
};
