import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { OpencodeClient } from "@opencode-ai/sdk/v2/client";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { CalendarDaysIcon } from "lucide-react";

const data = {
  user: {
    name: "shadcn",
    avatar: "/avatars/shadcn.jpg",
  },
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  opencodeClient: OpencodeClient;
  opencodeDirectory: string | undefined;
};

function sessionTitle(session: { id: string; title?: string; slug?: string }) {
  return session.title || session.slug || session.id;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function sessionDateLabel(timestamp: number) {
  const date = new Date(timestamp);
  const today = startOfDay(new Date());
  const sessionDay = startOfDay(date);
  const oneDay = 24 * 60 * 60 * 1000;

  if (sessionDay === today) return "Today";
  if (sessionDay === today - oneDay) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function AppSidebar({ opencodeClient, opencodeDirectory, ...props }: AppSidebarProps) {
  const locationQuery = opencodeDirectory ? { directory: opencodeDirectory } : undefined;

  const sessions = useQuery({
    queryKey: ["opencode", "sessions", opencodeDirectory],
    queryFn: async () =>
      (
        await opencodeClient.session.list({
          ...locationQuery,
          scope: "project",
        })
      ).data,
    retry: false,
    refetchInterval: 5_000,
  });

  const conversations = React.useMemo(() => {
    if (sessions.isLoading) {
      return [
        {
          id: "loading",
          title: "Sessions",
          url: "#",
          icon: <CalendarDaysIcon />,
          isActive: true,
          items: [{ id: "loading", title: "Loading sessions...", url: "#" }],
        },
      ];
    }

    if (sessions.error) {
      return [
        {
          id: "error",
          title: "Sessions",
          url: "#",
          icon: <CalendarDaysIcon />,
          isActive: true,
          items: [{ id: "error", title: "Unable to load sessions", url: "#" }],
        },
      ];
    }

    if (!sessions.data?.length) {
      return [
        {
          id: "empty",
          title: "Sessions",
          url: "#",
          icon: <CalendarDaysIcon />,
          isActive: true,
          items: [{ id: "empty", title: "No sessions yet", url: "#" }],
        },
      ];
    }

    const groups = new Map<string, { id: string; title: string; url: string }[]>();

    for (const session of [...sessions.data].sort((a, b) => b.time.updated - a.time.updated)) {
      const label = sessionDateLabel(session.time.updated);
      const group = groups.get(label) ?? [];

      group.push({
        id: session.id,
        title: sessionTitle(session),
        url: `/chats/${session.id}`,
      });
      groups.set(label, group);
    }

    return Array.from(groups, ([title, items], index) => ({
      id: title,
      title,
      url: items[0]?.url ?? "#",
      icon: <CalendarDaysIcon />,
      isActive: index === 0,
      items,
    }));
  }, [sessions.data, sessions.error, sessions.isLoading]);

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarContent>
        <NavMain items={conversations} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
