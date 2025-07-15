import React from 'react';

interface Market {
  id: number;
  name: string;
  type: string;
}
interface MarketOption {
  id: number;
  market_id: number;
  label: string;
  odds: number;
}

interface MarketListProps {
  markets: Market[];
  marketOptions: MarketOption[];
  onOptionBet: (option: MarketOption) => void;
  loading?: boolean;
  error?: string | null;
}

export const MarketList: React.FC<MarketListProps> = ({ markets, marketOptions, onOptionBet, loading, error }) => {
  if (loading) return <div className="text-center py-4">Loading markets...</div>;
  if (error) return <div className="text-center text-destructive py-4">{error}</div>;
  if (!markets.length) return <div className="text-center text-muted-foreground py-4">No markets available.</div>;

  return (
    <div className="space-y-4">
      {markets.map(market => (
        <div key={market.id} className="border rounded-lg p-3">
          <div className="font-semibold mb-2">{market.name}</div>
          <div className="flex flex-wrap gap-2">
            {marketOptions.filter(opt => opt.market_id === market.id).map(option => (
              <button
                key={option.id}
                className="px-3 py-1 rounded bg-betting-background hover:bg-betting-hover border border-primary/20 text-sm font-medium"
                onClick={() => onOptionBet(option)}
              >
                {option.label} <span className="ml-1 font-bold text-primary">{option.odds}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}; 