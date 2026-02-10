import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SupabaseAuthProvider, useSupabaseAuthContext } from "@/contexts/SupabaseAuthContext";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// Lazy-load pages — each gets its own JS chunk
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const InterviewerDashboard = lazy(() => import("./pages/InterviewerDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,       // 5 min fresh — reduces refetches
      gcTime: 30 * 60_000,         // 30 min garbage collection
      refetchOnWindowFocus: false,  // no background refetch on tab switch
      retry: 2,
    },
  },
});

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ 
  children, 
  allowedRole 
}: { 
  children: React.ReactNode; 
  allowedRole: 'entrevistador' | 'admin';
}) {
  const { isAuthenticated, role, isLoading } = useSupabaseAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== allowedRole) {
    // Redirect to appropriate dashboard based on role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'entrevistador') {
      return <Navigate to="/entrevistador" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Auth Route - redirects if already logged in
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useSupabaseAuthContext();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/entrevistador" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route 
        path="/auth" 
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        } 
      />
      <Route 
        path="/entrevistador" 
        element={
          <ProtectedRoute allowedRole="entrevistador">
            <InterviewerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SupabaseAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </SupabaseAuthProvider>
  </QueryClientProvider>
);

export default App;
