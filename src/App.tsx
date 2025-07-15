import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BetHistory from "./pages/BetHistory";
import Games from "./pages/Games";
import { AuthProvider } from "./components/AuthGuard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { BetslipProvider } from "./components/betslip/BetslipContext";
import Profile from "./pages/Profile";
import WalletPage from "./pages/Wallet";
import Settings from "./pages/Settings";
import Live from "./pages/Live";
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Joyride from 'react-joyride';
import AdminLayout from './components/layout/AdminLayout';
import AdminUsersManager from './pages/admin/Users';
import AdminGamesManager from './pages/admin/Games';
import AdminResultsManager from './pages/admin/Results';
import AdminLeaguesManager from './pages/admin/Leagues';
import AdminSettings from './pages/admin/Settings';
import { BetslipDrawer } from './components/betslip/BetslipDrawer';
import { BottomNav } from './components/layout/BottomNav';

const queryClient = new QueryClient();

const tourSteps = [
  {
    target: '#header',
    content: 'Welcome! This is the main header where you can navigate the app.',
    placement: 'bottom' as const,
  },
  {
    target: '.games-list',
    content: 'Browse today\'s games and select your favorites to bet on.',
    placement: 'bottom' as const,
  },
  {
    target: '.place-bet-btn',
    content: 'Click here to add a bet to your betslip.',
    placement: 'top' as const,
  },
  {
    target: '.betslip-drawer',
    content: 'Your betslip will appear here as you add bets. Review and place your multi-bet!',
    placement: 'left' as const,
  },
  {
    target: '.deposit-btn',
    content: 'Deposit funds to your wallet to start betting.',
    placement: 'bottom' as const,
  },
  {
    target: '.bottom-nav',
    content: 'Use this bottom navigation on mobile to quickly access key sections.',
    placement: 'top' as const,
  },
  {
    target: '.bet-history-section',
    content: 'View your past bets and track your betting history here.',
    placement: 'top' as const,
  },
  {
    target: '.profile-link',
    content: 'Access your profile and account settings here.',
    placement: 'bottom' as const,
  },
  {
    target: '.settings-section',
    content: 'Manage your account, theme, and logout from the settings page.',
    placement: 'top' as const,
  },
];

// Context to allow triggering the tour from anywhere
export const OnboardingTourContext = createContext<{ startTour: () => void } | undefined>(undefined);

const App = () => {
  const [tourRun, setTourRun] = useState(() => !localStorage.getItem('onboardingTourComplete'));
  const [tourKey, setTourKey] = useState(0); // force Joyride rerender

  const startTour = useCallback(() => {
    setTourRun(true);
    setTourKey(k => k + 1);
  }, []);

  const handleTourCallback = useCallback((data: any) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      setTourRun(false);
      localStorage.setItem('onboardingTourComplete', 'true');
    }
  }, []);

  return (
    <OnboardingTourContext.Provider value={{ startTour }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Joyride
            key={tourKey}
            steps={tourSteps}
            run={tourRun}
            continuous
            showSkipButton
            showProgress
            styles={{ options: { zIndex: 10000 } }}
            callback={handleTourCallback}
          />
          <BrowserRouter>
            <AuthProvider>
              <BetslipProvider>
                <BetslipDrawer />
                <BottomNav onBetslipClick={() => {}} />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/games" element={<Games />} />
                  <Route path="/live" element={<Live />} />
                  <Route path="/bet-history" element={<BetHistory />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsersManager />} />
                    <Route path="games" element={<AdminGamesManager />} />
                    <Route path="results" element={<AdminResultsManager />} />
                    <Route path="leagues" element={<AdminLeaguesManager />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  <Route path="/login" element={<LoginForm />} />
                  <Route path="/signup" element={<SignupForm />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BetslipProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </OnboardingTourContext.Provider>
  );
};

export default App;
