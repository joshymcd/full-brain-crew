import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { OpencodeClient, Session } from "@opencode-ai/sdk/v2/client";

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

type ConversationItem = {
  id: string;
  title: string;
  url: string;
  depth?: number;
  label?: string;
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

function appendSessionWithChildren({
  childrenByParent,
  items,
  session,
  visited,
}: {
  childrenByParent: Map<string, Session[]>;
  items: ConversationItem[];
  session: Session;
  visited: Set<string>;
}) {
  if (visited.has(session.id)) return;

  visited.add(session.id);
  items.push({
    id: session.id,
    title: sessionTitle(session),
    url: `/chats/${session.id}`,
    depth: session.parentID ? 1 : undefined,
    label: session.parentID ? `Sub-session · #${session.slug}` : undefined,
  });

  for (const child of childrenByParent.get(session.id) ?? []) {
    appendSessionWithChildren({ childrenByParent, items, session: child, visited });
  }
}

export function AppSidebar({ opencodeClient, opencodeDirectory, ...props }: AppSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locationQuery = opencodeDirectory ? { directory: opencodeDirectory } : undefined;
  const sessionsQueryKey = ["opencode", "sessions", opencodeDirectory] as const;

  const sessions = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () =>
      (
        await opencodeClient.session.list({
          ...locationQuery,
          scope: "project",
        })
      ).data,
    retry: false,
  });
  const createSession = useMutation({
    mutationFn: async () => {
      const session = (await opencodeClient.session.create({ ...locationQuery })).data;
      if (!session) throw new Error("OpenCode did not return a new session.");

      return session;
    },
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
      await navigate({ to: "/chats/$chatId", params: { chatId: session.id } });
    },
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

    const sortedSessions = [...sessions.data].sort((a, b) => b.time.updated - a.time.updated);
    const sessionIDs = new Set(sortedSessions.map((session) => session.id));
    const childrenByParent = new Map<string, Session[]>();
    const rootSessions: Session[] = [];

    for (const session of sortedSessions) {
      if (session.parentID && sessionIDs.has(session.parentID)) {
        const children = childrenByParent.get(session.parentID) ?? [];
        children.push(session);
        childrenByParent.set(session.parentID, children);
      } else {
        rootSessions.push(session);
      }
    }

    const groups = new Map<string, ConversationItem[]>();
    const visited = new Set<string>();

    for (const session of rootSessions) {
      const label = sessionDateLabel(session.time.updated);
      const group = groups.get(label) ?? [];

      appendSessionWithChildren({ childrenByParent, items: group, session, visited });
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
        <NavMain
          items={conversations}
          createChatDisabled={createSession.isPending}
          onCreateChat={() => createSession.mutate()}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
