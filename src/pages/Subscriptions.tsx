import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2, X, Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, addDays, differenceInDays, isPast, isToday, isFuture, isValid } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const Subscriptions = () => {
  const queryClient = useQueryClient();
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [openClientSelect, setOpenClientSelect] = useState(false);

  // --- ФИЛЬТРЫ ---
  const [filterClient, setFilterClient] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // --- СОСТОЯНИЯ ФОРМ ---
  const [sellForm, setSellForm] = useState({ 
    user_id: "", 
    plan_id: "", 
    activation_date: format(new Date(), 'yyyy-MM-dd') // По умолчанию сегодня
  });
  
  const [editForm, setEditForm] = useState<any>({});

  // 1. Получаем список абонементов
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['user_subscriptions_full'],
    queryFn: async () => {
      // ИЗМЕНЕНИЕ: Убрали bookings(status), так как считаем остаток на бэкенде
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
            *, 
            user:profiles(first_name, last_name, phone), 
            plan:subscription_plans(name, duration_days)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // ИЗМЕНЕНИЕ: Просто возвращаем данные, visits_remaining теперь актуален в базе
      return data;
    }
  });

  // 2. Справочники
  const { data: clients = [] } = useQuery({
    queryKey: ['clients_lite'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('role', 'client')
        .order('first_name');
      return data || [];
    }
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans_lite'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').order('price');
      return data || [];
    }
  });

  // --- МУТАЦИИ ---
  
  // ПРОДАЖА АБОНЕМЕНТА
  const sellMutation = useMutation({
    mutationFn: async () => {
      if (!sellForm.user_id || !sellForm.plan_id) throw new Error("Выберите клиента и тариф");
      
      const selectedPlan = plans.find((p: any) => p.id === sellForm.plan_id);
      if (!selectedPlan) throw new Error("Тариф не найден");

      // Логика дат
      const activationDate = parseISO(sellForm.activation_date); // Дата, которую выбрал админ
      const duration = selectedPlan.duration_days || 30;
      const endDate = addDays(activationDate, duration);

      const { error } = await supabase.from('user_subscriptions').insert([{
        user_id: sellForm.user_id,
        plan_id: selectedPlan.id,
        visits_total: selectedPlan.visits_count,
        visits_remaining: selectedPlan.visits_count, // Изначально равно total
        activation_date: format(activationDate, 'yyyy-MM-dd'),
        start_date: format(activationDate, 'yyyy-MM-dd'), 
        end_date: format(endDate, 'yyyy-MM-dd'),
        is_active: true
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Абонемент выдан");
      setIsSellDialogOpen(false);
      setSellForm({ user_id: "", plan_id: "", activation_date: format(new Date(), 'yyyy-MM-dd') });
      queryClient.invalidateQueries({ queryKey: ['user_subscriptions_full'] });
    },
    onError: (err: any) => toast.error("Ошибка: " + err.message)
  });

  // РЕДАКТИРОВАНИЕ
  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('user_subscriptions').update({
            // Мы все еще позволяем менять visits_remaining вручную админу, если нужно
            visits_remaining: parseInt(editForm.visits_remaining),
            activation_date: editForm.activation_date,
            start_date: editForm.activation_date,
            end_date: editForm.end_date,
            is_active: editForm.is_active 
        }).eq('id', editForm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Обновлено");
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user_subscriptions_full'] });
    },
    onError: (err: any) => toast.error("Ошибка: " + err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Удалено");
        queryClient.invalidateQueries({ queryKey: ['user_subscriptions_full'] });
    }
  });

  // --- ЛОГИКА СТАТУСОВ (Улучшенная) ---
  const getSubscriptionStatus = (sub: any) => {
    if (!sub.is_active) return { label: "Архив", color: "bg-gray-200 text-gray-600", code: "finished" };
    
    // Если visits_total не null (лимитный) и остаток 0 -> Закончился
    if (sub.visits_total !== null && sub.visits_remaining <= 0) {
        return { label: "Закончился", color: "bg-gray-200 text-gray-600", code: "finished" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // Проверка активации
    if (sub.activation_date) {
        const activationDate = parseISO(sub.activation_date);
        if (isFuture(activationDate)) {
            return { label: "Ждет активации", color: "bg-blue-100 text-blue-800", code: "pending" };
        }
    }

    if (!sub.end_date) return { label: "Активен", color: "bg-green-100 text-green-800", code: "active" };

    const endDate = parseISO(sub.end_date);
    
    if (isPast(endDate) && !isToday(endDate)) return { label: "Истек", color: "bg-red-100 text-red-800", code: "expired" };

    const daysLeft = differenceInDays(endDate, today);

    if (daysLeft <= 3) return { label: "Истекает", color: "bg-red-100 text-red-800", code: "critical" };
    if (daysLeft <= 7) return { label: "Скоро истекает", color: "bg-orange-100 text-orange-800", code: "warning" };
    
    return { label: "Действует", color: "bg-green-100 text-green-800", code: "active" };
  };

  // --- ФИЛЬТРАЦИЯ ---
  const filteredSubs = subscriptions.filter((sub: any) => {
    const clientName = `${sub.user?.first_name} ${sub.user?.last_name}`.toLowerCase();
    if (!clientName.includes(filterClient.toLowerCase())) return false;
    if (filterPlan !== "all" && sub.plan_id !== filterPlan) return false;
    
    if (filterStatus !== "all") {
        const status = getSubscriptionStatus(sub);
        if (filterStatus === "active" && status.code !== "active") return false;
        if (filterStatus === "pending" && status.code !== "pending") return false;
        if (filterStatus === "warning" && (status.code !== "warning" && status.code !== "critical")) return false;
        if (filterStatus === "expired" && (status.code !== "expired" && status.code !== "finished")) return false;
    }
    return true;
  });

  const handleEdit = (sub: any) => {
    setEditForm({
        id: sub.id,
        visits_remaining: sub.visits_remaining,
        activation_date: sub.activation_date ? format(parseISO(sub.activation_date), 'yyyy-MM-dd') : "",
        end_date: sub.end_date ? format(parseISO(sub.end_date), 'yyyy-MM-dd') : "",
        is_active: sub.is_active
    });
    setIsEditDialogOpen(true);
  };

  const columns = [
    {
      accessorKey: "user",
      header: "Клиент",
      cell: ({ row }: any) => (
        <div>
            <div className="font-bold">{row.original.user?.first_name} {row.original.user?.last_name}</div>
            <div className="text-xs text-gray-500">{row.original.user?.phone}</div>
        </div>
      )
    },
    {
      accessorKey: "plan",
      header: "Тариф",
      cell: ({ row }: any) => <span className="font-medium">{row.original.plan?.name}</span>
    },
    {
      header: "Статус",
      accessorKey: "status_computed",
      cell: ({ row }: any) => {
        const status = getSubscriptionStatus(row.original);
        return <Badge className={`${status.color} border-0`}>{status.label}</Badge>;
      }
    },
    {
        header: "Активация",
        cell: ({ row }: any) => (
            <div className="text-sm">
                {row.original.activation_date ? format(parseISO(row.original.activation_date), 'dd.MM.yyyy') : "-"}
            </div>
        )
    },
    {
        header: "Окончание",
        cell: ({ row }: any) => {
            if (!row.original.end_date) return <span className="text-gray-400">-</span>;
            const status = getSubscriptionStatus(row.original);
            let dateColor = "text-gray-900";
            if (status.code === "critical") dateColor = "text-red-600 font-bold";
            if (status.code === "expired") dateColor = "text-gray-400 decoration-line-through";
            return <div className={`text-sm ${dateColor}`}>{format(parseISO(row.original.end_date), 'dd.MM.yyyy')}</div>
        }
    },
    {
      accessorKey: "visits",
      header: "Остаток",
      cell: ({ row }: any) => (
        <span className={row.original.visits_remaining === 0 ? "text-gray-400 font-bold" : "text-green-700 font-bold"}>
            {row.original.visits_remaining ?? "∞"} / {row.original.visits_total ?? "∞"}
        </span>
      )
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 justify-end">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => handleEdit(row.original)}>
                <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => deleteMutation.mutate(row.original.id)}>
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Журнал абонементов</h1>
        <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Выдать абонемент</Button>
          </DialogTrigger>
          <DialogContent className="overflow-visible"> 
            <DialogHeader>
                <DialogTitle>Новая продажа</DialogTitle>
                <DialogDescription>Выберите клиента, тариф и дату активации.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                
                {/* ПОИСК КЛИЕНТА */}
                <div className="space-y-2 flex flex-col">
                    <Label>Клиент</Label>
                    <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClientSelect}
                          className="w-full justify-between"
                        >
                          {sellForm.user_id
                            ? (() => {
                                const c = clients.find((client: any) => client.id === sellForm.user_id);
                                return c ? `${c.first_name} ${c.last_name} (${c.phone})` : "Клиент не найден";
                              })()
                            : "Выберите клиента (поиск)..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Поиск по имени или телефону..." />
                          <CommandList>
                            <CommandEmpty>Клиент не найден.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((client: any) => (
                                <CommandItem
                                  key={client.id}
                                  value={`${client.first_name} ${client.last_name} ${client.phone}`}
                                  onSelect={() => {
                                    setSellForm({ ...sellForm, user_id: client.id });
                                    setOpenClientSelect(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      sellForm.user_id === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {client.first_name} {client.last_name} ({client.phone})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                </div>

                {/* ВЫБОР ТАРИФА */}
                <div className="space-y-2">
                    <Label>Тариф</Label>
                    <Select onValueChange={(val) => setSellForm({...sellForm, plan_id: val})}>
                        <SelectTrigger><SelectValue placeholder="Выберите тариф..." /></SelectTrigger>
                        <SelectContent>
                            {plans.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} — {p.price} ₸ ({p.duration_days} дн.)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* ДАТА АКТИВАЦИИ */}
                <div className="space-y-2">
                    <Label>Дата активации (начала)</Label>
                    <Input 
                        type="date" 
                        value={sellForm.activation_date} 
                        onChange={(e) => setSellForm({...sellForm, activation_date: e.target.value})} 
                    />
                    <p className="text-xs text-muted-foreground">Если выбрать будущую дату, статус будет "Ждет активации".</p>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => sellMutation.mutate()} disabled={sellMutation.isPending}>
                    {sellMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Выдать
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
        <DataTable columns={columns} data={filteredSubs} emptyMessage="Абонементов не найдено" />
      </div>

      {/* РЕДАКТИРОВАНИЕ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Редактирование абонемента</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>Остаток посещений</Label>
                    <Input type="number" value={editForm.visits_remaining} onChange={e => setEditForm({...editForm, visits_remaining: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Дата активации</Label>
                    <Input 
                        type="date" 
                        value={editForm.activation_date} 
                        onChange={e => {
                            // При изменении активации можно предлагать пересчитать дату окончания
                            // Пока просто меняем стейт
                            setEditForm({...editForm, activation_date: e.target.value});
                        }} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Дата окончания</Label>
                    <Input type="date" value={editForm.end_date} onChange={e => setEditForm({...editForm, end_date: e.target.value})} />
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="is_active_edit" 
                        checked={editForm.is_active} 
                        onChange={e => setEditForm({...editForm, is_active: e.target.checked})} 
                        className="h-4 w-4"
                    />
                    <Label htmlFor="is_active_edit">Абонемент активен</Label>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                    Сохранить изменения
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscriptions;