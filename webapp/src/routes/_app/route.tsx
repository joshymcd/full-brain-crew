import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OpenCodeEventProvider } from "@/providers";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.opencodeAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const opencode = Route.useRouteContext();
  const { opencodeClient, opencodeDirectory } = opencode;

  return (
    <OpenCodeEventProvider opencode={opencode}>
      <TooltipProvider>
        <SidebarProvider className="flex h-full flex-col">
          <SiteHeader />
          <div className="flex flex-1">
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
  );
}
