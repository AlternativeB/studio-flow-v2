import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, isFuture, isPast, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Search, UserPlus, FileSpreadsheet, MessageCircle } from "lucide-react"; // ДОБАВЛЕНО: MessageCircle
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import { toast } from "sonner"; // Добавил для уведомлений если нет номера

// Типы для статусов
type SubStatus = 'active' | 'expired' | 'none';

export default function Clients() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients_with_subs'],
    queryFn: async () => {
      // Запрашиваем клиентов И их последний абонемент (сортируем по дате окончания)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            last_sub:user_subscriptions(
                end_date,
                is_active,
                visits_remaining
            )
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false }); // Сортировка клиентов по новизне
      
      if (error) throw error;

      // Обрабатываем данные: находим "самый свежий" абонемент для каждого клиента
      return data.map((client: any) => {
          const sortedSubs = client.last_sub?.sort((a: any, b: any) => 
              new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
          );
          const lastSub = sortedSubs?.[0];

          return { ...client, lastSub };
      });
    }
  });

  // Функция определения статуса
  const getClientStatus = (client: any): SubStatus => {
      const sub = client.lastSub;
      
      if (!sub) return 'none'; // Никогда не было абонемента

      const endDate = parseISO(sub.end_date);
      
      // Если абонемент выключен вручную или истек срок, или кончились визиты
      if (!sub.is_active) return 'expired';
      if (isPast(endDate) && !isFuture(endDate)) return 'expired'; // Дата прошла
      if (sub.visits_remaining === 0) return 'expired'; // Визиты кончились

      return 'active'; // Во всех остальных случаях активен
  };

  const filteredClients = clients.filter((client: any) => {
    const searchString = searchTerm.toLowerCase();
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase();
    const phone = client.phone || '';
    
    // 1. Фильтр по поиску
    const matchesSearch = fullName.includes(searchString) || phone.includes(searchString);
    
    // 2. Фильтр по статусу (новому)
    let matchesStatus = true;
    const currentStatus = getClientStatus(client);

    if (statusFilter !== 'all') {
        if (statusFilter === 'active' && currentStatus !== 'active') matchesStatus = false;
        if (statusFilter === 'expired' && currentStatus !== 'expired') matchesStatus = false;
        if (statusFilter === 'none' && currentStatus !== 'none') matchesStatus = false;
    }

    return matchesSearch && matchesStatus;
  });

  // --- НОВАЯ ФУНКЦИЯ: ОТПРАВКА НАПОМИНАНИЯ ---
  const sendPaymentReminder = (client: any) => {
    if (!client.phone) {
        toast.error("У клиента не указан телефон");
        return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const text = `Здравствуйте, ${client.first_name}! 👋\nНапоминаем, что срок действия вашего абонемента подходит к концу (или закончился).\nБудем рады видеть вас снова на тренировках! 🧘‍♀️💳`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const exportToExcel = () => {
    if (typeof XLSX === 'undefined') {
        alert("Библиотека xlsx не установлена (npm i xlsx)");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredClients.map((c: any) => {
        const status = getClientStatus(c);
        const statusText = status === 'active' ? 'Активен' : status === 'expired' ? 'Истек' : 'Нет абонемента';
        
        return {
            'Имя': c.first_name,
            'Фамилия': c.last_name,
            'Телефон': c.phone,
            'Email': c.email,
            'Статус абонемента': statusText,
            'Окончание': c.lastSub?.end_date ? format(parseISO(c.lastSub.end_date), 'dd.MM.yyyy') : '-',
            'Баланс': c.balance,
            'Дата регистрации': format(new Date(c.created_at), 'dd.MM.yyyy')
        };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Клиенты");
    XLSX.writeFile(wb, `clients_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клиенты</h1>
          <p className="text-muted-foreground">Управление базой клиентов</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Экспорт в Excel
          </Button>
          <Button onClick={() => navigate('/trials')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Добавить
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Статус абонемента" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные абонементы</SelectItem>
            <SelectItem value="expired">Истекшие абонементы</SelectItem>
            <SelectItem value="none">Без абонемента</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Загрузка...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Клиенты не найдены</div>
        ) : filteredClients.map((client: any) => {
          const status = getClientStatus(client);
          return (
            <div
              key={client.id}
              className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm active:scale-[0.99] transition-all"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{client.first_name} {client.last_name}</p>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ml-2 ${
                  status === 'active' ? 'bg-green-100 text-green-700' :
                  status === 'expired' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {status === 'active' ? 'Активен' : status === 'expired' ? 'Истёк' : 'Нет'}
                </span>
              </div>
              {client.lastSub && (
                <div className="mt-2 text-xs text-gray-400 flex items-center justify-between">
                  <span>До: {format(parseISO(client.lastSub.end_date), 'dd.MM.yyyy')}</span>
                  {client.balance != null && <span>{client.balance} ₸</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block border rounded-lg bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Абонемент</TableHead>
              <TableHead>Истекает</TableHead>
              <TableHead>Баланс</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Загрузка...</TableCell>
              </TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Клиенты не найдены</TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client: any) => {
                const status = getClientStatus(client);
                
                return (
                    <TableRow 
                        key={client.id} 
                        className="hover:bg-muted/50 cursor-pointer" 
                        onClick={() => navigate(`/clients/${client.id}`)}
                    >
                    <TableCell>
                        <div className="font-medium">{client.first_name} {client.last_name}</div>
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                    </TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'active' ? 'bg-green-100 text-green-700' :
                        status === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                        }`}>
                        {status === 'active' ? 'Активен' :
                        status === 'expired' ? 'Истек' : 'Нет'}
                        </span>
                    </TableCell>
                    <TableCell>
                        {client.lastSub ? (
                            <span className={status === 'expired' ? 'text-red-500 text-sm' : 'text-sm'}>
                                {format(parseISO(client.lastSub.end_date), 'dd.MM.yyyy')}
                            </span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                    </TableCell>
                    <TableCell>{client.balance != null ? `${client.balance} ₸` : '—'}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Действия</DropdownMenuLabel>
                            
                            {/* НОВЫЙ ПУНКТ МЕНЮ: НАПОМНИТЬ ОБ ОПЛАТЕ */}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sendPaymentReminder(client); }}>
                                <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                                Напомнить об оплате
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                            Просмотр
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                            Редактировать
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}