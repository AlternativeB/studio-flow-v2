import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Loader2, User, Phone, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Instructors = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    phone: "",
    photo_url: ""
  });

  // 1. Получаем список тренеров из таблицы 'coaches'
  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // 2. Создание тренера
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name) throw new Error("Имя обязательно");

      const { error } = await supabase.from('coaches').insert([{
        name: formData.name,
        specialization: formData.specialization,
        phone: formData.phone,
        photo_url: formData.photo_url
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тренер добавлен");
      setIsDialogOpen(false);
      setFormData({ name: "", specialization: "", phone: "", photo_url: "" });
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 3. Удаление тренера
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тренер удален");
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
    onError: (err) => toast.error("Ошибка удаления: " + err.message)
  });

  const columns = [
    {
      accessorKey: "name",
      header: "Тренер",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={row.original.photo_url} />
            <AvatarFallback>{row.original.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-gray-500">{row.original.specialization}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: "phone",
      header: "Контакты",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="w-3 h-3" />
          {row.original.phone || "-"}
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => deleteMutation.mutate(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Инструкторы</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить тренера</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый инструктор</DialogTitle>
              <DialogDescription>
                Добавьте профиль тренера для отображения в расписании.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Имя и Фамилия *</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Анна Иванова"
                />
              </div>
              <div className="space-y-2">
                <Label>Специализация</Label>
                <Input 
                  value={formData.specialization} 
                  onChange={e => setFormData({...formData, specialization: e.target.value})} 
                  placeholder="Йога, Пилатес"
                />
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+7..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ссылка на фото (не обязательно)</Label>
                <Input 
                  value={formData.photo_url} 
                  onChange={e => setFormData({...formData, photo_url: e.target.value})} 
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <DataTable columns={columns} data={coaches} emptyMessage="Список тренеров пуст" />
      )}
    </div>
  );
};

export default Instructors;