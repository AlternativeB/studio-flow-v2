import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, parseISO, subDays } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Check, X, Phone, Users, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = "sessions" | "checkin" | "aggregator" | "done";

const AdminCheckIn = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("sessions");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attendance, setAttendance] = useState<Record<string, "attended" | "absent">>({});
  const [fitCount, setFitCount] = useState("");
  const [fitAggregator, setFitAggregator] = useState("1Fit");

  // Сессии за последние 3 дня
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["checkin_sessions"],
    queryFn: async () => {
      const from = subDays(new Date(), 3).toISOString();
      const to = new Date().toISOString();
      const { data } = await supabase
        .from("schedule_sessions")
        .select("id, start_time, end_time, capacity, class_type:class_types(name, color), coach:coaches(name), bookings(count)")
        .gte("start_time", from)
        .lte("start_time", to)
        .order("start_time", { ascending: false });
      return data || [];
    },
  });

  // Записи на выбранный урок
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["checkin_bookings", selectedSession?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, status, user:profiles(first_name, last_name, phone)")
        .eq("session_id", selectedSession.id)
        .not("status", "eq", "cancelled");
      return data || [];
    },
    enabled: !!selectedSession,
  });

  // При загрузке записей — предзаполняем уже отмеченных
  useEffect(() => {
    if (bookings.length > 0) {
      const initial: Record<string, "attended" | "absent"> = {};
      bookings.forEach((b: any) => {
        if (b.status === "attended" || b.status === "absent") {
          initial[b.id] = b.status;
        }
      });
      setAttendance(initial);
    }
  }, [bookings]);

  // Мутация: отметить посещение (сохраняет сразу при нажатии)
  const markMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      await supabase.from("bookings").update({ status }).eq("id", bookingId);
    },
  });

  // Мутация: сохранить агрегатора
  const saveAggregatorMutation = useMutation({
    mutationFn: async () => {
      if (!fitCount || parseInt(fitCount) <= 0) return;
      const { error } = await supabase.from("aggregator_session_visits").insert({
        session_id: selectedSession.id,
        aggregator_name: fitAggregator,
        visit_count: parseInt(fitCount),
        price_per_visit: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aggregator_session_visits"] });
      setStep("done");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSelectSession = (session: any) => {
    setSelectedSession(session);
    setCurrentIndex(0);
    setAttendance({});
    setStep("checkin");
  };

  const handleMark = (bookingId: string, status: "attended" | "absent") => {
    setAttendance((prev) => ({ ...prev, [bookingId]: status }));
    markMutation.mutate({ bookingId, status });
    if (currentIndex < bookings.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setStep("aggregator");
    }
  };

  const handleReset = () => {
    setStep("sessions");
    setSelectedSession(null);
    setCurrentIndex(0);
    setAttendance({});
    setFitCount("");
    queryClient.invalidateQueries({ queryKey: ["checkin_sessions"] });
  };

  // ── ШАГ 1: Список уроков ───────────────────────────────────────────────
  if (step === "sessions") {
    return (
      <div className="space-y-4 animate-in fade-in pb-8">
        <div>
          <h1 className="text-2xl font-bold">Записать клиента</h1>
          <p className="text-sm text-muted-foreground">Выберите урок за последние 3 дня</p>
        </div>

        {loadingSessions ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-2xl text-muted-foreground">
            Уроков за последние 3 дня не найдено
          </div>
        ) : (
          <div className="space-y-3">
            {(sessions as any[]).map((session) => {
              const booked = session.bookings?.[0]?.count || 0;
              return (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className="w-full text-left bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex active:scale-[0.98] transition-all"
                >
                  <div
                    className="w-1.5 shrink-0"
                    style={{ backgroundColor: session.class_type?.color || "#3b82f6" }}
                  />
                  <div className="p-4 flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-base truncate">{session.class_type?.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(session.start_time), "dd MMM, HH:mm", { locale: ru })}
                        </p>
                        {session.coach?.name && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{session.coach.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-blue-50 rounded-xl px-3 py-1.5 shrink-0">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-blue-700">{booked}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center pr-3">
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── ШАГ 2: Тиндер-режим ────────────────────────────────────────────────
  if (step === "checkin") {
    if (loadingBookings) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" />
        </div>
      );
    }

    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in text-center">
          <div className="text-5xl">📭</div>
          <p className="text-muted-foreground">На этот урок никто не записан</p>
          <Button onClick={() => setStep("aggregator")}>Перейти к агрегаторам</Button>
          <Button variant="ghost" onClick={() => setStep("sessions")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Назад
          </Button>
        </div>
      );
    }

    const current = bookings[currentIndex] as any;
    const client = current?.user;
    const totalMarked = Object.keys(attendance).length;
    const currentStatus = attendance[current?.id];

    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] animate-in fade-in">
        {/* Шапка */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setStep("sessions")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium truncate max-w-[160px]">
              {selectedSession?.class_type?.name}
            </p>
            <p className="font-bold text-sm">
              {currentIndex + 1} / {bookings.length}
            </p>
          </div>
          <div className="w-9" />
        </div>

        {/* Прогресс-бар */}
        <div className="px-4 shrink-0">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(totalMarked / bookings.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
            <span>Отмечено: {totalMarked}</span>
            <span>
              ✓ {Object.values(attendance).filter((s) => s === "attended").length} &nbsp;
              ✗ {Object.values(attendance).filter((s) => s === "absent").length}
            </span>
          </div>
        </div>

        {/* Карточка клиента */}
        <div className="flex-1 flex items-center justify-center px-6 py-4">
          <div
            className={cn(
              "w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center border-2 transition-all duration-200",
              currentStatus === "attended"
                ? "border-green-400 bg-green-50"
                : currentStatus === "absent"
                ? "border-red-300 bg-red-50"
                : "border-gray-100"
            )}
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mx-auto mb-5">
              {client?.first_name?.[0]}
              {client?.last_name?.[0]}
            </div>
            <h2 className="text-2xl font-bold leading-tight">
              {client?.first_name} {client?.last_name}
            </h2>
            {client?.phone && (
              <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-400">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{client.phone}</span>
              </div>
            )}
            {currentStatus && (
              <div
                className={cn(
                  "mt-4 text-sm font-bold",
                  currentStatus === "attended" ? "text-green-600" : "text-red-500"
                )}
              >
                {currentStatus === "attended" ? "✓ Пришёл" : "✗ Не пришёл"}
              </div>
            )}
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-4 pb-6 grid grid-cols-2 gap-3 shrink-0">
          <Button
            variant="outline"
            className="h-16 text-base rounded-2xl border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100"
            onClick={() => handleMark(current.id, "absent")}
          >
            <X className="mr-2 w-5 h-5" /> Не пришёл
          </Button>
          <Button
            className="h-16 text-base rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700"
            onClick={() => handleMark(current.id, "attended")}
          >
            <Check className="mr-2 w-5 h-5" /> Пришёл
          </Button>
        </div>
      </div>
    );
  }

  // ── ШАГ 3: Агрегатор ──────────────────────────────────────────────────
  if (step === "aggregator") {
    const attendedCount = Object.values(attendance).filter((s) => s === "attended").length;
    const absentCount = Object.values(attendance).filter((s) => s === "absent").length;

    return (
      <div className="space-y-5 animate-in fade-in pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setStep("checkin");
              setCurrentIndex(Math.max(0, bookings.length - 1));
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Итог урока</h1>
        </div>

        {/* Итог */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{attendedCount}</div>
            <div className="text-xs text-green-700 mt-1">пришли</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{absentCount}</div>
            <div className="text-xs text-red-500 mt-1">не пришли</div>
          </div>
        </div>

        {/* Карточка 1FIT */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-blue-600">1F</span>
            </div>
            <div>
              <p className="font-bold">Агрегатор (1Fit / GymBeam)</p>
              <p className="text-xs text-muted-foreground">Необязательно — если были клиенты</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Название агрегатора"
              value={fitAggregator}
              onChange={(e) => setFitAggregator(e.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder="Количество клиентов"
              value={fitCount}
              onChange={(e) => setFitCount(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full h-14 text-base rounded-2xl"
          onClick={() => saveAggregatorMutation.mutate()}
          disabled={saveAggregatorMutation.isPending}
        >
          {saveAggregatorMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Завершить урок
        </Button>

        <Button variant="ghost" className="w-full" onClick={() => setStep("done")}>
          Пропустить агрегатора
        </Button>
      </div>
    );
  }

  // ── ШАГ 4: Готово ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 animate-in fade-in text-center pb-8">
      <CheckCircle2 className="w-20 h-20 text-green-500" />
      <div>
        <h2 className="text-2xl font-bold">Готово!</h2>
        <p className="text-muted-foreground mt-1">Посещаемость записана</p>
      </div>
      <Button onClick={handleReset} className="rounded-2xl px-8 h-12">
        Новый урок
      </Button>
    </div>
  );
};

export default AdminCheckIn;
