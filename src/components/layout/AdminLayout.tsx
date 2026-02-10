import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export const AdminLayout = () => {
  return (
    // 1. УБРАЛИ 'flex', оставили просто min-h-screen
    <div className="min-h-screen bg-slate-50 relative">
      
      {/* Боковое меню (Desktop) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Основная область */}
      {/* w-full = на мобильном ширина 100% */}
      {/* ml-0 = на мобильном отступа слева нет */}
      {/* md:ml-64 = на ПК отступ 64 (256px) под сайдбар */}
      {/* pb-20 = отступ снизу, чтобы мобильное меню не закрывало контент */}
      <main className="w-full md:w-auto ml-0 md:ml-64 p-4 md:p-8 min-h-screen pb-24 md:pb-8 transition-all">
        {/* Ограничитель ширины, чтобы на больших экранах не растягивалось слишком сильно */}
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
          <Outlet />
        </div>
      </main>

      {/* Мобильное меню (Mobile) */}
      <MobileNav />
      
    </div>
  );
};