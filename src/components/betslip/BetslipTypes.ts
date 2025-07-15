export interface BetslipSelection {
  gameId: number;
  marketId: number;
  marketOptionId: number;
  odds: number;
  label: string;
  marketName: string;
  gameLabel: string; // e.g. "Chelsea vs Arsenal"
} 