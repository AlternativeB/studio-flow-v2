import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, ChevronLeft, ChevronRight, CreditCard, CalendarCheck, Globe, UserX, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type EventType = "all" | "subscriptions" | "bookings" | "aggregators";

const EVENT_FILTERS: { value: EventType; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "subscriptions", label: "Абонементы" },
  { value: "bookings", label: "Записи" },
  { value: "aggregators", label: "Агрегаторы" },
];

const PAGE_SIZE = 50;

const OwnerLogs = () => {
  const [monthOffset, setMonthOffset] = useState(0);
  const [eventFilter, setEventFilter] = useState<EventType>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleMonthChange = (delta: number) => {
    setMonthOffset((p) => p + delta);
    setVisibleCount(PAGE_SIZE);
  };

  const handleFilterChange = (f: EventType) => {
    setEventFilter(f);
    setVisibleCount(PAGE_SIZE);
  };

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + monthOffset);
  const monthStart = startOfMonth(targetDate).toISOString();
  const monthEnd = endOfMonth(targetDate).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["owner_logs", monthStart],
    queryFn: async () => {
      const [subsRes, bookingsRes, aggRes] = await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("id, created_at, activation_date, user:profiles(first_name, last_name), plan:subscription_plans(name)")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: false }),

        supabase
          .from("bookings")
          .select("id, created_at, status, user:profiles(first_name, last_name), session:schedule_sessions(start_time, class_type:class_types(name))")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: false }),

        supabase
          .from("aggregator_session_visits")
          .select("id, created_at, aggregator_name, visit_count, session:schedule_sessions(start_time, class_type:class_types(name))")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .order("created_at", { ascending: false }),
      ]);

      const subEvents = (subsRes.data || []).map((s: any) => ({
        id: "sub_" + s.id,
        type: "subscription_sold" as const,
        created_at: s.created_at,
        title: "Продан абонемент",
        detail: `${s.user?.first_name ?? ""} ${s.user?.last_name ?? ""} — ${s.plan?.name ?? "—"}`,
      }));

      const bookingEvents = (bookingsRes.data || []).map((b: any) => {
        const sessionName = b.session?.class_type?.name ?? "занятие";
        const sessionTime = b.session?.start_time
          ? format(parseISO(b.session.start_time), "d MMM HH:mm", { locale: ru })
          : "";
        const clientName = `${b.user?.first_name ?? ""} ${b.user?.last_name ?? ""}`.trim();

        let title = "Запись на занятие";
        let type: string = "booking_created";
        if (b.status === "attended" || b.status === "completed") {
          title = "Посещение подтверждено";
          type = "booking_attended";
        } else if (b.status === "absent") {
          title = "Не пришёл";
          type = "booking_absent";
        } else if (b.status === "cancelled") {
          title = "Запись отменена";
          type = "booking_cancelled";
        }

        return {
          id: "book_" + b.id,
          type,
          created_at: b.created_at,
          title,
          detail: `${clientName} — ${sessionName}${sessionTime ? ` (${sessionTime})` : ""}`,
        };
      });

      const aggEvents = (aggRes.data || []).map((a: any) => {
        const sessionName = a.session?.class_type?.name ?? "занятие";
        const sessionTime = a.session?.start_time
          ? format(parseISO(a.session.start_time), "d MMM HH:mm", { locale: ru })
          : "";
        return {
          id: "agg_" + a.id,
          type: "aggregator" as const,
          created_at: a.created_at,
          title: `Агрегатор: ${a.aggregator_name}`,
          detail: `${a.visit_count} визитов — ${sessionName}${sessionTime ? ` (${sessionTime})` : ""}`,
        };
      });

      const all = [...subEvents, ...bookingEvents, ...aggEvents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return all;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (eventFilter === "all") return data;
    if (eventFilter === "subscriptions") return data.filter((e) => e.type === "subscription_sold");
    if (eventFilter === "bookings") return data.filter((e) => e.type.startsWith("booking_"));
    if (eventFilter === "aggregators") return data.filter((e) => e.type === "aggregator");
    return data;
  }, [data, eventFilter]);

  const getIcon = (type: string) => {
    switch (type) {
      case "subscription_sold": return <CreditCard className="w-4 h-4" />;
      case "booking_attended": return <CheckCircle className="w-4 h-4" />;
      case "booking_absent": return <UserX className="w-4 h-4" />;
      case "booking_cancelled": return <XCircle className="w-4 h-4" />;
      case "aggregator": return <Globe className="w-4 h-4" />;
      default: return <CalendarCheck className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "subscription_sold": return "bg-green-100 text-green-600";
      case "booking_attended": return "bg-blue-100 text-blue-600";
      case "booking_absent": return "bg-orange-100 text-orange-500";
      case "booking_cancelled": return "bg-red-100 text-red-500";
      case "aggregator": return "bg-purple-100 text-purple-600";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Журнал событий</h1>
          <p className="text-muted-foreground text-sm">Активность за месяц</p>
        </div>
        <div className="flex items-center gap-1 bg-muted border rounded-lg p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3 capitalize min-w-[110px] text-center">
            {format(targetDate, "LLLL yyyy", { locale: ru })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMonthChange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              eventFilter === f.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Событий не найдено
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, visibleCount).map((event) => (
            <div key={event.id} className="bg-white border rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className={`p-2 rounded-full shrink-0 mt-0.5 ${getColor(event.type)}`}>
                {getIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{event.detail}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                {format(parseISO(event.created_at), "d MMM, HH:mm", { locale: ru })}
              </span>
            </div>
          ))}
          {visibleCount < filtered.length && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              Показать ещё ({filtered.length - visibleCount})
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerLogs;
