import { RouterProvider, createRouter, createRoute, createRootRoute, Outlet } from "@tanstack/react-router";
import { useInitializeApp } from "@/hooks/useInitializeApp";
import { Layout } from "@/components/Layout";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MarketsOverview } from "@/pages/MarketsOverview";
import { CategoriesDashboard } from "@/pages/CategoriesDashboard";
import { CategoryDetail } from "@/pages/CategoryDetail";
import { AssetDetail } from "@/pages/AssetDetail";
import { StrategyModules } from "@/pages/StrategyModules";
import { TradeHistory } from "@/pages/TradeHistory";
import { Toaster } from "@/components/ui/sonner";

function RootComponent() {
  useInitializeApp();
  
  return (
    <>
      <InstallPrompt />
      <Layout>
        <Outlet />
      </Layout>
      <Toaster />
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: MarketsOverview,
});

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/categories",
  component: CategoriesDashboard,
});

const categoryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/category/$categoryName",
  component: CategoryDetail,
});

const assetDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/asset/$symbol",
  component: AssetDetail,
});

const strategiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/strategies",
  component: StrategyModules,
});

const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/history",
  component: TradeHistory,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  categoriesRoute,
  categoryDetailRoute,
  assetDetailRoute,
  strategiesRoute,
  historyRoute,
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
