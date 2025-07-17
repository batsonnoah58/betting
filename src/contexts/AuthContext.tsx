import React, { createContext, useContext } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string;
  walletBalance: number;
  isAdmin: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateWallet: (amount: number) => void;
  refreshUser: () => Promise<void>;
      }

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
