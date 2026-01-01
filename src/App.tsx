import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, ErrorBoundary } from "@/components/common";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Capture from "./pages/Capture";
import Pool from "./pages/Pool";
import Knowledge from "./pages/Knowledge";
import KnowledgeItemDetail from "./pages/KnowledgeItemDetail";
import Newsletter from "./pages/Newsletter";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Login />} />
              
              {/* Protected routes - All users */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge"
                element={
                  <ProtectedRoute>
                    <Knowledge />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge/:id"
                element={
                  <ProtectedRoute>
                    <KnowledgeItemDetail />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected routes - Contributor+ */}
              <Route
                path="/capture"
                element={
                  <ProtectedRoute requiredRole="contributor">
                    <Capture />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pool"
                element={
                  <ProtectedRoute requiredRole="contributor">
                    <Pool />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/newsletter"
                element={
                  <ProtectedRoute requiredRole="contributor">
                    <Newsletter />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected routes - Admin only */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
