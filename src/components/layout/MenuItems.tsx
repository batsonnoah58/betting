import { Home, Clock, BarChart3, Users } from 'lucide-react';

export const menuItems = [
  { icon: Home, label: 'Home', path: '/', adminOnly: false },
  { icon: Clock, label: 'Live Games', path: '/games', adminOnly: false },
  { icon: BarChart3, label: 'Bet History', path: '/bet-history', adminOnly: false },
  { icon: Users, label: 'Admin Panel', path: '/admin', adminOnly: true },
];
