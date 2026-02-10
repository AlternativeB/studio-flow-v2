import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// === Layouts ===
import { AdminLayout } from "./components/layout/AdminLayout";
import { ClientLayout } from "./components/layout/ClientLayout"; 

// === Pages (Админка) ===
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; 
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Schedule from "./pages/Schedule";
import Subscriptions from "./pages/Subscriptions";
import Attendance from "./pages/Attendance";
import Instructors from "./pages/Instructors";
import Trials from "./pages/Trials";
import Settings from "./pages/Settings";
import SubscriptionPlans from "./pages/SubscriptionPlans"; 
import ClassTypes from "./pages/ClassTypes";
import Aggregators from "./pages/Aggregators";
import News from "./pages/News";
import NotFound from "./pages/NotFound";

// ИСПРАВЛЕНИЕ ЗДЕСЬ: Добавили "/admin" в путь
import AllUsers from "./pages/admin/AllUsers"; 

// === Pages (Клиентский портал) ===
import ClientLogin from "./pages/portal/ClientLogin";
import ClientHome from "./pages/portal/ClientHome";
import ClientSchedule from "./pages/portal/ClientSchedule";
import ClientInstructors from "./pages/portal/ClientInstructors";
import ClientProfile from "./pages/portal/ClientProfile";
import ClientPricing from "./pages/portal/ClientPricing";

const queryClient = new QueryClient();

// === КОМПОНЕНТ ЗАЩИТЫ ===
const ProtectedRoute = ({ children, checkAdmin = false }: { children?: React.ReactNode, checkAdmin?: boolean }) => {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);

  useEffect(() => {
    // Инициализация сессии
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user && checkAdmin) {
        checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    // Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user && checkAdmin) {
        checkUserRole(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const checkUserRole = async (userId: string) => {
    setIsCheckingRole(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Ошибка проверки роли (RLS или рекурсия):", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.role === 'admin');
      }
    } catch (err) {
      console.error("Критическая ошибка:", err);
      setIsAdmin(false);
    } finally {
      setIsCheckingRole(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. Состояние загрузки
  if (session === undefined || (checkAdmin && session && (isAdmin === null || isCheckingRole))) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Нет сессии -> На соответствующую страницу входа
  if (session === null) {
    return <Navigate to={checkAdmin ? "/login" : "/portal/login"} replace />;
  }

  // 3. Есть сессия, но нет прав администратора
  if (checkAdmin && !isAdmin) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-4 text-center bg-gray-50 gap-4">
        <h1 className="text-2xl font-bold text-destructive">Доступ запрещен</h1>
        <p className="text-muted-foreground">У вас нет прав администратора для доступа к этой части системы.</p>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" /> Выйти и войти под другим аккаунтом
        </Button>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

// === ОСНОВНОЕ ПРИЛОЖЕНИЕ ===
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/login" element={<Login />} />
          <Route path="/portal/login" element={<ClientLogin />} />

          {/* === АДМИНКА === */}
          <Route element={<ProtectedRoute checkAdmin><AdminLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/instructors" element={<Instructors />} />
            <Route path="/trials" element={<Trials />} />
            <Route path="/aggregators" element={<Aggregators />} />
            <Route path="/news" element={<News />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin/plans" element={<SubscriptionPlans />} />
            <Route path="/class-types" element={<ClassTypes />} />
            <Route path="/admin/users" element={<AllUsers />} />
          </Route>

          {/* === КЛИЕНТСКИЙ ПОРТАЛ === */}
          <Route element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
              <Route path="/portal" element={<ClientHome />} />
              <Route path="/portal/schedule" element={<ClientSchedule />} />
              <Route path="/portal/instructors" element={<ClientInstructors />} />
              <Route path="/portal/profile" element={<ClientProfile />} />
              <Route path="/portal/pricing" element={<ClientPricing />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;