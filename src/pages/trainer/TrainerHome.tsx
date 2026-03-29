import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, LogOut, Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TrainerHome = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['trainer_home'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      // Get coach record linked to this user
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (coachError || !coach) throw new Error("Тренер не найден. Обратитесь к администратору.");

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Sessions this month
      const { data: monthSessions } = await supabase
        .from('schedule_sessions')
        .select('id, start_time, end_time, capacity, class_type:class_types(name, color), bookings(count)')
        .eq('coach_id', coach.id)
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd)
        .order('start_time');

      // Today's sessions
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const { data: todaySessions } = await supabase
        .from('schedule_sessions')
        .select('id, start_time, end_time, capacity, class_type:class_types(name, color), bookings(count)')
        .eq('coach_id', coach.id)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time');

      const totalClients = (monthSessions || []).reduce((sum: number, s: any) => sum + (s.bookings?.[0]?.count || 0), 0);
      const totalSessions = (monthSessions || []).length;
      const payment = totalClients * (coach.rate_per_client || 0);

      return { coach, todaySessions: todaySessions || [], monthSessions: monthSessions || [], totalClients, totalSessions, payment };
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/trainer/login");
  };

  if (isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-primary" /></div>;

  const { coach, todaySessions, totalClients, totalSessions, payment } = data || {};

  return (
    <div className="space-y-6 pb-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 px-5 pt-10 pb-8 text-white relative">
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
        <p className="text-white/70 text-sm mb-1">Добро пожаловать,</p>
        <h1 className="text-2xl font-bold">{coach?.name}</h1>
        <p className="text-white/60 text-sm mt-1">{format(new Date(), 'EEEE, d MMMM', { locale: ru })}</p>
      </div>

      {/* Stats this month */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {format(new Date(), 'MMMM yyyy', { locale: ru })}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-700">{totalSessions}</div>
            <div className="text-xs text-blue-500 mt-0.5">занятий</div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <Users className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-700">{totalClients}</div>
            <div className="text-xs text-green-500 mt-0.5">клиентов</div>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 text-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className="text-xl font-bold text-orange-700">{(payment || 0).toLocaleString()}</div>
            <div className="text-xs text-orange-500 mt-0.5">₸ заработок</div>
          </div>
        </div>
      </div>

      {/* Today's sessions */}
      <div className="px-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Сегодня</h2>
        {todaySessions && todaySessions.length > 0 ? (
          <div className="space-y-3">
            {todaySessions.map((session: any) => {
              const booked = session.bookings?.[0]?.count || 0;
              const isFull = booked >= session.capacity;
              return (
                <div key={session.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: session.class_type?.color || '#3b82f6' }} />
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-base">{session.class_type?.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{format(parseISO(session.start_time), 'HH:mm')} – {format(parseISO(session.end_time), 'HH:mm')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${isFull ? 'text-red-600' : 'text-primary'}`}>{booked}</div>
                        <div className="text-xs text-gray-400">из {session.capacity}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
            <p className="text-muted-foreground text-sm">Занятий сегодня нет</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerHome;
