import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar рендерится один раз и не перерисовывается при навигации */}
      <Sidebar />
      
      {/* main — это область, где меняется контент */}
      <main className="flex-1 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
            {/* Outlet — это место, куда React Router подставляет текущую страницу */}
            <Outlet />
        </div>
      </main>
    </div>
  );
};