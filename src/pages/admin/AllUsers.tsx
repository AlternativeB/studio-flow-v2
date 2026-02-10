import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Search, Loader2, UserCog } from "lucide-react";

const AllUsers = () => {
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin_all_users'],
    queryFn: async () => {
      // Вызываем нашу новую безопасную функцию RPC
      const { data, error } = await supabase.rpc('get_all_users_for_admin');
      if (error) throw error;
      return data || [];
    }
  });

  const filteredUsers = users.filter((u: any) => {
    const searchLower = search.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    
    return fullName.includes(searchLower) || email.includes(searchLower) || phone.includes(searchLower);
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <UserCog className="w-8 h-8 text-primary" /> Все пользователи
            </h1>
            <p className="text-gray-500">Полный список регистраций в системе</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
                placeholder="Поиск по email, имени или телефону..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email (Login)</TableHead>
                            <TableHead>Имя</TableHead>
                            <TableHead>Телефон</TableHead>
                            <TableHead>Роль</TableHead>
                            <TableHead>Регистрация</TableHead>
                            <TableHead>Последний вход</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                                    Пользователи не найдены
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>{user.first_name ? `${user.first_name} ${user.last_name || ''}` : '-'}</TableCell>
                                    <TableCell>{user.phone || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500">
                                        {user.registered_at ? format(parseISO(user.registered_at), 'dd.MM.yyyy HH:mm') : '-'}
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500">
                                        {user.last_sign_in_at ? format(parseISO(user.last_sign_in_at), 'dd.MM.yyyy HH:mm') : 'Никогда'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        )}
      </div>
    </div>
  );
};

export default AllUsers;