import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { Button } from '../../ui/button';

interface BetConfirmationDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  stake: number;
  odds: number;
  label: string;
  loading?: boolean;
  error?: string | null;
}

export const BetConfirmationDialog: React.FC<BetConfirmationDialogProps> = ({
  open,
  onConfirm,
  onCancel,
  stake,
  odds,
  label,
  loading,
  error
}) => (
  <Dialog open={open} onOpenChange={onCancel}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Bet</DialogTitle>
        <DialogDescription>
          Please confirm your bet details before placing:
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2 py-2">
        <div><span className="font-semibold">Selection:</span> {label}</div>
        <div><span className="font-semibold">Stake:</span> KES {stake}</div>
        <div><span className="font-semibold">Odds:</span> {odds}</div>
        <div><span className="font-semibold">Potential Winnings:</span> KES {(stake * odds).toFixed(2)}</div>
        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">Cancel</Button>
        <Button onClick={onConfirm} disabled={loading} className="flex-1">{loading ? 'Placing...' : 'Place Bet'}</Button>
      </div>
    </DialogContent>
  </Dialog>
); 