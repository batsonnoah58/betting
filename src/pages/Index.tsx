import React from 'react';
import { AuthProvider } from '../components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import Header from '../components/layout/Header';
import { GamesList } from '../components/games/GamesList';
import { LoginPrompt } from '../components/auth/LoginPrompt';
import { Toaster } from '../components/ui/toaster';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';
import { Footer } from "../components/layout/Footer";
import { CustomTabs } from '../components/ui/tabs';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('highlights');
  const [showBetslip, setShowBetslip] = React.useState(false);
  const tabs = [
    { label: 'Highlights', value: 'highlights' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Countries', value: 'countries' },
    { label: 'Quick-e', value: 'quick-e' },
  ];

  useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  // If user is logged in and not admin, show Dashboard (for wallet, etc.)
  if (user && !user.isAdmin) {
    return (
      <>
        <Dashboard />
        <Toaster />
      </>
    );
  }

  // Otherwise, show the public index page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 pb-16">
      <Header />
      <CustomTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {/* Welcome/How it works section */}
      <section className="w-full max-w-2xl mx-auto bg-card rounded-lg shadow-card p-3 md:p-6 mb-4 md:mb-6 mt-2 border border-primary/10 animate-fade-in">
        <h2 className="text-lg md:text-2xl font-bold mb-2 text-primary">Welcome to BetWise!</h2>
        <p className="text-sm md:text-base text-muted-foreground mb-2">Get daily sure football odds, expert tips, and bet securely. Odds are now free and visible to all users. Place bets and withdraw your winnings instantly!</p>
        <ul className="list-disc list-inside text-xs md:text-sm text-muted-foreground pl-2 space-y-1">
          <li>Browse today's matches and tips below</li>
          <li>Sign up or log in to place bets and manage your wallet</li>
          <li>All odds and tips are updated daily</li>
        </ul>
      </section>
      <main className="container mx-auto px-2 md:px-4 lg:px-6 py-2 md:py-6 space-y-4 md:space-y-6 w-full max-w-full">
        {/* Render content based on activeTab if needed */}
        <GamesList />
        <LoginPrompt />
      </main>
      <Toaster />
      {/* <Footer isAdmin={user?.isAdmin} /> */}
    </div>
  );
};

export default Index;
