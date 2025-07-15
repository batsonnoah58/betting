import React, { useState } from 'react';
import { useAuth } from '../AuthGuard';
import { Button } from '../ui/button';
import { LogOut, User, Settings, Menu, X, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border shadow-lg sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent drop-shadow-glow tracking-tight animate-fade-in">
              ⚽ BetWise
            </h1>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block font-medium tracking-wide animate-fade-in">
              Football Betting Platform
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-5">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-base shadow-glow">
                    {user.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <span className="font-semibold hidden lg:inline text-foreground">{user.fullName}</span>
                  <span className="font-semibold lg:hidden text-foreground">{user.fullName.split(' ')[0]}</span>
                  {/* Wallet balance */}
                  <div className="flex items-center ml-3 px-2 py-1 rounded-lg bg-success/10 text-success text-xs font-bold shadow-card animate-fade-in">
                    <Wallet className="h-4 w-4 mr-1 text-success" />
                    KES {user.walletBalance?.toLocaleString()}
                  </div>
                </div>
                {user && (
                  <Link to="/games">
                    <Button variant="outline" size="sm" className="nav-anim text-muted-foreground hover:text-foreground rounded-full px-5 py-2 font-semibold">
                      Browse Games
                    </Button>
                  </Link>
                )}
                {user && !user.isAdmin && (
                  <Link to="/bet-history">
                    <Button variant="outline" size="sm" className="nav-anim text-muted-foreground hover:text-foreground rounded-full px-5 py-2 font-semibold">
                      My Bets
                    </Button>
                  </Link>
                )}
                {user?.isAdmin && (
                  <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-md animate-fade-in">
                    <Settings className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium text-primary">Admin</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout}
                  className="nav-anim text-muted-foreground hover:text-destructive rounded-full px-5 py-2 font-semibold"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="nav-anim text-primary font-semibold rounded-full px-5 py-2">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="default" size="sm" className="nav-anim font-semibold rounded-full px-5 py-2">Sign Up</Button>
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
          <div className="md:hidden mt-4 flex flex-col space-y-3 animate-fade-in bg-card rounded-lg p-4 shadow-card border border-border transition-all duration-300 ease-out">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm mb-3 p-3 bg-muted/50 rounded-lg animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-base shadow-glow">
                    {user.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <span className="font-medium text-foreground">{user.fullName}</span>
                  <div className="flex items-center ml-3 px-2 py-1 rounded-lg bg-success/10 text-success text-xs font-bold shadow-card animate-fade-in">
                    <Wallet className="h-4 w-4 mr-1 text-success" />
                    KES {user.walletBalance?.toLocaleString()}
                  </div>
                </div>
                {user && (
                  <Link to="/games" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="nav-anim w-full justify-start h-12 text-base rounded-full font-semibold">Browse Games</Button>
                  </Link>
                )}
                {user && !user.isAdmin && (
                  <Link to="/bet-history" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="nav-anim w-full justify-start h-12 text-base rounded-full font-semibold">My Bets</Button>
                  </Link>
                )}
                {user?.isAdmin && (
                  <div className="flex items-center space-x-2 bg-primary/10 px-3 py-2 rounded-lg mb-3 animate-fade-in">
                    <Settings className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Admin Panel</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setMobileMenuOpen(false); logout(); }}
                  className="nav-anim w-full justify-start h-12 text-base text-destructive hover:text-destructive rounded-full font-semibold"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="nav-anim w-full justify-center h-12 text-base text-primary font-semibold rounded-full">Login</Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="sm" className="nav-anim w-full justify-center h-12 text-base font-semibold rounded-full">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};