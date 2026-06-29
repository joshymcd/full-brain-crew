"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRightIcon, PlusIcon } from "lucide-react";

export function NavMain({
  label = "Conversations",
  items,
  onCreateChat,
  createChatDisabled,
}: {
  label?: React.ReactNode;
  onCreateChat?: () => void;
  createChatDisabled?: boolean;
  items: {
    id?: string;
    title: string;
    url: string;
    icon: React.ReactNode;
    isActive?: boolean;
    items?: {
      id?: string;
      title: string;
      url: string;
      depth?: number;
      label?: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      {onCreateChat ? (
        <SidebarGroupAction
          aria-label="Create new chat"
          disabled={createChatDisabled}
          title="Create new chat"
          type="button"
          onClick={onCreateChat}
        >
          <PlusIcon />
        </SidebarGroupAction>
      ) : null}
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.id ?? item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
              {item.items?.length ? (
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRightIcon />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.id ?? subItem.url}>
                          <SidebarMenuSubButton
                            asChild
                            className={subItem.depth ? "h-auto min-h-7 py-1 pl-6" : undefined}
                          >
                            <a href={subItem.url}>
                              <span className="flex min-w-0 flex-col gap-0.5">
                                <span>{subItem.title}</span>
                                {subItem.label ? (
                                  <span className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                                    {subItem.label}
                                  </span>
                                ) : null}
                              </span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
