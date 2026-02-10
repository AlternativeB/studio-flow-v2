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
    { name: "Меню", href: "/dashboard", icon: Menu }, 
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      {/* Используем GRID вместо FLEX, чтобы кнопки были одинаковой ширины */}
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center gap-1 w-full h-full active:bg-gray-50"
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400"
                )}
              >
                <item.icon className="w-6 h-6" />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
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