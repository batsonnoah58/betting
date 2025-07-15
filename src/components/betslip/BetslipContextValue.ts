import { createContext } from 'react';
import type { BetslipSelection } from './BetslipTypes';

export interface BetslipContextType {
  selections: BetslipSelection[];
  addSelection: (selection: BetslipSelection) => void;
  removeSelection: (marketOptionId: number) => void;
  clearBetslip: () => void;
  isSelected: (marketOptionId: number) => boolean;
}

export const BetslipContext = createContext<BetslipContextType | undefined>(undefined); 