import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '../components/ui/button';
import { BottomNav } from '../components/layout/BottomNav';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2">
      <BottomNav user={{ id: 'guest', email: 'guest@betwise.com' }} onBetslipClick={() => {}} />
      <div className="text-center bg-card border border-border rounded-xl shadow-card p-6 md:p-8 w-full max-w-md mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-primary">404</h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <Button asChild variant="gradient" className="mt-2">
          <a href="/">Return to Home</a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
