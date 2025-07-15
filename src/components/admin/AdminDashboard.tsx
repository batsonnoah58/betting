import React, { useState } from 'react';
import Header from '../layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Settings, Users, Trophy, DollarSign, Calendar, BarChart3, List, Flag } from 'lucide-react';
import { AdminGamesManager } from './AdminGamesManager';
import { AdminResultsManager } from './AdminResultsManager';
import { AdminTeamsManager } from './AdminTeamsManager';
import { AdminLeaguesManager } from './AdminLeaguesManager';
import { AdminUsersManager } from './AdminUsersManager';
import { AdminBetSettlement } from './AdminBetSettlement';
import { BottomNav } from '../layout/BottomNav';
import AdminBottomNav from '../layout/AdminBottomNav';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'results' | 'teams' | 'leagues' | 'users' | 'bets'>('overview');

  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Active Games',
      value: '24',
      change: '+3',
      icon: Trophy,
      color: 'text-green-600'
    },
    {
      title: 'Daily Revenue',
      value: 'KES 45,600',
      change: '+8%',
      icon: DollarSign,
      color: 'text-primary'
    },
    {
      title: 'Total Bets Today',
      value: '186',
      change: '+15%',
      icon: BarChart3,
      color: 'text-purple-600'
    }
  ];

  type TabId = 'overview' | 'games' | 'results' | 'teams' | 'leagues' | 'users' | 'bets';
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'games', label: 'Games', icon: Trophy },
    { id: 'results', label: 'Results', icon: List },
    { id: 'bets', label: 'Bets', icon: DollarSign },
    { id: 'teams', label: 'Teams', icon: Calendar },
    { id: 'leagues', label: 'Leagues', icon: Flag },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 pb-16">
      {/* <Header /> */}
      <BottomNav user={{ id: 'admin', email: 'admin@betwise.com', isAdmin: true }} onBetslipClick={() => {}} />
      <AdminBottomNav />
      <div className="container mx-auto px-2 md:px-4 lg:px-6 py-2 md:py-6 w-full max-w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-2 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center space-x-2">
              <Settings className="h-8 w-8" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your BetWise platform</p>
          </div>
          <Badge variant="default" className="bg-gradient-primary">
            Administrator
          </Badge>
        </div>
        {/* Tab Navigation */}
        <div className="flex flex-wrap space-x-1 mb-4 md:mb-6 bg-muted/50 p-1 rounded-lg w-full md:w-fit gap-y-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 ${activeTab === tab.id ? 'bg-card text-foreground border border-border shadow-betting' : 'bg-muted text-muted-foreground border border-border hover:bg-muted/70'}`}
            >
              <tab.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        {activeTab === 'overview' && (
          <div className="space-y-4 md:space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="shadow-betting w-full">
                  <CardContent className="p-3 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-lg md:text-2xl font-bold mt-1">{stat.value}</p>
                        <p className="text-xs md:text-sm text-success mt-1">{stat.change}</p>
                      </div>
                      <stat.icon className={`h-8 w-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'games' && <AdminGamesManager />}
        {activeTab === 'results' && <AdminResultsManager />}
        {activeTab === 'bets' && <AdminBetSettlement />}
        {activeTab === 'teams' && <AdminTeamsManager />}
        {activeTab === 'leagues' && <AdminLeaguesManager />}
      </div>
    </div>
  );
};