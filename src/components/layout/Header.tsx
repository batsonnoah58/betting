import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { LogOut, User, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-primary">⚽ BetWise</h1>
            <span className="text-sm text-muted-foreground hidden sm:block">
              Football Betting Platform
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{user?.fullName}</span>
            </div>

            {user && (
              <Link to="/games">
                <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
                  Browse Games
                </Button>
              </Link>
            )}

            {user && !user.isAdmin && (
              <Link to="/bet-history">
                <Button variant="outline" size="sm" className="text-muted-foreground hover:text-foreground">
                  My Bets
                </Button>
              </Link>
            )}

            {user?.isAdmin && (
              <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-md">
                <Settings className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Admin</span>
              </div>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Logout</span>
            </Button>
          </div>

          {/* Hamburger for mobile */}
          <button
            className="md:hidden flex items-center px-2 py-1 border rounded text-primary border-primary focus:outline-none"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col space-y-2 animate-fade-in bg-card rounded-lg p-4 shadow-card">
            <div className="flex items-center space-x-2 text-sm mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{user?.fullName}</span>
            </div>
            {user && (
              <Link to="/games" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-left">
                  Browse Games
                </Button>
              </Link>
            )}
            {user && !user.isAdmin && (
              <Link to="/bet-history" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-left">
                  My Bets
                </Button>
              </Link>
            )}
            {user?.isAdmin && (
              <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-md mb-2">
                <Settings className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">Admin</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setMobileMenuOpen(false); logout(); }}
              className="w-full text-left"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};