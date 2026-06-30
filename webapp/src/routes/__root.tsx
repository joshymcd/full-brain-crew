import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import "@/styles.css";
import Providers from "@/providers";
import type { OpencodeRouterContext } from "@/opencode-client";

export const Route = createRootRouteWithContext<OpencodeRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}
