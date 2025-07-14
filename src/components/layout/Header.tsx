import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { LogOut, User, Settings, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold text-primary">⚽ BetWise</h1>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Football Betting Platform
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium hidden lg:inline">{user.fullName}</span>
                  <span className="font-medium lg:hidden">{user.fullName.split(' ')[0]}</span>
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
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-primary font-semibold">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default" size="sm" className="font-semibold">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Hamburger for mobile */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 flex flex-col space-y-3 animate-fade-in bg-card rounded-lg p-4 shadow-card border border-border">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm mb-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.fullName}</span>
                </div>
                {user && (
                  <Link to="/games" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-start h-12 text-base">
                      Browse Games
                    </Button>
                  </Link>
                )}
                {user && !user.isAdmin && (
                  <Link to="/bet-history" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full justify-start h-12 text-base">
                      My Bets
                    </Button>
                  </Link>
                )}
                {user?.isAdmin && (
                  <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg mb-3">
                    <Settings className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Admin Panel</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="w-full justify-start h-12 text-base text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-center h-12 text-base text-primary font-semibold">Login</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="sm" className="w-full justify-center h-12 text-base font-semibold">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};