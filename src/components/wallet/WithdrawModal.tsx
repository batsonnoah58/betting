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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-primary">
            💰 Withdraw Funds
          </DialogTitle>
          <DialogDescription className="text-center">
            Withdraw your winnings to your PayPal account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">
              {formatCurrency(user?.walletBalance || 0)}
            </div>
            <div className="text-muted-foreground">Available Balance</div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="2000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="2000"
                max={user?.walletBalance || 0}
                step="0.01"
                required
              />
              <div className="text-xs text-muted-foreground">
                Minimum withdrawal: KES 2,000
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
                Enter your M-Pesa registered phone number for verification
              </div>
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-warning-foreground">Important</div>
                <div className="text-muted-foreground mt-1">
                  • Minimum withdrawal: KES 2,000<br/>
                  • Processing time: 1-3 business days<br/>
                  • Funds will be sent to your M-Pesa account
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
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