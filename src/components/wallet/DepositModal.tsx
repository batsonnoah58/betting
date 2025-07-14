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
        description: "Minimum deposit amount is KES 10",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount > 100000) {
      toast({
        title: "Maximum Deposit",
        description: "Maximum deposit amount is KES 100,000",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^254[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Kenyan phone number (e.g., 254700000000)",
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
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add money to your wallet to start betting. Minimum deposit is KES 100.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (KES)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Minimum: KES 100 | Maximum: KES 100,000
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              M-Pesa Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="254700000000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          {/* error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) */}

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeposit}
              disabled={!amount || !phoneNumber || parseFloat(amount) < 10 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Deposit ${amount ? formatCurrency(amount) : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};