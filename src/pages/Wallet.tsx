import React, { useState } from 'react';
import Header from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DepositModal } from '../components/wallet/DepositModal';
import { WithdrawModal } from '../components/wallet/WithdrawModal';
import { TransactionHistory } from '../components/wallet/TransactionHistory';
import { Tabs } from '../components/ui/tabs';

const WalletPage = () => {
  const { user } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 pb-16">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 max-w-lg">
        <Card className="shadow-betting">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <Wallet className="h-7 w-7 text-yellow-400" />
              <span>Wallet</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center space-x-2 mt-2">
              <Wallet className="h-5 w-5 text-success" />
              <span className="text-lg font-bold text-success">KES {user.walletBalance?.toLocaleString()}</span>
            </div>
            <div className="flex gap-4 mt-4">
              <Button variant="gradient" className="flex-1" onClick={() => setShowDeposit(true)}>
                Deposit
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowWithdraw(true)}>
                Withdraw
              </Button>
            </div>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 text-white">Transaction History</h3>
              <TransactionHistory />
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav user={user} onBetslipClick={() => {}} />
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} />}
    </div>
  );
};

export default WalletPage; 