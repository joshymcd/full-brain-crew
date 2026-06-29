import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/temp/settings")({ component: TempSettings });

function formatTime(value?: number) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusTone(status?: string) {
  if (!status) return "text-muted-foreground";
  if (["connected", "healthy", "enabled"].includes(status)) return "text-green-500";
  if (["error", "failed"].includes(status)) return "text-red-500";
  return "text-yellow-600";
}

function debugTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(Date.now());
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  return JSON.stringify(error);
}

function TempSettings() {
  const {
    opencodeClient,
    opencodeServerUrl,
    opencodeAuthenticated,
    setOpencodeAuth,
    clearOpencodeAuth,
  } = Route.useRouteContext();
  const [username, setUsername] = React.useState("opencode");
  const [password, setPassword] = React.useState("");
  const [debugEvents, setDebugEvents] = React.useState<string[]>([
    `${debugTime()} Settings page mounted`,
  ]);

  const logDebug = React.useCallback((message: string, data?: unknown) => {
    const line = `${debugTime()} ${message}`;
    setDebugEvents((events) => [line, ...events].slice(0, 30));
    console.info(`[opencode settings] ${message}`, data ?? "");
  }, []);

  const queryOptions = {
    refetchInterval: 5_000,
    retry: false,
  };

  const health = useQuery({
    queryKey: ["opencode", "health"],
    queryFn: async () => (await opencodeClient.global.health()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const path = useQuery({
    queryKey: ["opencode", "path"],
    queryFn: async () => (await opencodeClient.path.get()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const project = useQuery({
    queryKey: ["opencode", "project"],
    queryFn: async () => (await opencodeClient.project.current()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const sessions = useQuery({
    queryKey: ["opencode", "sessions"],
    queryFn: async () => (await opencodeClient.session.list()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const providers = useQuery({
    queryKey: ["opencode", "providers"],
    queryFn: async () => (await opencodeClient.config.providers()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const agents = useQuery({
    queryKey: ["opencode", "agents"],
    queryFn: async () => (await opencodeClient.app.agents()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const commands = useQuery({
    queryKey: ["opencode", "commands"],
    queryFn: async () => (await opencodeClient.command.list()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const tools = useQuery({
    queryKey: ["opencode", "tools"],
    queryFn: async () => (await opencodeClient.tool.ids()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const lsp = useQuery({
    queryKey: ["opencode", "lsp"],
    queryFn: async () => (await opencodeClient.lsp.status()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const formatters = useQuery({
    queryKey: ["opencode", "formatters"],
    queryFn: async () => (await opencodeClient.formatter.status()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const mcp = useQuery({
    queryKey: ["opencode", "mcp"],
    queryFn: async () => (await opencodeClient.mcp.status()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const vcs = useQuery({
    queryKey: ["opencode", "vcs"],
    queryFn: async () => (await opencodeClient.vcs.get()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const fileStatus = useQuery({
    queryKey: ["opencode", "file-status"],
    queryFn: async () => (await opencodeClient.file.status()).data,
    enabled: opencodeAuthenticated,
    ...queryOptions,
  });

  const connected = health.data?.healthy === true;
  const changedFiles = fileStatus.data ?? [];
  const mcpEntries = Object.entries(mcp.data ?? {});

  React.useEffect(() => {
    if (!opencodeAuthenticated) return;

    logDebug("OpenCode auth credentials are stored; SDK client was rebuilt", {
      opencodeServerUrl,
    });
  }, [logDebug, opencodeAuthenticated, opencodeServerUrl]);

  React.useEffect(() => {
    if (!health.data) return;

    logDebug("Health check succeeded", health.data);
  }, [health.data, logDebug]);

  React.useEffect(() => {
    if (!health.error) return;

    logDebug("Health check failed", health.error);
  }, [health.error, logDebug]);

  function handleConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextUsername = username.trim();
    if (!nextUsername) {
      logDebug("Connect blocked: username is required");
      return;
    }

    if (!password) {
      logDebug("Connect blocked: password is required");
      return;
    }

    logDebug("Connect clicked; storing credentials and enabling OpenCode queries", {
      username: nextUsername,
      opencodeServerUrl,
    });
    setOpencodeAuth({ username: nextUsername, password });
  }

  function handleClearCredentials() {
    logDebug("Clearing OpenCode credentials");
    clearOpencodeAuth();
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">OpenCode Server</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-block size-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>
            {connected ? "Connected" : opencodeAuthenticated ? "Disconnected" : "Sign in required"}
          </span>
          <span>{opencodeServerUrl}</span>
          {health.data?.version && <span>v{health.data.version}</span>}
          {opencodeAuthenticated && (
            <button
              className="ml-auto rounded-md border px-3 py-1 text-xs text-foreground"
              type="button"
              onClick={handleClearCredentials}
            >
              Clear credentials
            </button>
          )}
        </div>
      </div>

      {!opencodeAuthenticated && (
        <form className="max-w-md space-y-4 rounded-lg border p-4" onSubmit={handleConnect}>
          <div>
            <h2 className="font-semibold">Sign in to OpenCode</h2>
            <p className="text-sm text-muted-foreground">
              Credentials are stored in this browser session and sent as Basic Auth with SDK
              requests.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Username</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-foreground"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Password</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-foreground"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="rounded-md border px-4 py-2 text-sm font-medium" type="submit">
            Connect
          </button>
        </form>
      )}

      <Panel title="Debug Log" loading={false} error={undefined}>
        <KeyValue label="Authenticated" value={opencodeAuthenticated ? "yes" : "no"} />
        <KeyValue label="Health Status" value={health.fetchStatus} />
        <KeyValue
          label="Health Error"
          value={health.error ? errorMessage(health.error) : undefined}
        />
        <div className="mt-3 max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
          {debugEvents.map((event, index) => (
            <div key={`${event}-${index}`}>{event}</div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sessions"
          value={sessions.data?.length ?? 0}
          loading={sessions.isLoading}
          error={sessions.error}
        />
        <MetricCard
          label="Agents"
          value={agents.data?.length ?? 0}
          loading={agents.isLoading}
          error={agents.error}
        />
        <MetricCard
          label="Tools"
          value={tools.data?.length ?? 0}
          loading={tools.isLoading}
          error={tools.error}
        />
        <MetricCard
          label="Changed Files"
          value={changedFiles.length}
          loading={fileStatus.isLoading}
          error={fileStatus.error}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel
          title="Project"
          loading={project.isLoading || path.isLoading}
          error={project.error ?? path.error}
        >
          <KeyValue label="Name" value={project.data?.name ?? project.data?.id} />
          <KeyValue label="Worktree" value={project.data?.worktree ?? path.data?.worktree} />
          <KeyValue label="Directory" value={path.data?.directory} />
          <KeyValue label="Config" value={path.data?.config} />
          <KeyValue label="Created" value={formatTime(project.data?.time.created)} />
        </Panel>

        <Panel
          title="Version Control"
          loading={vcs.isLoading || fileStatus.isLoading}
          error={vcs.error ?? fileStatus.error}
        >
          <KeyValue label="Branch" value={vcs.data?.branch} />
          <KeyValue label="Default Branch" value={vcs.data?.default_branch} />
          <KeyValue
            label="Added"
            value={changedFiles.filter((file) => file.status === "added").length}
          />
          <KeyValue
            label="Modified"
            value={changedFiles.filter((file) => file.status === "modified").length}
          />
          <KeyValue
            label="Deleted"
            value={changedFiles.filter((file) => file.status === "deleted").length}
          />
        </Panel>

        <Panel title="Providers" loading={providers.isLoading} error={providers.error}>
          <KeyValue label="Configured" value={providers.data?.providers.length ?? 0} />
          <KeyValue label="Defaults" value={Object.keys(providers.data?.default ?? {}).length} />
          <List
            items={(providers.data?.providers ?? [])
              .slice(0, 6)
              .map((provider) => provider.name ?? provider.id)}
          />
        </Panel>

        <Panel title="MCP Servers" loading={mcp.isLoading} error={mcp.error}>
          {mcpEntries.length ? (
            <div className="space-y-2">
              {mcpEntries.map(([name, server]) => (
                <div key={name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{name}</span>
                  <span className={`shrink-0 ${statusTone(server.status)}`}>{server.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="LSP Servers" loading={lsp.isLoading} error={lsp.error}>
          {lsp.data?.length ? (
            <div className="space-y-2">
              {lsp.data.map((server) => (
                <div key={server.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{server.name}</span>
                  <span className={`shrink-0 ${statusTone(server.status)}`}>{server.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Formatters" loading={formatters.isLoading} error={formatters.error}>
          {formatters.data?.length ? (
            <div className="space-y-2">
              {formatters.data.map((formatter) => (
                <div
                  key={formatter.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate">{formatter.name}</span>
                  <span
                    className={`shrink-0 ${statusTone(formatter.enabled ? "enabled" : "disabled")}`}
                  >
                    {formatter.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Agents" loading={agents.isLoading} error={agents.error}>
          <List
            className="max-h-64 overflow-y-auto pr-2"
            items={(agents.data ?? []).map((agent) => `${agent.name} (${agent.mode})`)}
          />
        </Panel>

        <Panel title="Commands" loading={commands.isLoading} error={commands.error}>
          <List
            className="max-h-64 overflow-y-auto pr-2"
            items={(commands.data ?? []).map((command) => command.name)}
          />
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  loading,
  error,
}: {
  label: string;
  value: ReactNode;
  loading: boolean;
  error: unknown;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{loading ? "..." : error ? "-" : value}</p>
    </div>
  );
}

function Panel({
  title,
  loading,
  error,
  children,
}: {
  title: string;
  loading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500">Unavailable</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate">{value ?? "-"}</span>
    </div>
  );
}

function List({ items, className }: { items: ReactNode[]; className?: string }) {
  if (!items.length) return <Empty />;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {items.map((item, index) => (
        <div key={index} className="truncate text-sm">
          {item}
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">None</p>;
}
