import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Smartphone, DollarSign } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DepositModalProps {
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { updateWallet, user } = useAuth();

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount < 10) {
      toast({
        title: "Minimum Deposit",
        description: "Minimum deposit amount is KSH 10",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a valid M-Pesa phone number (e.g., 254700000000).",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // For demo purposes, directly update wallet balance
      // In production, this would integrate with a payment gateway
      await updateWallet(depositAmount);

      // Add transaction record
      await supabase.from('transactions').insert({
        user_id: user?.id,
        type: 'deposit',
        amount: depositAmount,
        description: `Wallet deposit via M-Pesa (${phoneNumber})`
      });

      toast({
        title: "Deposit Successful",
        description: `KSH ${depositAmount} has been added to your wallet`,
        variant: "default",
      });
      
      onClose();
    } catch (error) {
      console.error('Deposit error:', error);
      toast({
        title: "Deposit Failed",
        description: error instanceof Error ? error.message : "Failed to process deposit",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return `KSH ${num.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Deposit Funds</span>
          </DialogTitle>
          <DialogDescription>
            Add money to your wallet using PayPal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Deposit Amount (KSH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="10"
              max="10000"
              step="0.01"
            />
            {amount && (
              <div className="text-sm text-muted-foreground">
                Amount: {formatCurrency(amount)}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 border-2 rounded-lg border-primary bg-primary/5">
                <Smartphone className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium text-center">PayPal</div>
                <div className="text-xs text-muted-foreground text-center mt-1">
                  Card, Bank, PayPal Balance
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Quick amounts:</div>
            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 250].map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs"
                >
                  KSH {quickAmount}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">M-Pesa Phone Number *</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="254700000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Enter your M-Pesa registered phone number for payment
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleDeposit}
              disabled={!amount || !phoneNumber || parseFloat(amount) < 10 || isProcessing}
              className="flex-1"
              variant="gradient"
            >
              {isProcessing ? 'Processing...' : `Deposit ${amount ? formatCurrency(amount) : ''}`}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Minimum deposit: KSH 10. You can use M-Pesa to fund your PayPal account.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};