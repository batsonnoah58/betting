import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PaymentVerificationProps {
  onSuccess?: () => void;
}

export const PaymentVerification: React.FC<PaymentVerificationProps> = ({ onSuccess }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);

  useEffect(() => {
    const pendingPayment = localStorage.getItem('pending_payment');
    if (pendingPayment) {
      setHasPendingPayment(true);
    }
  }, []);

  const verifyPayment = async () => {
    const pendingPaymentStr = localStorage.getItem('pending_payment');
    if (!pendingPaymentStr) {
      toast({
        title: "No Payment Found",
        description: "No pending payment to verify.",
        variant: "destructive",
      });
      return;
    }

    const pendingPayment = JSON.parse(pendingPaymentStr);
    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          orderTrackingId: pendingPayment.orderTrackingId,
          userId: pendingPayment.userId,
          amount: pendingPayment.amount,
          type: pendingPayment.type
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        localStorage.removeItem('pending_payment');
        setHasPendingPayment(false);
        
        toast({
          title: "Payment Verified!",
          description: data.message,
          variant: "default",
        });

        // Trigger page refresh to update user data
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } else {
        toast({
          title: "Payment Pending",
          description: `Payment status: ${data.status}`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!hasPendingPayment) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-primary">
          <AlertCircle className="h-5 w-5" />
          <span>PayPal Payment Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have a pending PayPal payment. Click below to verify if your payment was successful.
          </p>
          
          <Button
            onClick={verifyPayment}
            disabled={isVerifying}
            variant="outline"
            className="w-full"
          >
            {isVerifying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isVerifying ? 'Verifying...' : 'Verify PayPal Payment'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};