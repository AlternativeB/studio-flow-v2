import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav"; // Импортируем наше новое меню

export const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* 1. БОКОВОЕ МЕНЮ */}
      {/* hidden = скрыто по умолчанию (на телефоне) */}
      {/* md:block = показывается только на экранах шире телефона (Desktop) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 2. ОСНОВНАЯ ОБЛАСТЬ */}
      {/* ml-0 = на телефоне отступа слева НЕТ */}
      {/* md:ml-64 = на компьютере отступ ЕСТЬ (твой старый класс) */}
      {/* pb-20 = отступ снизу на телефоне, чтобы контент не перекрывался меню */}
      {/* md:pb-0 = на компьютере отступ снизу не нужен */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 overflow-y-auto h-screen pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto space-y-6">
          <Outlet />
        </div>
      </main>

      {/* 3. МОБИЛЬНОЕ МЕНЮ */}
      {/* Оно само внутри себя знает, что на компе показываться не надо */}
      <MobileNav />
      
    </div>
  );
};