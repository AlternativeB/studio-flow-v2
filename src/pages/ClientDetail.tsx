import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Phone, Mail, Calendar, CreditCard, History, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // Загрузка данных клиента
  const { data: client, isLoading: isClientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Загрузка абонементов
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['client_subscriptions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*, plan:subscription_plans(name)')
        .eq('user_id', id)
        .order('end_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Загрузка истории посещений
  const { data: bookings = [] } = useQuery({
    queryKey: ['client_bookings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          session:schedule_sessions(
            start_time,
            class_type:class_types(name)
          )
        `)
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Загрузка доступных планов
  const { data: plans = [] } = useQuery({
    queryKey: ['active_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Продажа абонемента
  const sellMutation = useMutation({
    mutationFn: async () => {
      const plan = plans.find((p: any) => p.id === selectedPlanId);
      if (!plan) throw new Error("План не найден");

      const startDate = new Date();
      const endDate = addDays(startDate, plan.duration_days);

      // --- ИСПРАВЛЕНИЕ: Добавлен activation_date ---
      const { error } = await supabase.from('user_subscriptions').insert({
        user_id: id,
        plan_id: plan.id,
        visits_remaining: plan.visits_count,
        visits_total: plan.visits_count,
        activation_date: format(startDate, 'yyyy-MM-dd'), // Теперь это поле тоже нужно
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        is_active: true
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_subscriptions'] });
      setIsSellModalOpen(false);
      toast({ title: "Успешно", description: "Абонемент добавлен клиенту" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

// ... (остальной код в начале файла без изменений)

  if (isClientLoading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* ИСПРАВЛЕНИЕ: Кнопка назад ведет на /clients, а не /admin/clients */}
      <Button variant="ghost" onClick={() => navigate('/clients')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к списку
      </Button>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        {/* ... остальной код ... */}

        <div className="space-y-6">
          {/* Шапка профиля */}
          <Card>
            <CardContent className="p-6 flex items-start justify-between">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {client?.first_name?.[0]}{client?.last_name?.[0]}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{client?.first_name} {client?.last_name}</h1>
                  <div className="flex flex-col gap-1 text-muted-foreground mt-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> {client?.phone}
                    </div>
                    {client?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {client?.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Dialog open={isSellModalOpen} onOpenChange={setIsSellModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Продать абонемент
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Продажа абонемента</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Выберите тариф</Label>
                      <Select onValueChange={setSelectedPlanId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Тарифный план" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - {plan.price} ₸ ({plan.visits_count} занятий)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => sellMutation.mutate()}
                      disabled={!selectedPlanId || sellMutation.isPending}
                    >
                      {sellMutation.isPending ? "Обработка..." : "Оформить"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Табы с информацией */}
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">История посещений</TabsTrigger>
              <TabsTrigger value="subscriptions">Абонементы</TabsTrigger>
              <TabsTrigger value="notes">Заметки</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>История посещений</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.map((booking: any) => (
                      <div key={booking.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium">{booking.session?.class_type?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(booking.session?.start_time), 'dd MMMM yyyy HH:mm', { locale: ru })}
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'completed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {booking.status === 'completed' ? 'Посетил' :
                           booking.status === 'cancelled' ? 'Отмена' : 'Записан'}
                        </div>
                      </div>
                    ))}
                    {bookings.length === 0 && <div className="text-center text-muted-foreground">Нет истории посещений</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>История абонементов</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subscriptions.map((sub: any) => (
                      <div key={sub.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium">{sub.plan?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Осталось: {sub.visits_remaining} из {sub.visits_total}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm ${sub.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                            {sub.is_active ? 'Активен' : 'Завершен'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            до {format(new Date(sub.end_date), 'dd.MM.yyyy')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Сайдбар со статистикой */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Баланс</span>
                <span className="font-bold text-lg">{client?.balance || 0} ₸</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Посещений</span>
                <span className="font-bold">{bookings.filter((b:any) => b.status === 'completed').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Отмен</span>
                <span className="font-bold text-red-500">{bookings.filter((b:any) => b.status === 'cancelled').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}