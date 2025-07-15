import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, LogOut, User, Menu, X, Settings, Home, Clock, BarChart3, Bell } from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import { BottomNav } from './BottomNav';
import { ActionButton } from '../ui/ActionButton';
import { BetslipDrawer } from '../../components/betslip/BetslipDrawer';
import { LoginPrompt } from '../../components/auth/LoginPrompt';
import { Button } from '../ui/button';
import { Tabs } from '../ui/tabs';
import { DepositModal } from '../wallet/DepositModal';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const menuItems = [
  {
    label: 'Home',
    path: '/',
    icon: Home
  },
  {
    label: 'Live Games',
    path: '/games',
    icon: Clock
  },
  {
    label: 'Bet History',
    path: '/bet-history',
    icon: BarChart3
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: User
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings
  }
];

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBetslip, setShowBetslip] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  // Notification count example
  const notificationCount = 6;
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBetslipClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      setShowBetslip(true);
    }
  };

  return (
    <>
      <header id="header" className="w-full bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))] border-b border-border shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-3 px-2 sm:px-4 gap-2 md:gap-0">
          <div className="flex items-center space-x-4 mb-2 md:mb-0">
            <Link to="/" className="flex items-center group">
              <span className="text-xl md:text-2xl font-extrabold tracking-wide text-foreground">BETT</span>
              <span className="text-xl md:text-2xl font-extrabold tracking-wide text-foreground relative">
                WISE
                <span className="absolute left-0 -bottom-1 w-full h-1 bg-destructive rounded group-hover:bg-accent transition-colors"></span>
              </span>
            </Link>
          </div>
          {/* Desktop Navigation Menu */}
          <nav className="hidden md:flex items-center space-x-4">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} className="flex items-center space-x-1 px-3 py-2 rounded hover:bg-accent/10 text-foreground font-medium">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
            {user && (
              <Button variant="outline" className="ml-2" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            )}
          </nav>
          {/* End Desktop Navigation Menu */}
          <div className="flex items-center space-x-2 md:hidden">
            <Button
              variant="gradient"
              className="deposit-btn rounded-full px-4 md:px-6 py-2 font-semibold text-sm md:text-base shadow-betting hover:scale-105 transition-transform duration-150 border-0 animate-pulse-glow"
              onClick={() => setShowDepositModal(true)}
            >
              Deposit
            </Button>
            <button className="relative w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full" onClick={() => navigate('/notifications')}>
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-bold">6</span>
            </button>
            <button className="w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full" onClick={() => setMobileMenuOpen(true)}>
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {user && (
              <button onClick={() => navigate('/profile')} className="profile-link w-9 h-9 flex items-center justify-center bg-card border border-border rounded-full ml-1 focus:outline-none focus:ring-2 focus:ring-primary">
                <span className="sr-only">Profile</span>
                <Avatar>
                  <AvatarFallback>{user.fullName?.split(' ').map(n => n[0]).join('').slice(0,2) || 'U'}</AvatarFallback>
                </Avatar>
              </button>
            )}
            {user && (
              <Button variant="outline" className="ml-2" onClick={logout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            )}
          </div>
        </div>
      </header>
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <MobileMenu
          onClose={() => setMobileMenuOpen(false)}
          user={user}
          onBetslipClick={handleBetslipClick}
          onLogout={logout}
        />
      )}
      {/* Bottom Navigation */}
      <BottomNav
        onBetslipClick={handleBetslipClick}
      />
      {/* Betslip Drawer and Login Prompt */}
      <BetslipDrawer open={showBetslip} onOpenChange={setShowBetslip} />
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
      {showDepositModal && (
        <DepositModal onClose={() => setShowDepositModal(false)} />
      )}
    </>
  );
};

export default Header;