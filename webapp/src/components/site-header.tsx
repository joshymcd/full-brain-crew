import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeftIcon } from "lucide-react";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="z-50 flex h-(--header-height) w-full shrink-0 items-center border-b bg-oklch(1 0 0) dark:bg-oklch(0.147 0.004 49.3)">
      <div className="flex w-full items-center gap-2 px-4">
        <Button className="h-8 w-8" variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeftIcon />
        </Button>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
      </div>
    </header>
  );
}
