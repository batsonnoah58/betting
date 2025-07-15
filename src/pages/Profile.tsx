import React from 'react';
import Header from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Wallet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '../components/ui/tabs';
import { OnboardingTourContext } from '../App';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tourCtx = React.useContext(OnboardingTourContext);

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
        <Card className="shadow-betting bg-card border border-border text-foreground">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <Wallet className="h-7 w-7 text-accent" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-accent-foreground font-bold text-3xl shadow-glow">
                {user.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
              <div className="text-lg font-semibold text-foreground">{user.fullName}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            {/* Show Tour Button */}
            <div className="flex justify-center">
              <Button variant="outline" className="mt-2" onClick={() => tourCtx?.startTour()}>
                Show App Tour
              </Button>
            </div>
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Wallet className="h-5 w-5 text-success" />
              <span className="text-lg font-bold text-success">KES {user.walletBalance?.toLocaleString()}</span>
            </div>
            <Button variant="gradient" className="w-full mt-4" onClick={() => navigate('/wallet')}>
              Go to Wallet
            </Button>
          </CardContent>
        </Card>
      </main>
      <BottomNav user={user} onBetslipClick={() => {}} />
    </div>
  );
};

export default Profile; 