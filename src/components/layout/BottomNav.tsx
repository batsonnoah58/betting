import React from 'react';
import { Home, BarChart3, Ticket, User, Activity } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface BottomNavProps {
  onBetslipClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onBetslipClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState('home');
  const liveCount = 72;
  const betslipCount = 2;

  // Admin dashboard style: dark background, green accent, hide nav on /admin
  if (location.pathname.startsWith('/admin')) {
    return (
      <nav className="bottom-nav fixed bottom-0 left-0 w-full bg-[#10151c] border-t border-green-600 flex justify-between items-center px-1 sm:px-2 py-1 z-50 shadow-lg md:hidden">
        <span className="text-green-400 font-bold px-4 py-2">Admin Navigation</span>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 w-full bg-[#181A20] border-t border-border flex justify-between items-center px-1 sm:px-2 py-1 z-50 shadow-lg md:hidden">
      <button className="flex flex-col items-center flex-1 py-2 gap-0.5" style={{ minWidth: 0 }} onClick={() => { setActiveTab('home'); navigate('/'); }}>
        <Home className={`h-6 w-6 ${activeTab === 'home' ? 'text-yellow-400' : 'text-white'}`} />
        <span className={`text-[11px] sm:text-xs ${activeTab === 'home' ? 'text-yellow-400' : 'text-white'}`}>Home</span>
      </button>
      <button className="flex flex-col items-center flex-1 py-2 gap-0.5 relative" style={{ minWidth: 0 }} onClick={() => { setActiveTab('live'); navigate('/live'); }}>
        <Activity className={`h-6 w-6 ${activeTab === 'live' ? 'text-yellow-400' : 'text-white'}`} />
        {liveCount > 0 && <span className="absolute top-0 right-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{liveCount}</span>}
        <span className={`text-[11px] sm:text-xs ${activeTab === 'live' ? 'text-yellow-400' : 'text-white'}`}>Live</span>
      </button>
      <button className="flex flex-col items-center flex-1 py-2 gap-0.5 relative" style={{ minWidth: 0 }} onClick={onBetslipClick}>
        <Ticket className={`h-6 w-6 ${activeTab === 'betslip' ? 'text-yellow-400' : 'text-white'}`} />
        {betslipCount > 0 && <span className="absolute top-0 right-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">{betslipCount}</span>}
        <span className={`text-[11px] sm:text-xs ${activeTab === 'betslip' ? 'text-yellow-400' : 'text-white'}`}>Betslip</span>
      </button>
      <button className="flex flex-col items-center flex-1 py-2 gap-0.5" style={{ minWidth: 0 }} onClick={() => { setActiveTab('mybets'); navigate('/bet-history'); }}>
        <BarChart3 className={`h-6 w-6 ${activeTab === 'mybets' ? 'text-yellow-400' : 'text-white'}`} />
        <span className={`text-[11px] sm:text-xs ${activeTab === 'mybets' ? 'text-yellow-400' : 'text-white'}`}>My Bets</span>
      </button>
      <button className="flex flex-col items-center flex-1 py-2 gap-0.5" style={{ minWidth: 0 }} onClick={() => { setActiveTab('profile'); navigate('/profile'); }}>
        <User className={`h-6 w-6 ${activeTab === 'profile' ? 'text-yellow-400' : 'text-white'}`} />
        <span className={`text-[11px] sm:text-xs ${activeTab === 'profile' ? 'text-yellow-400' : 'text-white'}`}>Profile</span>
      </button>
    </nav>
  );
};
