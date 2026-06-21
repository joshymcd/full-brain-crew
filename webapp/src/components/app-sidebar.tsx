import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { CalendarDays } from "lucide-react"

const data = {
  user: {
    name: "shadcn",
    avatar: "/avatars/shadcn.jpg",
  },
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  )

  const conversations = [
    {
      title: today,
      url: "#",
      icon: <CalendarDays />,
      isActive: true,
      items: [
        { title: "Dummy Link 1", url: "#" },
        { title: "Dummy Link 2", url: "#" },
      ],
    },
  ]

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarContent>
        <NavMain items={conversations} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
