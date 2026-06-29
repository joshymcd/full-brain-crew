import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = Route.useNavigate();
  const { opencodeClient, opencodeDirectory } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const locationQuery = opencodeDirectory ? { directory: opencodeDirectory } : undefined;
  const sessionsQueryKey = ["opencode", "sessions", opencodeDirectory] as const;
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

  return (
    <div className="flex min-h-[calc(100svh-var(--header-height))] items-center justify-center p-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Start a conversation</h1>
          <p className="text-sm text-muted-foreground">
            Create a new OpenCode session and jump straight into chat.
          </p>
        </div>
        <Button
          className="min-w-44"
          disabled={createSession.isPending}
          size="lg"
          type="button"
          onClick={() => createSession.mutate()}
        >
          <MessageSquarePlusIcon />
          {createSession.isPending ? "Creating..." : "New chat"}
        </Button>
        {createSession.error ? (
          <p className="text-sm text-destructive">
            {createSession.error instanceof Error
              ? createSession.error.message
              : "Unable to create a new chat."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
