import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const OwnerPayroll = () => {
  const [monthOffset, setMonthOffset] = useState(0);

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthOffset);
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const { data, isLoading } = useQuery({
    queryKey: ['owner_payroll', monthStart.toISOString()],
    queryFn: async () => {
      // Get all active coaches with rate
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, name, rate_per_client')
        .eq('is_active', true)
        .order('name');

      // Get all sessions this month with booking counts grouped by coach
      const { data: sessions } = await supabase
        .from('schedule_sessions')
        .select('id, start_time, coach_id, bookings(count)')
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      // Calculate per coach
      const coachStats = (coaches || []).map((coach: any) => {
        const coachSessions = (sessions || []).filter((s: any) => s.coach_id === coach.id);
        const sessionCount = coachSessions.length;
        const clientCount = coachSessions.reduce((sum: number, s: any) => sum + (s.bookings?.[0]?.count || 0), 0);
        const payment = clientCount * (coach.rate_per_client || 0);
        return { ...coach, sessionCount, clientCount, payment };
      });

      const totalPayment = coachStats.reduce((sum: number, c: any) => sum + c.payment, 0);
      const totalClients = coachStats.reduce((sum: number, c: any) => sum + c.clientCount, 0);

      return { coachStats, totalPayment, totalClients };
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Расчёт зарплаты</h1>
          <p className="text-muted-foreground">Оплата тренерам по клиентам</p>
        </div>
        <div className="flex items-center gap-1 bg-muted border rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 capitalize min-w-[120px] text-center">
            {format(targetDate, 'LLLL yyyy', { locale: ru })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1 text-primary">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Всего клиентов</span>
          </div>
          <div className="text-3xl font-bold">{isLoading ? '…' : data?.totalClients}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1 text-green-700">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Итого к выплате</span>
          </div>
          <div className="text-3xl font-bold text-green-700">
            {isLoading ? '…' : `${(data?.totalPayment || 0).toLocaleString()} ₸`}
          </div>
        </div>
      </div>

      {/* Coach breakdown */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {data?.coachStats.map((coach: any) => (
            <div key={coach.id} className="bg-white border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{coach.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Ставка: {coach.rate_per_client > 0 ? `${coach.rate_per_client} ₸/клиент` : <span className="text-orange-500">не задана</span>}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{coach.payment.toLocaleString()} ₸</div>
                  <div className="text-xs text-muted-foreground">к выплате</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Занятий:</span>
                  <span className="font-semibold">{coach.sessionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Клиентов:</span>
                  <span className="font-semibold">{coach.clientCount}</span>
                </div>
              </div>
              {coach.rate_per_client === 0 && coach.clientCount > 0 && (
                <p className="text-xs text-orange-500 mt-2">⚠️ Задайте ставку в карточке тренера</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerPayroll;
