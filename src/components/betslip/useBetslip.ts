import { useContext } from 'react';
import { BetslipContext } from './BetslipContextValue';

export const useBetslip = () => {
  const ctx = useContext(BetslipContext);
  if (!ctx) throw new Error('useBetslip must be used within a BetslipProvider');
  return ctx;
}; 