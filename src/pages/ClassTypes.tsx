import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClassTypes() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", duration: "60", color: "#3b82f6" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classTypes = [], isLoading } = useQuery({
    queryKey: ['class_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('class_types').insert([{
        name: formData.name,
        description: formData.description,
        duration_min: parseInt(formData.duration), // Важно: duration_min и число
        color: formData.color
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class_types'] });
      setIsOpen(false);
      setFormData({ name: "", description: "", duration: "60", color: "#3b82f6" });
      toast({ title: "Успешно", description: "Тип занятия создан" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены?")) return;
    const { error } = await supabase.from('class_types').delete().eq('id', id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ['class_types'] });
      toast({ title: "Удалено", description: "Тип занятия удален" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Типы занятий</h1>
          <p className="text-muted-foreground">Настройка видов тренировок</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить тип
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый тип занятия</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Название (например, Йога)" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Textarea 
                  placeholder="Описание" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input 
                    type="number"
                    placeholder="Длительность (мин)" 
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Input 
                    type="color"
                    className="h-10 px-2"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()}>
                Сохранить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Длительность</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classTypes.map((type: any) => (
              <TableRow key={type.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }} />
                  {type.name}
                </TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell>{type.duration_min} мин</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}