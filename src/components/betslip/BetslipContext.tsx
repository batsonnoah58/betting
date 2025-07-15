import React, { useState, ReactNode } from 'react';
import type { BetslipSelection } from './BetslipTypes';
import { BetslipContext } from './BetslipContextValue';

export const BetslipProvider = ({ children }: { children: ReactNode }) => {
  const [selections, setSelections] = useState<BetslipSelection[]>([]);

  const addSelection = (selection: BetslipSelection) => {
    setSelections((prev) => {
      // Allow multiple options from the same market for a game, but prevent exact duplicates
      if (prev.some(sel => sel.marketOptionId === selection.marketOptionId)) {
        return prev;
      }
      return [...prev, selection];
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