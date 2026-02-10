import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { CreditCard, Loader2 } from "lucide-react";

export const RecentActivity = () => {
  // Загружаем последние продажи абонементов
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['dashboard_activity'],
    queryFn: async () => {
      // Берем последние 5 продаж абонементов
      // Связь: user_subscriptions -> user_id -> profiles
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          created_at,
          user:profiles(first_name, last_name),
          plan:subscription_plans(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-lg">Последние продажи</h3>
      </div>
      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Пока тишина...
          </div>
        ) : (
          activities.map((act: any) => (
            <div key={act.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-green-100 text-green-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Покупка абонемента
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    <span className="font-medium text-gray-900">{act.user?.first_name} {act.user?.last_name}</span> купил(а) <span className="text-blue-600 font-medium">{act.plan?.name}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ru })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};