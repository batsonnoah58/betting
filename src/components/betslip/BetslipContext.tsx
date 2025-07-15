import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types for a betslip selection (can be extended as needed)
export interface BetslipSelection {
  gameId: number;
  marketId: number;
  marketOptionId: number;
  odds: number;
  label: string;
  marketName: string;
  gameLabel: string; // e.g. "Chelsea vs Arsenal"
}

interface BetslipContextType {
  selections: BetslipSelection[];
  addSelection: (selection: BetslipSelection) => void;
  removeSelection: (marketOptionId: number) => void;
  clearBetslip: () => void;
  isSelected: (marketOptionId: number) => boolean;
}

const BetslipContext = createContext<BetslipContextType | undefined>(undefined);

export const BetslipProvider = ({ children }: { children: ReactNode }) => {
  const [selections, setSelections] = useState<BetslipSelection[]>([]);

  const addSelection = (selection: BetslipSelection) => {
    setSelections((prev) => {
      // Only one selection per market allowed (remove previous from same market)
      const filtered = prev.filter(sel => sel.marketId !== selection.marketId);
      return [...filtered, selection];
    });
  };

  const removeSelection = (marketOptionId: number) => {
    setSelections((prev) => prev.filter(sel => sel.marketOptionId !== marketOptionId));
  };

  const clearBetslip = () => setSelections([]);

  const isSelected = (marketOptionId: number) => selections.some(sel => sel.marketOptionId === marketOptionId);

  return (
    <BetslipContext.Provider value={{ selections, addSelection, removeSelection, clearBetslip, isSelected }}>
      {children}
    </BetslipContext.Provider>
  );
};

export const useBetslip = () => {
  const ctx = useContext(BetslipContext);
  if (!ctx) throw new Error('useBetslip must be used within a BetslipProvider');
  return ctx;
}; 