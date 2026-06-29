import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { Event as OpenCodeEvent, Session } from "@opencode-ai/sdk/v2/client";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpencodeRouterContext } from "@/opencode-client";

type OpenCodeEventProviderProps = {
  children: React.ReactNode;
  opencode: OpencodeRouterContext;
};

function eventSessionID(event: OpenCodeEvent) {
  const properties = event.properties as { sessionID?: unknown };

  return typeof properties.sessionID === "string" ? properties.sessionID : undefined;
}

function shouldRefreshSessions(event: OpenCodeEvent) {
  return (
    event.type === "session.created" ||
    event.type === "session.updated" ||
    event.type === "session.deleted" ||
    event.type === "message.updated" ||
    event.type === "message.removed" ||
    event.type.startsWith("session.next.")
  );
}

function shouldRefreshChat(event: OpenCodeEvent) {
  return (
    event.type === "message.updated" ||
    event.type === "message.removed" ||
    event.type === "message.part.updated" ||
    event.type === "message.part.removed" ||
    event.type.startsWith("session.next.") ||
    event.type === "session.updated" ||
    event.type === "session.deleted"
  );
}

function createdSession(event: OpenCodeEvent) {
  if (event.type !== "session.created") return undefined;

  return event.properties.info as Session;
}

function chatIDFromPathname(pathname: string) {
  return pathname.match(/^\/chats\/([^/]+)/)?.[1];
}

function sessionTitle(session: Session) {
  return session.title || session.slug || session.id;
}

export function OpenCodeEventProvider({ children, opencode }: OpenCodeEventProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = React.useState("opencode");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState<string>();
  const pendingInvalidations = React.useRef(new Map<string, number>());
  const shownChildSessionToasts = React.useRef(new Set<string>());
  const currentChatID = chatIDFromPathname(location.pathname);

  React.useEffect(() => {
    return () => {
      for (const timeout of pendingInvalidations.current.values()) {
        window.clearTimeout(timeout);
      }
      pendingInvalidations.current.clear();
    };
  }, []);

  const invalidateSoon = React.useCallback(
    (queryKey: readonly unknown[]) => {
      const key = JSON.stringify(queryKey);
      if (pendingInvalidations.current.has(key)) return;

      const timeout = window.setTimeout(() => {
        pendingInvalidations.current.delete(key);
        void queryClient.invalidateQueries({ queryKey });
      }, 300);

      pendingInvalidations.current.set(key, timeout);
    },
    [queryClient],
  );

  React.useEffect(() => {
    if (!opencode.opencodeAuthenticated) return;

    const abortController = new AbortController();
    let cancelled = false;
    const locationQuery = opencode.opencodeDirectory
      ? { directory: opencode.opencodeDirectory }
      : undefined;

    async function subscribe() {
      try {
        const events = await opencode.opencodeClient.event.subscribe(locationQuery, {
          signal: abortController.signal,
        });

        for await (const event of events.stream) {
          if (cancelled) break;

          const sessionID = eventSessionID(event);
          const newSession = createdSession(event);

          if (shouldRefreshSessions(event)) {
            invalidateSoon(["opencode", "sessions", opencode.opencodeDirectory]);
          }

          if (
            currentChatID &&
            newSession?.parentID === currentChatID &&
            !shownChildSessionToasts.current.has(newSession.id)
          ) {
            shownChildSessionToasts.current.add(newSession.id);
            toast("Sub-session started", {
              description: sessionTitle(newSession),
              action: {
                label: "Open",
                onClick: () => {
                  void navigate({ to: "/chats/$chatId", params: { chatId: newSession.id } });
                },
              },
            });
          }

          if (sessionID && shouldRefreshChat(event)) {
            invalidateSoon(["opencode", "chat-log", opencode.opencodeDirectory, sessionID]);
          }

          if (sessionID && shouldRefreshSessions(event)) {
            invalidateSoon(["opencode", "session", opencode.opencodeDirectory, sessionID]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("OpenCode event stream failed", error);
        }
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [currentChatID, invalidateSoon, navigate, opencode]);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUsername = username.trim();
    if (!nextUsername || !password) {
      setAuthError("Enter your OpenCode username and password.");
      return;
    }

    setAuthError(undefined);
    opencode.setOpencodeAuth({ username: nextUsername, password });
  }

  if (!opencode.opencodeAuthenticated) {
    return (
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            <DialogHeader>
              <DialogTitle>Sign In To OpenCode</DialogTitle>
              <DialogDescription>
                OpenCode credentials are required before using this app. They are stored in this
                browser session and sent as Basic Auth with SDK requests.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="opencode-username">Username</Label>
                <Input
                  id="opencode-username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="opencode-password">Password</Label>
                <Input
                  id="opencode-password"
                  autoComplete="current-password"
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
            </div>
            <DialogFooter>
              <Button type="submit">Sign in</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
