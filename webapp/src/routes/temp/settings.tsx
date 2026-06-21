import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

function TempSettings() {
  const { opencodeClient } = Route.useRouteContext();

  const queryOptions = {
    refetchInterval: 5_000,
    retry: false,
  };

  const health = useQuery({
    queryKey: ["opencode", "health"],
    queryFn: async () => (await opencodeClient.global.health()).data,
    ...queryOptions,
  });

  const path = useQuery({
    queryKey: ["opencode", "path"],
    queryFn: async () => (await opencodeClient.path.get()).data,
    ...queryOptions,
  });

  const project = useQuery({
    queryKey: ["opencode", "project"],
    queryFn: async () => (await opencodeClient.project.current()).data,
    ...queryOptions,
  });

  const sessions = useQuery({
    queryKey: ["opencode", "sessions"],
    queryFn: async () => (await opencodeClient.session.list()).data,
    ...queryOptions,
  });

  const providers = useQuery({
    queryKey: ["opencode", "providers"],
    queryFn: async () => (await opencodeClient.config.providers()).data,
    ...queryOptions,
  });

  const agents = useQuery({
    queryKey: ["opencode", "agents"],
    queryFn: async () => (await opencodeClient.app.agents()).data,
    ...queryOptions,
  });

  const commands = useQuery({
    queryKey: ["opencode", "commands"],
    queryFn: async () => (await opencodeClient.command.list()).data,
    ...queryOptions,
  });

  const tools = useQuery({
    queryKey: ["opencode", "tools"],
    queryFn: async () => (await opencodeClient.tool.ids()).data,
    ...queryOptions,
  });

  const lsp = useQuery({
    queryKey: ["opencode", "lsp"],
    queryFn: async () => (await opencodeClient.lsp.status()).data,
    ...queryOptions,
  });

  const formatters = useQuery({
    queryKey: ["opencode", "formatters"],
    queryFn: async () => (await opencodeClient.formatter.status()).data,
    ...queryOptions,
  });

  const mcp = useQuery({
    queryKey: ["opencode", "mcp"],
    queryFn: async () => (await opencodeClient.mcp.status()).data,
    ...queryOptions,
  });

  const vcs = useQuery({
    queryKey: ["opencode", "vcs"],
    queryFn: async () => (await opencodeClient.vcs.get()).data,
    ...queryOptions,
  });

  const fileStatus = useQuery({
    queryKey: ["opencode", "file-status"],
    queryFn: async () => (await opencodeClient.file.status()).data,
    ...queryOptions,
  });

  const connected = health.data?.healthy === true;
  const changedFiles = fileStatus.data ?? [];
  const mcpEntries = Object.entries(mcp.data ?? {});

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">OpenCode Server</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={`inline-block size-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span>{connected ? "Connected" : "Disconnected"}</span>
          <span>OpenCode context client</span>
          {health.data?.version && <span>v{health.data.version}</span>}
        </div>
      </div>

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
