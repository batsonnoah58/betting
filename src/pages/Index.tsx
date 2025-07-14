import React from 'react';
import { AuthProvider, useAuth } from '../components/AuthGuard';
import { Header } from '../components/layout/Header';
import { GamesList } from '../components/games/GamesList';
import { LoginPrompt } from '../components/auth/LoginPrompt';
import { Toaster } from '../components/ui/toaster';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  // If user is logged in and not admin, show Dashboard (for wallet, etc.)
  if (user && !user.isAdmin) {
    return (
      <AuthProvider>
        <Dashboard />
        <Toaster />
      </AuthProvider>
    );
  }

  // Otherwise, show the public index page
  return (
    <AuthProvider>
      <Header />
      {/* Welcome/How it works section */}
      <section className="w-full max-w-2xl mx-auto bg-card rounded-lg shadow-card p-4 md:p-6 mb-6 mt-2 border border-primary/10 animate-fade-in">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-primary">Welcome to BetWise!</h2>
        <p className="text-muted-foreground mb-2">Get daily sure football odds, expert tips, and bet securely. Sign up or log in to unlock today’s premium odds. Odds are blurred until you subscribe.</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
          <li>Browse today’s matches and tips below</li>
          <li>Sign up or log in to unlock odds and place bets</li>
          <li>All odds and tips are updated daily</li>
        </ul>
      </section>
      <main className="container mx-auto px-2 md:px-4 lg:px-6 py-4 md:py-6 space-y-6 w-full max-w-full">
        <GamesList />
        <LoginPrompt />
      </main>
      <Toaster />
    </AuthProvider>
  );
};

export default Index;
