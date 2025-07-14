import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { History, TrendingUp, TrendingDown, Plus, Minus, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Transaction {
  id: number;
  type: string; // Allow any string type from database
  amount: number;
  description: string;
  created_at: string;
}

export const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Plus className="h-4 w-4 text-success" />;
      case 'withdrawal':
        return <Minus className="h-4 w-4 text-destructive" />;
      case 'bet_placed':
        return <TrendingDown className="h-4 w-4 text-warning" />;
      case 'bet_won':
        return <TrendingUp className="h-4 w-4 text-success" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants = {
      deposit: { className: 'bg-success/10 text-success', text: 'Deposit' },
      withdrawal: { className: 'bg-destructive/10 text-destructive', text: 'Withdrawal' },
      bet_placed: { className: 'bg-warning/10 text-warning', text: 'Bet Placed' },
      bet_won: { className: 'bg-success/10 text-success', text: 'Bet Won' }
    };
    return variants[type as keyof typeof variants] || { className: 'bg-muted text-muted-foreground', text: type };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="shadow-betting animate-fade-in">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-betting animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <History className="h-5 w-5 text-primary" />
          <span>Transaction History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your deposits, withdrawals, and betting activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const badge = getTransactionBadge(transaction.type);
              const isPositive = transaction.type === 'deposit' || transaction.type === 'bet_won';
              
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {transaction.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={badge.className}>
                      {badge.text}
                    </Badge>
                    <div className={`font-semibold text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 