import React from 'react';
import { Header } from '../components/layout/Header';
import { PaymentVerification } from '../components/payment/PaymentVerification';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const PaymentCallback: React.FC = () => {
  const handleBackToDashboard = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <Card className="shadow-betting animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary">
                Payment Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Your payment is being processed. This may take a few moments.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please verify your payment below to confirm completion.
                </p>
              </div>

              <PaymentVerification onSuccess={handleBackToDashboard} />

              <div className="space-y-3">
                <Button
                  onClick={handleBackToDashboard}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>

              <div className="text-xs text-center text-muted-foreground space-y-1">
                <p>If you encounter any issues, please contact support.</p>
                <p>Your payment reference will be available in your transaction history.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};