import React, { createContext, useContext, useEffect, useState } from 'react';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  fullName: string;
  walletBalance: number;
  isAdmin: boolean;
  dailyAccessGrantedUntil?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateWallet: (amount: number) => void;
  grantDailyAccess: () => void;
  hasDailyAccess: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      console.log('Fetched roles for user:', roles); // DEBUG

      const isAdmin = roles?.some(r => r.role === 'admin') || false;

      if (profile) {
        const userObj = {
          id: profile.id,
          email: session?.user?.email || '',
          fullName: profile.full_name,
          walletBalance: Number(profile.wallet_balance),
          isAdmin,
          dailyAccessGrantedUntil: profile.daily_access_granted_until
        };
        console.log('User object:', userObj); // DEBUG
        return userObj;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(null); // Clear user first
        
        // Defer async operations to prevent blocking
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id).then((userProfile) => {
              setUser(userProfile);
              setIsLoading(false);
            });
          }, 0);
        } else {
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id).then((userProfile) => {
          setUser(userProfile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Remove session dependency to prevent recursion

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Login error:', error.message);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (fullName: string, email: string, password: string): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateWallet = async (amount: number) => {
    if (user) {
      const newBalance = user.walletBalance + amount;
      
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      if (!error) {
        // Update local state
        setUser({ ...user, walletBalance: newBalance });
        
        // Add transaction record
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: amount > 0 ? 'deposit' : 'bet_placed',
            amount: Math.abs(amount),
            description: amount > 0 ? 'Wallet deposit' : 'Bet placed'
          });
      }
    }
  };

  const grantDailyAccess = async () => {
    if (user) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const newBalance = user.walletBalance - 500;
      
      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          daily_access_granted_until: tomorrow.toISOString(),
          wallet_balance: newBalance
        })
        .eq('id', user.id);

      if (!error) {
        // Update local state
        setUser({ 
          ...user, 
          dailyAccessGrantedUntil: tomorrow.toISOString(),
          walletBalance: newBalance
        });
        
        // Add transaction record
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'subscription',
            amount: 500,
            description: 'Daily subscription fee'
          });
      }
    }
  };

  const hasDailyAccess = (): boolean => {
    if (!user?.dailyAccessGrantedUntil) return false;
    return new Date() < new Date(user.dailyAccessGrantedUntil);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      signup, 
      logout, 
      updateWallet, 
      grantDailyAccess, 
      hasDailyAccess 
    }}>
      {user ? children : <AuthPrompt />}
    </AuthContext.Provider>
  );
};

const AuthPrompt: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">⚽ BetWise</h1>
          <p className="text-muted-foreground">Your trusted football betting partner</p>
        </div>
        
        {isLogin ? <LoginForm /> : <SignupForm />}
        
        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};