import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertCircle, Smartphone, Minus } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawModalProps {
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const { user, updateWallet } = useAuth();

  const handleWithdraw = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to withdraw funds.",
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

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 2000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal amount is KES 2,000.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > user.walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: "Your withdrawal amount exceeds your wallet balance.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > 50000) {
      toast({
        title: "Maximum Withdrawal",
        description: "Maximum withdrawal amount is KES 50,000.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-withdraw', {
        body: {
          amount: withdrawAmount,
          phoneNumber: phoneNumber,
          userId: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Note: The mpesa-withdraw function already updates the wallet balance
      // So we don't need to call updateWallet here

      toast({
        title: "Withdrawal Initiated",
        description: "Your withdrawal has been processed. Funds will be sent to your M-Pesa account.",
        variant: "default",
      });
      
      onClose();
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast({
        title: "Withdrawal Failed",
        description: error instanceof Error ? error.message : "Failed to initiate withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Withdraw your winnings to your M-Pesa account. Minimum withdrawal is KES 2,000.
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
              min="2000"
              max={user?.walletBalance || 0}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Available: {formatCurrency(user?.walletBalance || 0)} | Minimum: KES 2,000
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
              onClick={handleWithdraw}
              disabled={!user || !phoneNumber || !amount || isProcessing}
              className="flex-1"
              variant="gradient"
            >
              {isProcessing ? 'Processing...' : 'Withdraw to PayPal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 