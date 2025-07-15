import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Search, Home, Clock, BarChart3, User, Settings, Wallet } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { ActionButton } from '../ui/ActionButton';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs } from '../ui/tabs';

interface MenuItem {
  icon: React.ComponentType<React.ComponentProps<'svg'>>;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Clock, label: 'Live Games', path: '/live' },
  { icon: BarChart3, label: 'Bet History', path: '/bet-history' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
];

interface MobileMenuProps {
  onClose: () => void;
  user: { id: string; email: string; fullName?: string; isAdmin?: boolean; walletBalance?: number };
  onBetslipClick: () => void;
  onLogout: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ onClose, user, onBetslipClick, onLogout }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' } as const,
    { icon: Clock, label: 'Live Games', path: '/live' } as const,
    { icon: BarChart3, label: 'Bet History', path: '/bet-history' } as const,
    { icon: User, label: 'Profile', path: '/profile' } as const,
    { icon: Settings, label: 'Settings', path: '/settings' } as const,
    { icon: Wallet, label: 'Wallet', path: '/wallet' } as const,
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-card shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-xs"
            />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-glow">
                  {user.fullName.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div>
                  <span className="font-medium">{user.fullName}</span>
                  <div className="flex items-center space-x-1 mt-1">
                    <Wallet className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">KES {user.walletBalance?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-2 p-4">
            {menuItems.map((item) => (
              <ActionButton
                key={item.label}
                type="link"
                variant="ghost"
                size="sm"
                icon={item.icon}
                label={item.label}
                to={item.path}
                onClick={onClose}
                className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path ? 'bg-muted/50' : 'hover:bg-muted/50'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-2">
            <ActionButton
              type="button"
              variant="gradient"
              size="sm"
              icon={Wallet}
              label="My Betslip"
              onClick={onBetslipClick}
              className="w-full justify-start"
            />
            <ActionButton
              type="button"
              variant="ghost"
              size="sm"
              icon={X}
              label="Logout"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full justify-start text-destructive"
            />
          </div>

          {/* Auth Buttons */}
          {!user && (
            <div className="p-4 space-y-2">
              <ActionButton
                type="link"
                variant="outline"
                size="sm"
                icon={User}
                label="Login"
                to="/login"
                onClick={onClose}
                className="w-full justify-center"
              />
              <ActionButton
                type="link"
                variant="default"
                size="sm"
                icon={User}
                label="Sign Up"
                to="/signup"
                onClick={onClose}
                className="w-full justify-center"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
