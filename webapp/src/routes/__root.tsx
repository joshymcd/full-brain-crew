import { useState } from "react";

import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip"; 
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

import  "@/styles.css";
import Providers from "@/providers";

export const Route = createRootRoute({ 
  component: RootComponent,
});

function RootComponent() { 
  const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <Providers>
        <TooltipProvider>
          <SidebarProvider className="flex flex-col h-full">
            <SiteHeader />
            <div className="flex flex-1  ">
              <AppSidebar />
              <div className="container mx-auto bg-green-500">
                <SidebarInset><Outlet /></SidebarInset>
              </div>
            </div>
             
          </SidebarProvider>
        </TooltipProvider>
      </Providers>
    </>
  );
} 