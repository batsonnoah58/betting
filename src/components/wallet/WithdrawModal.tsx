import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Smartphone, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawModalProps {
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { user, refreshUser } = useAuth();

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      setStatus('error');
      return;
    }

    if (withdrawAmount < 2000) {
      setErrorMessage("Minimum withdrawal amount is KES 2,000");
      setStatus('error');
      return;
    }

    if (withdrawAmount > (user?.walletBalance || 0)) {
      setErrorMessage("Insufficient wallet balance");
      setStatus('error');
      return;
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^254[17]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setErrorMessage("Please enter a valid Kenyan phone number (e.g., 254700000000)");
      setStatus('error');
      return;
    }

    setIsProcessing(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("User not authenticated");
      }

      // Call M-Pesa withdrawal function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          phoneNumber,
          userId: user?.id
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initiate withdrawal');
      }

      setStatus('success');
      toast.success("Withdrawal initiated successfully. Funds will be sent to your M-Pesa account.");
      
      // Close modal after a delay to show success message
      setTimeout(() => {
        onClose();
        refreshUser(); // Refresh user data
      }, 3000);

    } catch (error) {
      console.error('Withdrawal error:', error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to process withdrawal");
      setStatus('error');
      toast.error(error instanceof Error ? error.message : "Failed to process withdrawal");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
  };

  const resetForm = () => {
    setAmount('');
    setPhoneNumber('');
    setStatus('idle');
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Withdraw Funds</span>
          </DialogTitle>
          <DialogDescription>
            Withdraw your winnings to your M-Pesa account. Minimum withdrawal is KES 2,000.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {status === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Withdrawal Initiated!</h3>
              <p className="text-sm text-muted-foreground">
                Your withdrawal has been processed. Funds will be sent to your M-Pesa account within 1-3 business days.
              </p>
            </div>
          ) : (
            <>
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
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Available: {formatCurrency(user?.walletBalance?.toString() || '0')} | Minimum: KES 2,000
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
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your M-Pesa registered phone number
                </p>
              </div>

              {status === 'error' && errorMessage && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleWithdraw}
                  disabled={!amount || !phoneNumber || parseFloat(amount) < 2000 || parseFloat(amount) > (user?.walletBalance || 0) || isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    `Withdraw ${amount ? formatCurrency(amount) : ''}`
                  )}
                </Button>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <div className="font-medium mb-1">How it works:</div>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Enter amount and phone number</li>
                      <li>Click "Withdraw" to initiate transfer</li>
                      <li>Funds will be sent to your M-Pesa account</li>
                      <li>Processing time: 1-3 business days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 