import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";  

import { TooltipProvider } from "@/components/ui/tooltip"; 
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

import  "@/styles.css";
import Providers from "@/providers";
import type { OpencodeRouterContext } from "@/opencode-client";

export const Route = createRootRouteWithContext<OpencodeRouterContext>()({
  component: RootComponent,
});

function RootComponent() {  

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
