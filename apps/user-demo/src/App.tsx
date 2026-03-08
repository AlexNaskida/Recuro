import { Routes, Route, Navigate } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { ExplorePage } from "@/pages/ExplorePage";
import { MySubscriptionsPage } from "@/pages/MySubscriptionsPage";

export default function App() {
  return (
    <div className="min-h-screen bg-surface-1">
      <Topbar />
      <Routes>
        <Route index             element={<ExplorePage          />} />
        <Route path="subscriptions" element={<MySubscriptionsPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
