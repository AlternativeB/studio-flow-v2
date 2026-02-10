import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Megaphone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const News = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Состояние формы (добавил is_published согласно вашей схеме)
  const [form, setForm] = useState({ 
    title: "", 
    content: "", 
    is_published: true 
  });

  // 1. Загрузка новостей
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('published_at', { ascending: false }); // Сортируем по дате публикации
      
      if (error) {
        console.error("Ошибка загрузки новостей:", error);
        return [];
      }
      return data;
    }
  });

  // 2. Создание новости
  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.content) throw new Error("Заполните заголовок и текст");
      
      const { error } = await supabase.from('news').insert({
        title: form.title,
        content: form.content,
        is_published: form.is_published,
        published_at: new Date().toISOString() // Явно ставим дату публикации
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Новость добавлена");
      setIsDialogOpen(false);
      setForm({ title: "", content: "", is_published: true });
      queryClient.invalidateQueries({ queryKey: ['news_list'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // 3. Удаление новости
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ['news_list'] });
    },
    onError: (err: any) => toast.error("Ошибка удаления: " + err.message)
  });

  // 4. Переключение статуса публикации (быстрое редактирование)
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: boolean }) => {
        const { error } = await supabase.from('news').update({ is_published: status }).eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Статус обновлен");
        queryClient.invalidateQueries({ queryKey: ['news_list'] });
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Заголовок и кнопка */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold">Новости студии</h1>
            <p className="text-muted-foreground">Управление новостной лентой приложения</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Опубликовать
        </Button>
      </div>

      {/* Список новостей */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
        ) : news.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 border rounded-lg border-dashed">
            Нет опубликованных новостей
          </div>
        ) : (
          news.map((item: any) => (
            <Card key={item.id} className={!item.is_published ? "opacity-60 bg-gray-50" : ""}>
              <CardContent className="p-6 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {/* Статус */}
                    {item.is_published ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0">Опубликовано</Badge>
                    ) : (
                        <Badge variant="outline" className="text-gray-500">Черновик</Badge>
                    )}
                    
                    {/* Дата */}
                    <div className="flex items-center gap-1 text-muted-foreground text-xs ml-2">
                      <Calendar className="w-3 h-3" />
                      {item.published_at 
                        ? format(parseISO(item.published_at), "dd.MM.yyyy HH:mm") 
                        : "Нет даты"}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2" title="Опубликовать / Скрыть">
                    <Switch 
                        checked={item.is_published} 
                        onCheckedChange={(checked) => togglePublishMutation.mutate({ id: item.id, status: checked })}
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => { if(confirm("Удалить новость?")) deleteMutation.mutate(item.id) }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Модальное окно создания */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новая публикация</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input 
                value={form.title} 
                onChange={e => setForm({...form, title: e.target.value})} 
                placeholder="Например: Изменение в расписании"
              />
            </div>
            <div className="space-y-2">
              <Label>Текст новости</Label>
              <Textarea 
                className="h-32" 
                value={form.content} 
                onChange={e => setForm({...form, content: e.target.value})} 
                placeholder="Текст сообщения для клиентов..."
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
                <Switch 
                    id="publish-now"
                    checked={form.is_published} 
                    onCheckedChange={c => setForm({...form, is_published: c})} 
                />
                <Label htmlFor="publish-now">Опубликовать сразу</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
              {form.is_published ? "Опубликовать" : "Сохранить как черновик"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default News;