import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Plus, Loader2, Trash2, ExternalLink, FileText, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const Aggregators = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // НАСТРОЙКА: Значения по умолчанию
  const DEFAULT_AGGREGATOR = "1Fit";
  const DEFAULT_PRICE = "1200";

  const [formData, setFormData] = useState({
    aggregator_name: DEFAULT_AGGREGATOR, // Сразу ставим 1Fit
    client_name: "",
    price: DEFAULT_PRICE,                // Сразу ставим 1200
    notes: "",
    website_url: ""
  });

  // 1. Получаем список
  const { data: aggregators = [], isLoading } = useQuery({
    queryKey: ['aggregators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aggregators')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // 2. Создание записи
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.aggregator_name || !formData.client_name) {
        throw new Error("Укажите название агрегатора и имя клиента");
      }

      const { error } = await supabase.from('aggregators').insert([{
        aggregator_name: formData.aggregator_name,
        client_name: formData.client_name,
        price: parseInt(formData.price) || 0,
        notes: formData.notes,
        website_url: formData.website_url
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Запись добавлена");
      setIsDialogOpen(false);
      // Сбрасываем, но оставляем значения по умолчанию для удобства
      setFormData({ 
        aggregator_name: DEFAULT_AGGREGATOR, 
        client_name: "", 
        price: DEFAULT_PRICE, 
        notes: "", 
        website_url: "" 
      });
      queryClient.invalidateQueries({ queryKey: ['aggregators'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // 3. Удаление
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aggregators').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Удалено");
      queryClient.invalidateQueries({ queryKey: ['aggregators'] });
    }
  });

  const columns = [
    {
      accessorKey: "aggregator_name",
      header: "Агрегатор",
      cell: ({ row }: any) => (
        <div className="font-bold bg-gray-100 px-2 py-1 rounded-md inline-block text-sm">
          {row.original.aggregator_name}
        </div>
      )
    },
    {
      accessorKey: "client_name",
      header: "Имя клиента",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{row.original.client_name}</span>
        </div>
      )
    },
    {
      accessorKey: "price",
      header: "Сумма",
      cell: ({ row }: any) => (
        <div className="font-bold text-green-700">
          {row.original.price} ₸
        </div>
      )
    },
    {
      accessorKey: "notes",
      header: "Комментарий",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2 text-gray-500 text-sm max-w-[200px] truncate">
            {row.original.notes && <FileText className="w-3 h-3" />}
            {row.original.notes || "-"}
        </div>
      )
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <div className="flex justify-end gap-2">
            {row.original.website_url && (
                <a href={row.original.website_url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4 text-gray-500" /></Button>
                </a>
            )}
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
        <h1 className="text-3xl font-bold">Учет посещений от Агрегаторов</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Добавить посещение</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая запись</DialogTitle>
              <DialogDescription>Фиксация клиента от партнера (1Fit и др.)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Агрегатор *</Label>
                    <Input 
                        value={formData.aggregator_name} 
                        onChange={e => setFormData({...formData, aggregator_name: e.target.value})} 
                        placeholder="1Fit" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Имя клиента *</Label>
                    <Input 
                        value={formData.client_name} 
                        onChange={e => setFormData({...formData, client_name: e.target.value})} 
                        placeholder="Айгерим" 
                    />
                  </div>
              </div>

              <div className="space-y-2">
                <Label>Сумма оплаты (₸)</Label>
                <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    placeholder="1200" 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Время посещения, детали..." 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Ссылка (чек/скриншот)</Label>
                <Input value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} placeholder="https://" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <DataTable columns={columns} data={aggregators} emptyMessage="Записей пока нет" />
      )}
    </div>
  );
};

export default Aggregators;