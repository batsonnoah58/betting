import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Lock, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginPrompt: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="text-center py-8">
      <Card className="max-w-md mx-auto shadow-betting">
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2 text-xl">
            <Lock className="h-6 w-6 text-primary" />
            <span>Login Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Create an account or login to place bets and manage your wallet.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure betting platform</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>Free registration</span>
            </div>
          </div>
          
          <div className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Already have an account? Login to continue
            </p>
            <Button variant="gradient" className="w-full" onClick={() => navigate('/login')}>
              Login / Register
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 