import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingClasses } from "@/components/dashboard/UpcomingClasses";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Users, CreditCard, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { startOfMonth } from "date-fns";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      try {
        const startOfCurrentMonth = startOfMonth(new Date()).toISOString();

        // 1. Клиенты
        const { count: clientsCount, error: clientsError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'client');
        
        if (clientsError) console.error("Error fetching clients:", clientsError);

        // 2. Выручка (User Subscriptions)
        const { data: monthlySubs, error: revenueError } = await supabase
          .from('user_subscriptions')
          .select(`created_at, plan:subscription_plans(price)`)
          .gte('created_at', startOfCurrentMonth);
        
        if (revenueError) console.error("Error fetching revenue:", revenueError);

        const revenue = monthlySubs?.reduce((sum, item: any) => sum + (item.plan?.price || 0), 0) || 0;

        // 3. Активность (Bookings сегодня)
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const { count: bookingsToday, error: bookingsError } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayStart.toISOString()); 

        if (bookingsError) console.error("Error fetching bookings:", bookingsError);

        return {
          clients: clientsCount || 0,
          revenue: revenue,
          bookings: bookingsToday || 0
        };
      } catch (error) {
        console.error("Dashboard load error:", error);
        return { clients: 0, revenue: 0, bookings: 0 };
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Обзор студии</h1>
        <p className="text-muted-foreground mt-2">
          Добро пожаловать в панель управления.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Всего клиентов"
          value={stats?.clients || 0}
          icon={Users}
          change="В базе"
        />
        <StatCard
          title="Выручка (Месяц)"
          value={`${(stats?.revenue || 0).toLocaleString()} ₸`}
          icon={CreditCard}
          change="С начала месяца"
          changeType="positive"
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Активность"
          value={stats?.bookings || 0}
          icon={TrendingUp}
          change="Записей сегодня"
          iconColor="bg-blue-100 text-blue-600"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 h-full">
          <UpcomingClasses />
        </div>
        <div className="lg:col-span-3 h-full">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;