import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2, X } from "lucide-react";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const ClientInstructors = () => {
  const [selectedCoach, setSelectedCoach] = useState<any>(null);

  // Загружаем тренеров
  const { data: instructors = [], isLoading } = useQuery({
    queryKey: ['portal_instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <ClientLayout>
      <div className="space-y-6 pb-20 px-4">
        <h1 className="text-xl font-bold pt-4">Наши тренеры</h1>
        
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>
        ) : instructors.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Список тренеров пуст</div>
        ) : (
          <div className="grid gap-3">
            {instructors.map((coach: any) => (
              <Card 
                key={coach.id} 
                className="overflow-hidden border-0 shadow-sm ring-1 ring-gray-100 rounded-xl hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                onClick={() => setSelectedCoach(coach)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-white shadow-sm shrink-0">
                    <AvatarImage src={coach.photo_url} alt={coach.name} className="object-cover" />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                      {coach.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{coach.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">
                      {coach.description || "Инструктор студии"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Модальное окно с деталями */}
        <Dialog open={!!selectedCoach} onOpenChange={(open) => !open && setSelectedCoach(null)}>
            <DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 overflow-hidden gap-0">
                
                {/* Фото в шапке */}
                <div className="relative h-48 bg-gray-100 w-full">
                    {selectedCoach?.photo_url ? (
                        <img 
                            src={selectedCoach.photo_url} 
                            alt={selectedCoach.name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-300">
                            <span className="text-6xl font-bold">{selectedCoach?.name?.[0]}</span>
                        </div>
                    )}
                    
                    {/* Кнопка закрытия */}
                    <button 
                        onClick={() => setSelectedCoach(null)}
                        className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <DialogHeader className="mb-4 text-left">
                        <DialogTitle className="text-2xl font-bold">{selectedCoach?.name}</DialogTitle>
                        {/* Если есть отдельное поле специализации, можно добавить его сюда */}
                        <DialogDescription className="text-base font-medium text-primary">
                            Инструктор
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[300px] pr-2">
                        <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                            {selectedCoach?.description ? (
                                selectedCoach.description.split('\n').map((paragraph: string, i: number) => (
                                    <p key={i}>{paragraph}</p>
                                ))
                            ) : (
                                <p className="italic text-gray-400">Информация о тренере пока не заполнена.</p>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="mt-6">
                        <Button className="w-full rounded-xl" onClick={() => setSelectedCoach(null)}>
                            Закрыть
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
};

export default ClientInstructors;