import { Outlet } from "react-router-dom";
// ИСПРАВЛЕНИЕ: Sidebar лежит в той же папке, поэтому используем "./Sidebar"
import { Sidebar } from "./Sidebar"; 

export const AdminLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Боковое меню (статичное) */}
      <Sidebar />
      
      {/* Основная рабочая область */}
      {/* ml-64 создает отступ слева, чтобы контент не заезжал под меню */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Сюда подставляются страницы */}
            <Outlet />
        </div>
      </main>
    </div>
  );
};