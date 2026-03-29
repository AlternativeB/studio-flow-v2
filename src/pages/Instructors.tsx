import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Loader2, User, Phone, Trash2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Instructors = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any>(null);

  const emptyForm = { name: "", specialization: "", phone: "", photo_url: "", bio: "", is_active: true, rate_per_client: "" };
  const [formData, setFormData] = useState(emptyForm);
  const [selectedClassTypes, setSelectedClassTypes] = useState<string[]>([]);

  // 1. Список тренеров с их типами занятий
  const { data: coaches = [], isLoading } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*, coach_class_types(class_type_id, class_types(id, name, color))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // 2. Все типы занятий для мультиселекта
  const { data: classTypes = [] } = useQuery({
    queryKey: ['class_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('class_types').select('id, name, color').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // 3. Создание тренера
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name) throw new Error("Имя обязательно");

      const { data: newCoach, error } = await supabase.from('coaches').insert([{
        name: formData.name,
        specialization: formData.specialization,
        phone: formData.phone,
        photo_url: formData.photo_url,
        bio: formData.bio,
        is_active: formData.is_active,
        rate_per_client: parseInt(formData.rate_per_client) || 0
      }]).select().single();

      if (error) throw error;

      if (selectedClassTypes.length > 0) {
        const links = selectedClassTypes.map(ctId => ({ coach_id: newCoach.id, class_type_id: ctId }));
        const { error: linkError } = await supabase.from('coach_class_types').insert(links);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Тренер добавлен");
      setIsDialogOpen(false);
      setFormData(emptyForm);
      setSelectedClassTypes([]);
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  // 4. Редактирование тренера
  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('coaches').update({
        name: formData.name,
        specialization: formData.specialization,
        phone: formData.phone,
        photo_url: formData.photo_url,
        bio: formData.bio,
        is_active: formData.is_active,
        rate_per_client: parseInt(formData.rate_per_client) || 0
      }).eq('id', editingCoach.id);

      if (error) throw error;

      // Обновляем связи с типами занятий
      await supabase.from('coach_class_types').delete().eq('coach_id', editingCoach.id);
      if (selectedClassTypes.length > 0) {
        const links = selectedClassTypes.map(ctId => ({ coach_id: editingCoach.id, class_type_id: ctId }));
        const { error: linkError } = await supabase.from('coach_class_types').insert(links);
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      toast.success("Тренер обновлён");
      setIsDialogOpen(false);
      setEditingCoach(null);
      setFormData(emptyForm);
      setSelectedClassTypes([]);
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
    onError: (err: any) => toast.error("Ошибка: " + err.message)
  });

  // 5. Удаление тренера
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coaches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тренер удален");
      queryClient.invalidateQueries({ queryKey: ['coaches'] });
    },
    onError: (err: any) => toast.error("Ошибка удаления: " + err.message)
  });

  const openCreate = () => {
    setEditingCoach(null);
    setFormData(emptyForm);
    setSelectedClassTypes([]);
    setIsDialogOpen(true);
  };

  const openEdit = (coach: any) => {
    setEditingCoach(coach);
    setFormData({
      name: coach.name || "",
      specialization: coach.specialization || "",
      phone: coach.phone || "",
      photo_url: coach.photo_url || "",
      bio: coach.bio || "",
      is_active: coach.is_active ?? true,
      rate_per_client: coach.rate_per_client != null ? String(coach.rate_per_client) : ""
    });
    const existingTypes = (coach.coach_class_types || []).map((cct: any) => cct.class_type_id);
    setSelectedClassTypes(existingTypes);
    setIsDialogOpen(true);
  };

  const toggleClassType = (id: string) => {
    setSelectedClassTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
            <div className="flex flex-wrap gap-1 mt-1">
              {(row.original.coach_class_types || []).map((cct: any) => (
                <Badge
                  key={cct.class_type_id}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                  style={{ backgroundColor: cct.class_types?.color + '33', color: cct.class_types?.color }}
                >
                  {cct.class_types?.name}
                </Badge>
              ))}
              {(row.original.coach_class_types || []).length === 0 && row.original.specialization && (
                <span className="text-xs text-gray-500">{row.original.specialization}</span>
              )}
            </div>
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
      accessorKey: "is_active",
      header: "Статус",
      cell: ({ row }: any) => (
        <span className={`text-xs px-2 py-1 rounded ${row.original.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {row.original.is_active ? "Активен" : "Неактивен"}
        </span>
      )
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => openEdit(row.original)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => { if (confirm("Удалить тренера?")) deleteMutation.mutate(row.original.id); }}
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
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Добавить тренера
        </Button>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <DataTable columns={columns} data={coaches} emptyMessage="Список тренеров пуст" />
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingCoach(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoach ? "Редактировать тренера" : "Новый инструктор"}</DialogTitle>
            <DialogDescription>
              {editingCoach ? "Измените данные тренера." : "Добавьте профиль тренера для отображения в расписании."}
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
              <Label>Телефон</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+7..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ссылка на фото</Label>
              <Input
                value={formData.photo_url}
                onChange={e => setFormData({...formData, photo_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>О тренере (bio)</Label>
              <Textarea
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Краткое описание..."
              />
            </div>

            <div className="space-y-2">
              <Label>Ставка за клиента (₸)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.rate_per_client || ""}
                onChange={e => setFormData({...formData, rate_per_client: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Оплата тренеру за каждого клиента на занятии</p>
            </div>

            {/* Специализация — мультиселект из class_types */}
            <div className="space-y-2">
              <Label>Специализация (типы занятий)</Label>
              {classTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Сначала добавьте типы занятий</p>
              ) : (
                <div className="border rounded-md p-3 grid grid-cols-2 gap-2">
                  {classTypes.map((ct: any) => (
                    <div key={ct.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`ct-${ct.id}`}
                        checked={selectedClassTypes.includes(ct.id)}
                        onCheckedChange={() => toggleClassType(ct.id)}
                      />
                      <label
                        htmlFor={`ct-${ct.id}`}
                        className="text-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: ct.color }} />
                        {ct.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 border p-3 rounded-md bg-muted/20">
              <Switch
                checked={formData.is_active}
                onCheckedChange={c => setFormData({...formData, is_active: c})}
              />
              <Label>Активен</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => editingCoach ? updateMutation.mutate() : createMutation.mutate()}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCoach ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Instructors;
