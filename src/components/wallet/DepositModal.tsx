import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Smartphone, DollarSign, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DepositModalProps {
  onClose: () => void;
}

type PaymentMethod = 'mpesa' | 'paypal' | 'paystack';

export const DepositModal: React.FC<DepositModalProps> = ({ onClose }) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // Only allow PayPal as payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { user, refreshUser } = useAuth();

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      setStatus('error');
      return;
    }

    if (depositAmount < 100) {
      setErrorMessage("Minimum deposit amount is KES 100");
      setStatus('error');
      return;
    }

    if (depositAmount > 100000) {
      setErrorMessage("Maximum deposit amount is KES 100,000");
      setStatus('error');
      return;
    }

    // Validate phone number for M-Pesa
    if (paymentMethod === 'mpesa') {
      const phoneRegex = /^254[17]\d{8}$/;
      if (!phoneRegex.test(phoneNumber)) {
        setErrorMessage("Please enter a valid Kenyan phone number (e.g., 254700000000)");
        setStatus('error');
        return;
      }
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

      let response;

      if (paymentMethod === 'mpesa') {
        // Call new M-Pesa payment function
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            amount: depositAmount,
            phoneNumber,
            userId: user?.id
          }),
        });
      } else if (paymentMethod === 'paystack') {
        // Call Paystack payment function
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            amount: depositAmount,
            email: user?.email,
            userId: user?.id
          }),
        });
      } else if (paymentMethod === 'paypal') {
        // Call PayPal payment function
        response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paypal-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            amount: depositAmount,
            userId: user?.id
          }),
        });
      }

      const paymentResult = await response.json();

      if (!response.ok || !paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to initiate payment');
      }

      if (paymentMethod === 'paypal' && paymentResult.approval_url) {
        // Redirect to PayPal for payment
        window.open(paymentResult.approval_url, '_blank');
        setStatus('success');
        toast.success("PayPal payment initiated. Please complete the payment in the new window.");
      } else if (paymentMethod === 'paystack' && paymentResult.authorization_url) {
        window.open(paymentResult.authorization_url, '_blank');
        setStatus('success');
        toast.success("Paystack payment initiated. Please complete the payment in the new window.");
      } else {
        setStatus('success');
        toast.success("STK Push sent to your phone. Please check your M-Pesa and enter the PIN to complete the deposit.");
      }
      
      // Close modal after a delay to show success message
      setTimeout(() => {
      onClose();
        refreshUser(); // Refresh user data
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage(
        "We are experiencing an issue with PayPal payments and are working to fix it as soon as possible. Please try again later or use another payment method if available."
      );
      setStatus('error');
      // Removed toast.error to prevent bottom notification
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
    setPaymentMethod('mpesa');
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
            <span>Deposit Funds</span>
          </DialogTitle>
          <DialogDescription>
            Add money to your wallet using PayPal or M-Pesa. Minimum deposit is KES 100.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
                onClick={() => setPaymentMethod('mpesa')}
                disabled={isProcessing}
              >
                <Smartphone className="h-4 w-4" />
                <span>M-Pesa</span>
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
                onClick={() => setPaymentMethod('paypal')}
                disabled={isProcessing}
              >
                <CreditCard className="h-4 w-4" />
                <span>PayPal</span>
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'paystack' ? 'default' : 'outline'}
                className="flex items-center space-x-2"
                onClick={() => setPaymentMethod('paystack')}
                disabled={isProcessing}
              >
                <CreditCard className="h-4 w-4" />
                <span>Paystack</span>
              </Button>
            </div>
          </div>
          {/* Phone number input for M-Pesa and IntaSend */}
          {(paymentMethod === 'mpesa' || paymentMethod === 'intasend') && (
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">Enter your registered phone number (format: 2547XXXXXXXX)</p>
            </div>
          )}
          {/* Amount input */}
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">Amount (KES)</label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
              max="100000"
              className="h-10"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground">Minimum: KES 100 | Maximum: KES 100,000</p>
          </div>
          {errorMessage && status === 'error' && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-2">
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
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) < 100 || parseFloat(amount) > 100000 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                `Deposit ${amount ? formatCurrency(amount) : ''}`
              )}
            </Button>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">PayPal Payment:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Enter amount and click "Deposit"</li>
                  <li>Complete payment in PayPal window</li>
                  <li>Funds will be added to your wallet instantly</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};