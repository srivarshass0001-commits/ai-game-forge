import { Toaster } from "@/components/ui/sonner";
/* VlyToolbar removed: file not present */
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, useLocation, Outlet } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

if (typeof document !== "undefined") {
  // Ensure the dark theme is applied globally for proper contrast
  const root = document.documentElement;
  if (!root.classList.contains("dark")) root.classList.add("dark");
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function Root() {
  return (
    <>
      <RouteSyncer />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/", element: <Landing /> },
      { path: "/auth", element: <AuthPage redirectAfterAuth="/dashboard" /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* VlyToolbar removed */}
    <InstrumentationProvider>
      {convex ? (
        <ConvexAuthProvider client={convex}>
          <RouterProvider router={router} />
          <Toaster />
        </ConvexAuthProvider>
      ) : (
        <>
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="glass border-white/20 max-w-xl w-full p-6 rounded-xl text-center space-y-4">
              <h1 className="text-2xl font-bold text-white">Convex URL not configured</h1>
              <p className="text-white/80">
                The app can't connect to the backend because VITE_CONVEX_URL is not set.
              </p>
              <ol className="text-left text-white/70 list-decimal list-inside space-y-1">
                <li>Open the Integrations tab.</li>
                <li>Add/configure Convex and copy your Convex deployment URL.</li>
                <li>Set VITE_CONVEX_URL in the API Keys tab.</li>
                <li>Reload the page.</li>
              </ol>
              <p className="text-white/60 text-sm">
                If you still see this screen, please contact support on Discord.
              </p>
            </div>
          </div>
          <Toaster />
        </>
      )}
    </InstrumentationProvider>
  </StrictMode>,
);