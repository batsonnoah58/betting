import React from 'react';
import Header from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { LogOut, Sun, Moon } from 'lucide-react';
import { Tabs } from '../components/ui/tabs';

const Settings = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(true);

  // Theme toggle handler (for demonstration)
  const handleThemeToggle = () => {
    setDarkMode((prev) => !prev);
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

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
        <Card className="settings-section shadow-betting bg-card border border-border text-foreground">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <span>Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground flex items-center gap-2">
                <Sun className="h-5 w-5 text-accent" />
                <span>Dark Mode</span>
              </span>
              <Switch checked={darkMode} onCheckedChange={handleThemeToggle} />
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <Button variant="outline" className="w-full" onClick={logout}>
                <LogOut className="h-5 w-5 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav user={user} onBetslipClick={() => {}} />
    </div>
  );
};

export default Settings; 