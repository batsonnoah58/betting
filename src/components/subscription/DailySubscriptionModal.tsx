import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { CheckCircle, Clock, Star, Zap, Smartphone } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DailySubscriptionModalProps {
  onClose: () => void;
}

export const DailySubscriptionModal: React.FC<DailySubscriptionModalProps> = ({ onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const { user } = useAuth();

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access daily odds.",
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
      const { data, error } = await supabase.functions.invoke('paypal-payment', {
        body: {
          amount: 50000, // KSH 500 in cents
          type: 'daily_access',
          description: 'Daily Sure Odds Access - KSH 500',
          phoneNumber: phoneNumber
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Store payment info for verification
      localStorage.setItem('pending_payment', JSON.stringify({
        orderTrackingId: data.order_tracking_id,
        userId: data.user_id,
        amount: 50000, // KSH 500 in cents
        type: 'daily_access'
      }));

      // Open PayPal payment page in new tab
      window.open(data.payment_url, '_blank');
      
      toast({
        title: "Payment Initiated",
        description: "Complete your payment with PayPal to access today's odds",
        variant: "default",
      });
      
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const features = [
    { icon: Star, text: "Verified Sure Odds" },
    { icon: Zap, text: "Real-time Updates" },
    { icon: CheckCircle, text: "Expert Analysis" },
    { icon: Clock, text: "24-hour Access" },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-primary">
            🏆 Daily Sure Odds Access
          </DialogTitle>
          <DialogDescription className="text-center">
            Unlock today's premium betting tips and odds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">KSH 500</div>
            <div className="text-muted-foreground">Per Day Access</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg">
                <feature.icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg border border-primary/20">
            <div className="text-center">
              <div className="font-semibold text-primary mb-1">Today's Special</div>
              <div className="text-sm text-muted-foreground">
                5+ High-confidence matches with detailed analysis
              </div>
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

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Payment Method:</span> PayPal (Card, Bank, PayPal Balance)
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              You can use M-Pesa to fund your PayPal account
            </div>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!user || !phoneNumber || isProcessing}
              className="flex-1"
              variant="gradient"
            >
              {isProcessing ? 'Processing...' : 'Pay KSH 500 with PayPal'}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Access expires at midnight. New payment required daily.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};