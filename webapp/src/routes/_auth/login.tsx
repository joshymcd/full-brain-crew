import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" &&
      search.redirect.startsWith("/") &&
      !search.redirect.startsWith("//")
        ? search.redirect
        : "/",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { opencodeServerUrl, setOpencodeAuth } = Route.useRouteContext();
  const [username, setUsername] = React.useState("opencode");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUsername = username.trim();
    if (!nextUsername || !password) {
      setError("Enter your OpenCode username and password.");
      return;
    }

    setError(undefined);
    setOpencodeAuth({ username: nextUsername, password });
    window.location.assign(redirect);
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <form
        className="flex w-full max-w-sm flex-col gap-6 border bg-card p-6"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to OpenCode</h1>
          <p className="text-sm text-muted-foreground">
            Credentials are stored in this browser session and sent as Basic Auth to{" "}
            {opencodeServerUrl}.
          </p>
        </div>
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <Button type="submit">Sign in</Button>
      </form>
    </main>
  );
}
