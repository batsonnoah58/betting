import React from 'react';
import { Button } from '../../ui/button';

interface BetButtonProps {
  odds: number;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const BetButton: React.FC<BetButtonProps> = ({ odds, label, isSelected, onClick, disabled, loading }) => {
  return (
    <Button
      size="sm"
      variant={isSelected ? 'success' : 'betting'}
      onClick={onClick}
      disabled={disabled || loading}
      className={`place-bet-btn w-full text-xs h-8 sm:h-9 ${isSelected ? 'border-2 border-success bg-success/10 scale-105 transition-transform duration-150' : ''}`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
          Processing...
        </span>
      ) : (
        <>
          {label} <span className="ml-1 font-bold text-primary">{odds}</span>
        </>
      )}
    </Button>
  );
}; 