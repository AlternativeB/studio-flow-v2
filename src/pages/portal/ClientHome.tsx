import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Ticket, Calendar, MessageCircle, ChevronRight, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- КОНСТАНТЫ ---
const ADMIN_PHONE = "77076724776"; // Укажите реальный номер

const ClientHome = () => {
  const navigate = useNavigate();
  const [selectedNews, setSelectedNews] = useState<any>(null);

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['portal_home_data'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Нет авторизации");

      // 1. Профиль
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (pError) throw pError;

      // 2. Абонементы
      // ИЗМЕНЕНИЕ: Упрощенный запрос без bookings, доверяем visits_remaining из БД
      const today = new Date().toISOString().split('T')[0];
      const { data: subs } = await supabase
        .from('user_subscriptions')
        .select('*, plan:subscription_plans(name)')
        .eq('user_id', profile.id) 
        .eq('is_active', true)
        .gte('end_date', today)
        .order('end_date', { ascending: true }); // Сортируем: сначала те, что раньше кончатся

      // 3. Новости (берем больше, чтобы был смысл в скролле)
      const { data: news } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      // Ищем активный абонемент:
      // Либо безлимит (visits_total === null)
      // Либо есть остаток (visits_remaining > 0)
      const activeSub = subs?.find((s: any) => s.visits_total === null || s.visits_remaining > 0);

      return { profile, subscriptions: subs || [], activeSub, news: news || [] };
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/portal/login");
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/${ADMIN_PHONE}`, '_blank');
  };

  if (isLoading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-blue-600" /></div>;

  const profile = clientData?.profile;
  const activeSub = clientData?.activeSub;
  const newsList = clientData?.news || [];

  return (
    <div className="space-y-6 animate-in fade-in pb-24">
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 pt-4">
        <div>
          <h1 className="text-2xl font-bold">Привет, {profile?.first_name}! 👋</h1>
          <p className="text-gray-500 text-sm">Хорошего дня!</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-gray-400" />
        </Button>
      </div>

      {/* АБОНЕМЕНТ */}
      <section className="px-4">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-600" /> Мой абонемент
            </h2>
            <Button variant="ghost" size="sm" className="h-8 text-blue-600 px-0 hover:bg-transparent" onClick={() => navigate('/portal/pricing')}>
                Все тарифы <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
        
        {activeSub ? (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Тариф</p>
                            <h3 className="text-2xl font-bold">{activeSub.plan?.name}</h3>
                        </div>
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">Активен</Badge>
                    </div>
                    <div className="flex justify-between mt-6">
                        <div>
                            <p className="text-blue-200 text-xs mb-1">Осталось</p>
                            <p className="text-3xl font-bold">{activeSub.visits_remaining ?? "∞"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-200 text-xs mb-1">До</p>
                            <p className="text-lg font-medium">
                                {activeSub.end_date ? format(parseISO(activeSub.end_date), 'dd.MM.yyyy') : "∞"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <Card className="border-dashed border-2 bg-gray-50">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="font-medium text-gray-900">Нет активного абонемента</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Купите абонемент, чтобы записаться.</p>
                    <Button variant="default" size="sm" onClick={() => navigate('/portal/pricing')}>
                        Купить абонемент
                    </Button>
                </CardContent>
            </Card>
        )}
      </section>

      {/* МЕНЮ ДЕЙСТВИЙ */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <Button className="h-16 bg-white text-gray-800 border shadow-sm hover:bg-gray-50 flex flex-col items-center justify-center gap-1" onClick={() => navigate('/portal/schedule')}>
            <Calendar className="w-6 h-6 text-blue-600" /> 
            <span>Расписание</span>
        </Button>
        <Button className="h-16 bg-white text-gray-800 border shadow-sm hover:bg-gray-50 flex flex-col items-center justify-center gap-1" onClick={openWhatsApp}>
            <MessageCircle className="w-6 h-6 text-green-600" />
            <span>Чат с админом</span>
        </Button>
      </div>

      {/* НОВОСТИ (Вертикальный скролл) */}
      {newsList.length > 0 && (
        <section className="px-4 pt-2">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" /> Новости
            </h2>
            {/* Ограничиваем высоту max-h-[300px] и включаем overflow-y-auto */}
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {newsList.map((item: any) => (
                    <div 
                        key={item.id} 
                        className="w-full bg-white border border-gray-100 rounded-xl p-4 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
                        onClick={() => setSelectedNews(item)}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-sm leading-tight flex-1 mr-2">{item.title}</h4>
                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md">
                                {format(parseISO(item.published_at), 'dd.MM')}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {item.content}
                        </p>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* МОДАЛЬНОЕ ОКНО НОВОСТИ */}
      <Dialog open={!!selectedNews} onOpenChange={(open) => !open && setSelectedNews(null)}>
        <DialogContent className="max-w-xs sm:max-w-md rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-lg font-bold pr-6 leading-tight">{selectedNews?.title}</DialogTitle>
                <DialogDescription>
                    {selectedNews?.published_at && format(parseISO(selectedNews.published_at), 'd MMMM yyyy', { locale: (window as any).dateFnsLocale })}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-2">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedNews?.content}
                </p>
            </ScrollArea>
            <DialogFooter>
                <Button className="w-full rounded-xl" onClick={() => setSelectedNews(null)}>Закрыть</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientHome;