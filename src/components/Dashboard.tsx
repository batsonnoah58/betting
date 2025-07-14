import React, { useState } from 'react';
import { useAuth } from './AuthGuard';
import { Header } from './layout/Header';
import { WalletSection } from './wallet/WalletSection';
import { TransactionHistory } from './wallet/TransactionHistory';
import { GamesList } from './games/GamesList';
import { AdminDashboard } from './admin/AdminDashboard';
import { LoginPrompt } from './auth/LoginPrompt';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Wait for user to be loaded before rendering
  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user?.isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <Header />
      {/* Welcome/How it works section */}
      <section className="w-full max-w-2xl mx-auto bg-card rounded-lg shadow-card p-4 md:p-6 mb-6 mt-2 border border-primary/10 animate-fade-in">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-primary">Welcome to BetWise!</h2>
        <p className="text-muted-foreground mb-2">Get daily sure football odds, expert tips, and bet securely. Odds are now free and visible to all users. Place bets and withdraw your winnings instantly!</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
          <li>Browse today’s matches and tips below</li>
          <li>Sign up or log in to place bets and manage your wallet</li>
          <li>All odds and tips are updated daily</li>
        </ul>
      </section>
      
      <main className="container mx-auto px-2 md:px-4 lg:px-6 py-4 md:py-6 space-y-6 w-full max-w-full">
        <WalletSection />
        <TransactionHistory />
        <GamesList />
      </main>
    </div>
  );
};