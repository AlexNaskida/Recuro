import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Plans from "@/pages/Plans";
import Subscribers from "@/pages/Subscribers";
import Analytics from "@/pages/Analytics";
import Logs from "./pages/Logs";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              }
            />
            <Route
              path="/plans"
              element={
                <DashboardLayout>
                  <Plans />
                </DashboardLayout>
              }
            />
            <Route
              path="/subscribers"
              element={
                <DashboardLayout>
                  <Subscribers />
                </DashboardLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <DashboardLayout>
                  <Analytics />
                </DashboardLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/logs"
              element={
                <DashboardLayout>
                  <Logs />
                </DashboardLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
