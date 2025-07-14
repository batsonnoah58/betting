import React, { useState } from 'react';
import { useAuth } from './AuthGuard';
import { Header } from './layout/Header';
import { WalletSection } from './wallet/WalletSection';
import { DailySubscriptionModal } from './subscription/DailySubscriptionModal';
import { PaymentVerification } from './payment/PaymentVerification';
import { GamesList } from './games/GamesList';
import { AdminDashboard } from './admin/AdminDashboard';
import { LoginPrompt } from './auth/LoginPrompt';

export const Dashboard: React.FC = () => {
  const { user, hasDailyAccess } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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
        <p className="text-muted-foreground mb-2">Get daily sure football odds, expert tips, and bet securely. Sign up or log in to unlock today’s premium odds. Odds are blurred until you subscribe.</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
          <li>Browse today’s matches and tips below</li>
          <li>Sign up or log in to unlock odds and place bets</li>
          <li>Pay KES 500 to access today’s premium odds</li>
          <li>All odds and tips are updated daily</li>
        </ul>
      </section>
      
      <main className="container mx-auto px-2 md:px-4 lg:px-6 py-4 md:py-6 space-y-6 w-full max-w-full">
        <PaymentVerification />
        
        {user ? (
          <>
            <WalletSection />
            
            {hasDailyAccess() ? (
              <GamesList showBlurredOdds={false} />
            ) : (
              <>
                <GamesList showBlurredOdds={true} />
                <div className="text-center py-6 md:py-8">
                  <div className="w-full max-w-md mx-auto bg-card p-4 md:p-8 rounded-lg shadow-card">
                    <h2 className="text-2xl font-bold mb-4">Unlock Today's Sure Odds</h2>
                    <p className="text-muted-foreground mb-6">
                      Pay KES 500 to unlock today's premium betting tips and odds
                    </p>
                    <button
                      onClick={() => setShowSubscriptionModal(true)}
                      className="bg-gradient-primary text-primary-foreground w-full md:w-auto px-6 py-3 rounded-lg font-semibold hover:shadow-glow transition-all duration-200 transform hover:scale-105"
                    >
                      Unlock Today's Odds - KES 500
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <GamesList showBlurredOdds={true} />
            <LoginPrompt />
          </>
        )}
      </main>

      {showSubscriptionModal && (
        <DailySubscriptionModal onClose={() => setShowSubscriptionModal(false)} />
      )}
    </div>
  );
};