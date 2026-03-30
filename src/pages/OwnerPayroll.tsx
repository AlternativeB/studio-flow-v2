import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, Users, Globe } from "lucide-react";
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
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, name, rate_per_client, aggregator_rate_per_client')
        .eq('is_active', true)
        .order('name');

      // Занятия с бронированиями
      const { data: sessions } = await supabase
        .from('schedule_sessions')
        .select('id, coach_id, bookings(id, status)')
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString());

      // Посещения от агрегаторов за месяц
      const { data: aggVisits } = await supabase
        .from('aggregator_session_visits')
        .select('session_id, visit_count')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      const coachStats = (coaches || []).map((coach: any) => {
        const coachSessions = (sessions || []).filter((s: any) => s.coach_id === coach.id);
        const sessionCount = coachSessions.length;

        // Обычные клиенты — только статус "Пришёл"
        const regularCount = coachSessions.reduce((sum: number, s: any) =>
          sum + (s.bookings || []).filter((b: any) => b.status === 'attended' || b.status === 'completed').length, 0);

        // Клиенты от агрегаторов
        const aggCount = coachSessions.reduce((sum: number, s: any) => {
          const visits = (aggVisits || []).filter((v: any) => v.session_id === s.id);
          return sum + visits.reduce((a: number, v: any) => a + (v.visit_count || 0), 0);
        }, 0);

        const rate = coach.rate_per_client || 0;
        const aggRate = coach.aggregator_rate_per_client ?? rate; // если не задана — та же ставка
        const payment = regularCount * rate + aggCount * aggRate;

        return { ...coach, sessionCount, regularCount, aggCount, payment, rate, aggRate };
      });

      const totalPayment = coachStats.reduce((sum: number, c: any) => sum + c.payment, 0);
      const totalClients = coachStats.reduce((sum: number, c: any) => sum + c.regularCount + c.aggCount, 0);

      return { coachStats, totalPayment, totalClients };
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Расчёт зарплаты</h1>
          <p className="text-muted-foreground text-sm">Оплата тренерам по клиентам</p>
        </div>
        <div className="flex items-center gap-1 bg-muted border rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 capitalize min-w-[110px] text-center">
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
          <div className="text-2xl md:text-3xl font-bold text-green-700">
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
            <div key={coach.id} className="bg-white border rounded-xl p-4 md:p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{coach.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Ставка: {coach.rate > 0 ? `${coach.rate} ₸` : <span className="text-orange-500">не задана</span>}
                    {coach.aggRate !== coach.rate && coach.aggRate > 0 && (
                      <> &nbsp;·&nbsp; Агрег.: {coach.aggRate} ₸</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{coach.payment.toLocaleString()} ₸</div>
                  <div className="text-xs text-muted-foreground">к выплате</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm bg-gray-50 rounded-lg p-3">
                <div className="text-center">
                  <div className="font-bold text-base">{coach.sessionCount}</div>
                  <div className="text-muted-foreground text-xs">занятий</div>
                </div>
                <div className="text-center border-x border-gray-200">
                  <div className="font-bold text-base text-primary">{coach.regularCount}</div>
                  <div className="text-muted-foreground text-xs">своих</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-base text-blue-600 flex items-center justify-center gap-1">
                    <Globe className="w-3 h-3" />{coach.aggCount}
                  </div>
                  <div className="text-muted-foreground text-xs">агрег.</div>
                </div>
              </div>

              {/* Детализация расчёта */}
              {(coach.regularCount > 0 || coach.aggCount > 0) && (
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5 px-1">
                  {coach.regularCount > 0 && (
                    <div className="flex justify-between">
                      <span>{coach.regularCount} кл. × {coach.rate} ₸</span>
                      <span className="font-medium">{(coach.regularCount * coach.rate).toLocaleString()} ₸</span>
                    </div>
                  )}
                  {coach.aggCount > 0 && (
                    <div className="flex justify-between">
                      <span>{coach.aggCount} агрег. × {coach.aggRate} ₸</span>
                      <span className="font-medium">{(coach.aggCount * coach.aggRate).toLocaleString()} ₸</span>
                    </div>
                  )}
                </div>
              )}

              {coach.rate === 0 && (coach.regularCount + coach.aggCount) > 0 && (
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
