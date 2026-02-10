import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, Calendar, User, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface ClientLayoutProps {
  children?: React.ReactNode;
}

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const location = useLocation();

  const navItems = [
    { name: "Главная", href: "/portal", icon: Home },
    { name: "Расписание", href: "/portal/schedule", icon: Calendar },
    { name: "Тренеры", href: "/portal/instructors", icon: Dumbbell },
    { name: "Профиль", href: "/portal/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Основной контент */}
      <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl overflow-hidden relative">
        <div className="h-full overflow-y-auto px-4 pt-6 pb-20">
           {children || <Outlet />}
        </div>
      </main>

      {/* Нижнее меню (Dock) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 px-6 py-2 flex justify-between items-center max-w-md mx-auto shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 active:scale-95 w-16 py-2",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon 
                className={cn(
                    "w-6 h-6 transition-all duration-300", 
                    isActive && "fill-primary/20 scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};