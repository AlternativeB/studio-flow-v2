import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar, Users, ClipboardCheck, Percent, Menu } from "lucide-react";

export const MobileNav = () => {
  const location = useLocation();

  const navItems = [
    { name: "Расписание", href: "/schedule", icon: Calendar },
    { name: "Посещения", href: "/attendance", icon: ClipboardCheck },
    { name: "Клиенты", href: "/clients", icon: Users },
    { name: "Пробные", href: "/trials", icon: Percent },
    // Можно добавить ссылку на дашборд или меню
    { name: "Меню", href: "/dashboard", icon: Menu }, 
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-2 pb-safe">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <div
                className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive ? "bg-blue-100 text-blue-600" : "text-gray-400"
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};