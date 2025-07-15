import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Users, DollarSign, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

const getLast30Days = () => {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

const BET_TYPES = [
  { value: '', label: 'All Bet Types' },
  { value: 'home_win', label: 'Home Win' },
  { value: 'draw', label: 'Draw' },
  { value: 'away_win', label: 'Away Win' },
  { value: 'pending', label: 'Pending' },
];

// Utility to export array of objects to CSV
function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => row[k]).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const AdminAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalUsers: null as number | null,
    totalBets: null as number | null,
    totalRevenue: null as number | null,
    activeUsers: null as number | null,
    conversionRate: null as number | null,
    retentionRate: null as number | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signupData, setSignupData] = useState<{ date: string; count: number }[]>([]);
  const [betsData, setBetsData] = useState<{ date: string; count: number }[]>([]);
  const [revenueData, setRevenueData] = useState<{ date: string; amount: number }[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const days = getLast30Days();
    return { start: days[0], end: days[days.length - 1] };
  });
  const [betType, setBetType] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        // Total Users
        const { count: userCount, error: userErr } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        if (userErr) throw userErr;
        // Total Bets
        const { count: betCount, error: betErr } = await supabase
          .from('bets')
          .select('*', { count: 'exact', head: true });
        if (betErr) throw betErr;
        // Total Revenue
        const { data: betsData, error: betsDataErr } = await supabase
          .from('bets')
          .select('stake');
        if (betsDataErr) throw betsDataErr;
        const totalRevenue = betsData?.reduce((sum: number, b: any) => sum + Number(b.stake || 0), 0) || 0;
        // Active Users (last 7 days)
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const { data: activeBets, error: activeBetsErr } = await supabase
          .from('bets')
          .select('user_id, placed_at')
          .gte('placed_at', since.toISOString());
        if (activeBetsErr) throw activeBetsErr;
        const activeUserIds = Array.from(new Set(activeBets?.map((b: any) => b.user_id)));
        // Conversion Rate: users who placed at least one bet
        const { data: betUsers, error: betUsersErr } = await supabase
          .from('bets')
          .select('user_id');
        if (betUsersErr) throw betUsersErr;
        const uniqueBetUsers = Array.from(new Set(betUsers?.map((b: any) => b.user_id)));
        const conversionRate = userCount && userCount > 0 ? Math.round((uniqueBetUsers.length / userCount) * 100) : 0;
        // Retention: users who placed bets on more than one day
        const { data: betDays, error: betDaysErr } = await supabase
          .from('bets')
          .select('user_id, placed_at');
        if (betDaysErr) throw betDaysErr;
        const userBetDays: Record<string, Set<string>> = {};
        betDays?.forEach((b: any) => {
          const date = b.placed_at?.slice(0, 10);
          if (!date) return;
          if (!userBetDays[b.user_id]) userBetDays[b.user_id] = new Set();
          userBetDays[b.user_id].add(date);
        });
        const retainedUsers = Object.values(userBetDays).filter(days => days.size > 1).length;
        const retentionRate = uniqueBetUsers.length > 0 ? Math.round((retainedUsers / uniqueBetUsers.length) * 100) : 0;
        setMetrics({
          totalUsers: userCount ?? 0,
          totalBets: betCount ?? 0,
          totalRevenue,
          activeUsers: activeUserIds.length,
          conversionRate,
          retentionRate,
        });
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch metrics');
        setLoading(false);
      }
    };
    if (user?.isAdmin) fetchMetrics();
  }, [user]);

  useEffect(() => {
    const fetchChartData = async () => {
      setChartsLoading(true);
      // Generate days array based on selected date range
      const days = [];
      let d = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      while (d <= end) {
        days.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
      }
      // User signups in range
      const { data: signups, error: signupErr } = await supabase
        .from('profiles')
        .select('id, created_at')
        .gte('created_at', dateRange.start + 'T00:00:00')
        .lte('created_at', dateRange.end + 'T23:59:59');
      // Bets placed in range (and by bet type if selected)
      let betsQuery = supabase
        .from('bets')
        .select('id, placed_at, stake, bet_on')
        .gte('placed_at', dateRange.start + 'T00:00:00')
        .lte('placed_at', dateRange.end + 'T23:59:59');
      if (betType && ['home_win', 'draw', 'away_win', 'pending'].includes(betType)) betsQuery = betsQuery.eq('bet_on', betType as 'home_win' | 'draw' | 'away_win' | 'pending');
      const { data: bets, error: betsErr } = await betsQuery;
      if (signupErr || betsErr) {
        setChartsLoading(false);
        return;
      }
      // Aggregate signups
      const signupCounts: Record<string, number> = {};
      days.forEach(date => (signupCounts[date] = 0));
      signups?.forEach((u: any) => {
        const date = u.created_at?.slice(0, 10);
        if (date && signupCounts[date] !== undefined) signupCounts[date]++;
      });
      setSignupData(days.map(date => ({ date, count: signupCounts[date] })));
      // Aggregate bets placed
      const betsCounts: Record<string, number> = {};
      days.forEach(date => (betsCounts[date] = 0));
      bets?.forEach((b: any) => {
        const date = b.placed_at?.slice(0, 10);
        if (date && betsCounts[date] !== undefined) betsCounts[date]++;
      });
      setBetsData(days.map(date => ({ date, count: betsCounts[date] })));
      // Aggregate revenue (sum of stake per day)
      const revenueSums: Record<string, number> = {};
      days.forEach(date => (revenueSums[date] = 0));
      bets?.forEach((b: any) => {
        const date = b.placed_at?.slice(0, 10);
        if (date && revenueSums[date] !== undefined) revenueSums[date] += Number(b.stake || 0);
      });
      setRevenueData(days.map(date => ({ date, amount: revenueSums[date] })));
      setChartsLoading(false);
    };
    fetchChartData();
  }, [dateRange, betType]);

  async function handleExportPDF() {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Fit image to page
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight > pageHeight ? pageHeight : imgHeight);
    pdf.save(`analytics_dashboard_${dateRange.start}_to_${dateRange.end}${betType ? `_${betType}` : ''}.pdf`);
  }

  if (!user?.isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-destructive">Access denied: Admins only</div>;
  }
  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-2 md:px-4 lg:px-6 py-6 w-full max-w-6xl">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-6 flex items-center gap-2">
          <BarChart3 className="h-8 w-8" /> Analytics Dashboard
        </h1>
        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive">{error}</div>}
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {/* Total Users */}
          <Card className="shadow-betting">
            <CardContent className="flex items-center gap-4 py-6">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Total Users</div>
                <div className="text-lg md:text-2xl font-bold mt-1">{loading ? '...' : metrics.totalUsers}</div>
              </div>
            </CardContent>
          </Card>
          {/* Total Bets */}
          <Card className="shadow-betting">
            <CardContent className="flex items-center gap-4 py-6">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Total Bets</div>
                <div className="text-lg md:text-2xl font-bold mt-1">{loading ? '...' : metrics.totalBets}</div>
              </div>
            </CardContent>
          </Card>
          {/* Total Revenue */}
          <Card className="shadow-betting">
            <CardContent className="flex items-center gap-4 py-6">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Total Revenue</div>
                <div className="text-lg md:text-2xl font-bold mt-1">{loading ? '...' : metrics.totalRevenue?.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
          {/* Conversion Rate */}
          <Card className="shadow-betting">
            <CardContent className="flex items-center gap-4 py-6">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Conversion Rate</div>
                <div className="text-lg md:text-2xl font-bold mt-1">{loading || metrics.conversionRate === null ? '...' : `${metrics.conversionRate}%`}</div>
              </div>
            </CardContent>
          </Card>
          {/* Retention Rate */}
          <Card className="shadow-betting">
            <CardContent className="flex items-center gap-4 py-6">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <div className="text-xs md:text-sm font-medium text-muted-foreground">Retention Rate</div>
                <div className="text-lg md:text-2xl font-bold mt-1">{loading || metrics.retentionRate === null ? '...' : `${metrics.retentionRate}%`}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Charts Placeholder */}
        <section className="mt-8" ref={exportRef}>
          <h2 className="text-xl font-semibold mb-4">Trends (Last 30 Days)</h2>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">Start Date:</label>
              <input
                type="date"
                className="border rounded px-2 py-1 bg-background"
                value={dateRange.start}
                max={dateRange.end}
                onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">End Date:</label>
              <input
                type="date"
                className="border rounded px-2 py-1 bg-background"
                value={dateRange.end}
                min={dateRange.start}
                onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">Bet Type:</label>
              <select
                className="border rounded px-2 py-1 bg-background"
                value={betType}
                onChange={e => setBetType(e.target.value)}
              >
                {BET_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* End Filters */}
          {/* Export Buttons */}
          <div className="flex gap-4 mb-4">
            <button
              className="px-3 py-1 rounded bg-primary text-white hover:bg-primary/90 text-sm"
              onClick={() => exportToCSV(signupData, `user_signups_${dateRange.start}_to_${dateRange.end}.csv`)}
              disabled={chartsLoading || !signupData.length}
            >
              Export User Signups CSV
            </button>
            <button
              className="px-3 py-1 rounded bg-primary text-white hover:bg-primary/90 text-sm"
              onClick={() => exportToCSV(betsData, `bets_placed_${dateRange.start}_to_${dateRange.end}${betType ? `_${betType}` : ''}.csv`)}
              disabled={chartsLoading || !betsData.length}
            >
              Export Bets Placed CSV
            </button>
            <button
              className="px-3 py-1 rounded bg-primary text-white hover:bg-primary/90 text-sm"
              onClick={() => exportToCSV(revenueData, `revenue_${dateRange.start}_to_${dateRange.end}${betType ? `_${betType}` : ''}.csv`)}
              disabled={chartsLoading || !revenueData.length}
            >
              Export Revenue CSV
            </button>
            <button
              className="px-3 py-1 rounded bg-muted text-foreground border border-border text-sm"
              onClick={handleExportPDF}
              disabled={chartsLoading}
            >
              Export PDF
            </button>
          </div>
          {/* End Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* User Signups Chart */}
            <div className="bg-card rounded-lg p-4 shadow">
              <h3 className="font-medium mb-2">User Signups</h3>
              {chartsLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={signupData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={10} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Bets Placed Chart */}
            <div className="bg-card rounded-lg p-4 shadow">
              <h3 className="font-medium mb-2">Bets Placed</h3>
              {chartsLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={betsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={10} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Revenue Chart */}
            <div className="bg-card rounded-lg p-4 shadow">
              <h3 className="font-medium mb-2">Revenue</h3>
              {chartsLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={10} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#ffc658" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
        {/* More analytics sections can go here */}
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard; 