import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC<{ isAdmin?: boolean }> = ({ isAdmin }) => {
  return (
    <footer className="bg-card/90 border-t border-border shadow-inner mt-8 py-6 px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">⚽ BetWise</span>
          <span className="text-xs text-muted-foreground font-medium">&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/games" className="hover:text-primary transition-colors">Games</Link>
          <Link to="/bet-history" className="hover:text-primary transition-colors">My Bets</Link>
          {isAdmin && <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>}
          <a href="mailto:support@betwise.com" className="hover:text-primary transition-colors">Contact</a>
        </nav>
      </div>
    </footer>
  );
}; 