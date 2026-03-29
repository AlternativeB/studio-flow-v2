import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar, Users, Percent, Menu, ClipboardCheck, Globe, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const MobileNav = () => {
  const location = useLocation();

  const { data: userRole } = useQuery({
    queryKey: ["current_user_role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      return data?.role;
    },
    staleTime: 60_000,
  });

  const adminNav = [
    { name: "Расписание", href: "/schedule", icon: Calendar },
    { name: "Записать", href: "/admin/checkin", icon: ClipboardCheck },
    { name: "Клиенты", href: "/clients", icon: Users },
    { name: "Пробные", href: "/trials", icon: Percent },
    { name: "Меню", href: "/dashboard", icon: Menu },
  ];

  const ownerNav = [
    { name: "Расписание", href: "/schedule", icon: Calendar },
    { name: "Агрегаторы", href: "/aggregators", icon: Globe },
    { name: "Клиенты", href: "/clients", icon: Users },
    { name: "Зарплата", href: "/owner/payroll", icon: DollarSign },
    { name: "Меню", href: "/dashboard", icon: Menu },
  ];

  const navItems = userRole === "owner" ? ownerNav : adminNav;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center gap-0.5 w-full h-full active:bg-gray-50"
            >
              <div className={cn("p-1 rounded-lg transition-colors", isActive ? "text-blue-600" : "text-gray-400")}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className={cn("text-[9px] font-medium leading-none", isActive ? "text-blue-600" : "text-gray-500")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};