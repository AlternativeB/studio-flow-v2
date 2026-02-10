import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { Clock, Users, MapPin, Loader2 } from "lucide-react";

export const UpcomingClasses = () => {
  // Загружаем занятия ТОЛЬКО на сегодня
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['dashboard_upcoming_classes'],
    queryFn: async () => {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // Прямой запрос к таблицам (надежнее, чем RPC)
      const { data, error } = await supabase
        .from('schedule_sessions')
        .select(`
            id, start_time, capacity,
            class_type:class_types(name),
            coach:coaches(name),
            bookings:bookings(count)
        `)
        .gte('start_time', start)
        .lte('start_time', end)
        .order('start_time');

      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-lg">Занятия сегодня</h3>
      </div>
      <div className="divide-y divide-border overflow-y-auto max-h-[350px]">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <span className="text-2xl">☕️</span>
            На сегодня занятий нет. Отдыхаем!
          </div>
        ) : (
          classes.map((item: any) => {
            // Получаем кол-во записей
            const bookingsCount = item.bookings?.[0]?.count || 0;
            // Рассчитываем процент заполненности
            const percent = Math.min((bookingsCount / item.capacity) * 100, 100);
            
            return (
              <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-foreground">{item.class_type?.name}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {item.coach?.name || "Без тренера"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <Clock className="w-4 h-4" />
                      {format(parseISO(item.start_time), 'HH:mm')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                      <MapPin className="w-3 h-3" /> Зал 1
                    </div>
                  </div>
                </div>
                
                {/* Прогресс бар заполненности */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${percent >= 100 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                    {bookingsCount}/{item.capacity}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};