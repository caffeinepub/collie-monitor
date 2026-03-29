import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { BTCMonitor } from "@/pages/BTCMonitor";
import { Diario } from "@/pages/Diario";
import { Estrategias } from "@/pages/Estrategias";
import { Scanner } from "@/pages/Scanner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

function RootComponent() {
  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
      <Toaster />
    </>
  );
}

const rootRoute = createRootRoute({ component: RootComponent });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: BTCMonitor,
});

const scannerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scanner",
  component: Scanner,
});

const estrategiasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/estrategias",
  component: Estrategias,
});

const diarioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diario",
  component: Diario,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scannerRoute,
  estrategiasRoute,
  diarioRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
