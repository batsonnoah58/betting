import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Gamepad2, ListChecks, Trophy, Settings } from 'lucide-react';

const adminNavItems = [
  { label: 'Dashboard', icon: Home, path: '/admin' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Games', icon: Gamepad2, path: '/admin/games' },
  { label: 'Results', icon: ListChecks, path: '/admin/results' },
  { label: 'Leagues', icon: Trophy, path: '/admin/leagues' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const AdminBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Only show on /admin and subroutes
  if (!location.pathname.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[#10151c] border-t border-green-600 flex justify-between items-center px-1 sm:px-2 py-1 z-50 shadow-lg md:hidden">
      {adminNavItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            className={`flex flex-col items-center flex-1 py-2 gap-0.5 ${active ? 'text-green-400' : 'text-white'}`}
            style={{ minWidth: 0 }}
            onClick={() => navigate(item.path)}
          >
            <item.icon className={`h-6 w-6 ${active ? 'text-green-400' : 'text-white'}`} />
            <span className={`text-[11px] sm:text-xs ${active ? 'text-green-400 font-bold' : 'text-white'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default AdminBottomNav; 