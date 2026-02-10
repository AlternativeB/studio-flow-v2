import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addWeeks, 
  parseISO, 
  isSameDay, 
  addMinutes 
} from "date-fns";
import { ru } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  User, 
  Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner"; 

export default function Schedule() {
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [formData, setFormData] = useState({
    classTypeId: "",
    coachId: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    time: "10:00",
    capacity: "10"
  });

  // Даты недели
  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  // 1. Загрузка занятий
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['sessions', weekStart.toISOString()],
    queryFn: async () => {
      // ИСПРАВЛЕНИЕ: Добавили bookings(count) чтобы считать занятые места
      const { data, error } = await supabase
        .from('schedule_sessions')
        .select(`
          *,
          class_type:class_types(*),
          coach:coaches(name),
          bookings(count) 
        `)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time');

      if (error) {
        console.error("Ошибка загрузки расписания:", error);
        throw error;
      }
      return data;
    }
  });

  // 2. Типы занятий
  const { data: classTypes = [] } = useQuery({
    queryKey: ['class_types'],
    queryFn: async () => {
      const { data } = await supabase.from('class_types').select('*');
      return data || [];
    }
  });

  // 3. Загрузка тренеров
  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name') 
        .eq('is_active', true);
      
      if (error) return [];
      return data || [];
    }
  });

  // МУТАЦИЯ: Создать/Обновить
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.classTypeId) throw new Error("Выберите тип занятия");

      const type = classTypes.find((t: any) => t.id === formData.classTypeId);
      
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const startTime = new Date(year, month - 1, day, hours, minutes);
      const endTime = addMinutes(startTime, type.duration_min);

      const payload = {
        class_type_id: formData.classTypeId,
        coach_id: formData.coachId || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: parseInt(formData.capacity)
      };

      if (editingSession) {
        const { error } = await supabase.from('schedule_sessions').update(payload).eq('id', editingSession.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('schedule_sessions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setIsModalOpen(false);
      toast.success(editingSession ? "Занятие обновлено" : "Занятие создано");
    },
    onError: (err: any) => toast.error(err.message)
  });

  // МУТАЦИЯ: Удалить
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('schedule_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success("Занятие удалено");
    },
    onError: (err: any) => toast.error(err.message)
  });

  // МУТАЦИЯ: Дублировать неделю
  const duplicateWeekMutation = useMutation({
    mutationFn: async () => {
      if (!sessions || sessions.length === 0) {
        throw new Error("На этой неделе нет занятий для дублирования");
      }
      const newSessions = sessions.map(session => {
        const start = new Date(session.start_time);
        const end = new Date(session.end_time);
        start.setDate(start.getDate() + 7);
        end.setDate(end.getDate() + 7);
        return {
          class_type_id: session.class_type_id,
          coach_id: session.coach_id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          capacity: session.capacity
        };
      });
      const { error } = await supabase.from('schedule_sessions').insert(newSessions);
      if (error) throw error;
    },
    onSuccess: () => {
      setWeekOffset(prev => prev + 1);
      toast.success("Неделя дублирована!");
    },
    onError: (err: any) => toast.error(err.message)
  });

  const openCreateModal = (dateStr: string) => {
    setEditingSession(null);
    setFormData({
      classTypeId: "",
      coachId: "",
      date: dateStr,
      time: "10:00",
      capacity: "10"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (session: any) => {
    setEditingSession(session);
    setFormData({
      classTypeId: session.class_type_id,
      coachId: session.coach_id || "",
      date: format(parseISO(session.start_time), 'yyyy-MM-dd'),
      time: format(parseISO(session.start_time), 'HH:mm'),
      capacity: session.capacity?.toString() || "10"
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Расписание</h1>
          <p className="text-muted-foreground capitalize">
            {format(weekStart, 'd MMMM', { locale: ru })} — {format(weekEnd, 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-card border rounded-md shadow-sm mr-2">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(prev => prev - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setWeekOffset(0)} className="px-4 text-sm font-medium">
              Сегодня
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(prev => prev + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button 
            variant="outline" 
            onClick={() => {
              if (confirm("Скопировать неделю?")) duplicateWeekMutation.mutate();
            }}
            disabled={duplicateWeekMutation.isPending || sessions.length === 0}
          >
            <Copy className="mr-2 h-4 w-4" /> 
            Копия недели
          </Button>

          <Button onClick={() => openCreateModal(format(new Date(), 'yyyy-MM-dd'))}>
            <Plus className="mr-2 h-4 w-4" /> Занятие
          </Button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const daySessions = sessions.filter((s: any) => isSameDay(parseISO(s.start_time), day));
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toISOString()} 
              className={`flex flex-col rounded-lg border shadow-sm bg-card overflow-hidden h-full min-h-[400px] ${
                isToday ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              <div className={`text-center py-3 border-b ${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/30'}`}>
                <div className="font-semibold capitalize text-sm">
                  {format(day, 'EEEE', { locale: ru })}
                </div>
                <div className="text-2xl font-bold">
                  {format(day, 'd', { locale: ru })}
                </div>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-slate-50/50">
                {isSessionsLoading ? (
                  <div className="text-center text-xs text-muted-foreground p-4">Загрузка...</div>
                ) : daySessions.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground p-4 opacity-50">Нет занятий</div>
                ) : (
                  daySessions.map((session: any) => {
                    // ИСПРАВЛЕНИЕ: Получаем количество
                    const bookedCount = session.bookings?.[0]?.count || 0;
                    const isFull = bookedCount >= session.capacity;

                    return (
                        <div 
                          key={session.id} 
                          className="group relative bg-white p-3 rounded-md border shadow-sm text-sm hover:shadow-md transition-all cursor-pointer"
                          onClick={() => openEditModal(session)}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                              {format(parseISO(session.start_time), 'HH:mm')} - {format(parseISO(session.end_time), 'HH:mm')}
                            </span>
                            
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button 
                                className="p-1 text-gray-400 hover:text-blue-500 rounded"
                                onClick={(e) => { e.stopPropagation(); openEditModal(session); }}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button 
                                className="p-1 text-gray-400 hover:text-red-500 rounded"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (confirm("Удалить?")) deleteMutation.mutate(session.id); 
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="font-semibold text-primary mt-2 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: session.class_type?.color || '#ccc' }} />
                            {session.class_type?.name}
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-2 flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span className="truncate">{session.coach?.name || 'Без тренера'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{session.class_type?.duration_min}м</span>
                              </div>
                              {/* ИСПРАВЛЕНИЕ: Отображаем реальное количество */}
                              <span className={`px-1.5 rounded-sm ${isFull ? 'bg-red-100 text-red-700 font-bold' : 'bg-blue-50 text-blue-700'}`}>
                                {bookedCount}/{session.capacity}
                              </span>
                            </div>
                          </div>
                        </div>
                    );
                  })
                )}
              </div>

              <div className="p-2 bg-white border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs text-muted-foreground hover:text-primary"
                  onClick={() => openCreateModal(format(day, 'yyyy-MM-dd'))}
                >
                  <Plus className="w-3 h-3 mr-1" /> Добавить
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Редактировать" : "Новое занятие"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Тип занятия</Label>
              <Select value={formData.classTypeId} onValueChange={(val) => setFormData({...formData, classTypeId: val})}>
                <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                <SelectContent>
                  {classTypes.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.duration_min} мин)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label>Тренер</Label>
              <Select value={formData.coachId} onValueChange={(val) => setFormData({...formData, coachId: val})}>
                <SelectTrigger><SelectValue placeholder="Без тренера" /></SelectTrigger>
                <SelectContent>
                  {coaches.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Дата</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>Время</Label>
                <Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Мест</Label>
              <Input type="number" min="1" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} />
            </div>
          </div>
          <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}