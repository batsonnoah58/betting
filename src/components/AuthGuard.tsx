import React, { useEffect, useState, useCallback } from 'react';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { AuthContext, useAuth, User, AuthContextType } from '@/contexts/AuthContext';

// Move fetchUserProfile outside the component so it is stable and not a dependency
async function fetchUserProfile(userId: string, session: Session | null) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Only fetch roles for this user
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const isAdmin = roles?.some(r => r.role === 'admin') || false;

    if (profile) {
      const userObj = {
        id: profile.id,
        email: session?.user?.email || '',
        fullName: profile.full_name,
        walletBalance: Number(profile.wallet_balance),
        isAdmin,
      };
      return userObj;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Set up auth state listener ONCE
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(null);
        if (session?.user) {
          fetchUserProfile(session.user.id, session).then((userProfile) => {
            setUser(userProfile);
            setLastUserId(session.user.id);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      }
    );
    // Check for existing session ONCE
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id, session).then((userProfile) => {
          setUser(userProfile);
          setLastUserId(session.user.id);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Only fetch user profile if session.user.id changes
  useEffect(() => {
    if (session?.user && session.user.id !== lastUserId) {
      fetchUserProfile(session.user.id, session).then((userProfile) => {
        setUser(userProfile);
        setLastUserId(session.user.id);
      });
    }
  }, [session, lastUserId]);

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

  const refreshUser = async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user.id, session);
      setUser(userProfile);
      }
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
      refreshUser
    }}>
      {children}
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