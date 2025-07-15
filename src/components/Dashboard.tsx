import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from './layout/Header';
import { WalletSection } from './wallet/WalletSection';
import { TransactionHistory } from './wallet/TransactionHistory';
import { GamesList } from './games/GamesList';
import { AdminDashboard } from './admin/AdminDashboard';
import { LoginPrompt } from './auth/LoginPrompt';
import { BottomNav } from './layout/BottomNav';
import { BetslipDrawer } from './betslip/BetslipDrawer';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [showBetslip, setShowBetslip] = useState(false);

  // Wait for user to be loaded before rendering
  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user?.isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Welcome/How it works section */}
      <section className="w-full max-w-2xl mx-auto bg-card rounded-xl shadow-card p-3 md:p-6 mb-4 md:mb-6 mt-4 border border-border animate-fade-in">
        <h2 className="text-lg md:text-2xl font-bold mb-2 text-primary">Welcome to BettWise!</h2>
        <p className="text-sm md:text-base text-muted-foreground mb-2">Get daily sure football odds, expert tips, and bet securely. Odds are now free and visible to all users. Place bets and withdraw your winnings instantly!</p>
        <ul className="list-disc list-inside text-xs md:text-sm text-muted-foreground pl-2 space-y-1">
          <li>Browse today's matches and tips below</li>
          <li>Sign up or log in to place bets and manage your wallet</li>
          <li>All odds and tips are updated daily</li>
        </ul>
      </section>
      <main className="container mx-auto px-2 md:px-4 lg:px-6 py-2 md:py-6 space-y-4 md:space-y-6 w-full max-w-full">
        <div className="bg-card border border-border rounded-xl shadow-card p-3 md:p-4 mb-4 w-full">
          <WalletSection />
          <TransactionHistory />
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card p-3 md:p-4 w-full">
          <GamesList />
        </div>
      </main>
    </div>
  );
};