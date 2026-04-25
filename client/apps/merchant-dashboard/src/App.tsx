import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import DashboardLayout from "@/components/DashboardLayout";
import WalletGate from "@/components/WalletGate";
import Dashboard from "@/pages/Dashboard";
import Plans from "@/pages/Plans";
import Subscribers from "@/pages/Subscribers";
import Analytics from "@/pages/Analytics";
import Logs from "./pages/Logs";
import SettingsPage from "@/pages/Settings";
import { MerchantProgramProvider } from "@/context/MerchantProgramContext";
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <MerchantProgramProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route
                path="/dashboard"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <Dashboard />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route
                path="/plans"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <Plans />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route
                path="/subscribers"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <Subscribers />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route
                path="/analytics"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <Analytics />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route
                path="/settings"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <SettingsPage />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route
                path="/logs"
                element={
                  <WalletGate>
                    <DashboardLayout>
                      <Logs />
                    </DashboardLayout>
                  </WalletGate>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </MerchantProgramProvider>
  </ThemeProvider>
);

export default App;
