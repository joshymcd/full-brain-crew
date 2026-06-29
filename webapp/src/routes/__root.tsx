import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { OpenCodeEventProvider } from "@/providers";

import "@/styles.css";
import Providers from "@/providers";
import type { OpencodeRouterContext } from "@/opencode-client";

export const Route = createRootRouteWithContext<OpencodeRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const opencode = Route.useRouteContext();
  const { opencodeClient, opencodeDirectory } = opencode;

  return (
    <>
      <Providers>
        <OpenCodeEventProvider opencode={opencode}>
          <TooltipProvider>
            <SidebarProvider className="flex flex-col h-full">
              <SiteHeader />
              <div className="flex flex-1  ">
                <AppSidebar opencodeClient={opencodeClient} opencodeDirectory={opencodeDirectory} />
                <div className="container mx-auto">
                  <SidebarInset>
                    <Outlet />
                  </SidebarInset>
                </div>
              </div>
            </SidebarProvider>
          </TooltipProvider>
        </OpenCodeEventProvider>
      </Providers>
    </>
  );
}
