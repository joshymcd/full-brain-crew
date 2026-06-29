import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import type {
  AssistantMessage,
  FilePart,
  Message as OpenCodeMessage,
  Model,
  Part,
  PatchPart,
  Provider,
  Session,
  ToolPart,
} from "@opencode-ai/sdk/v2/client";
import {
  ArchiveIcon,
  BotIcon,
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  FileCodeIcon,
  FileTextIcon,
  GitPullRequestIcon,
  ListTodoIcon,
  MinimizeIcon,
  RefreshCwIcon,
  SendIcon,
  TerminalIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent, MessageHeader } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

export const Route = createFileRoute("/chats/$chatId")({
  component: ChatPage,
});

type MessageRow = {
  id: string;
  type: "message";
  role: "assistant" | "user";
  sender: string;
  time: string;
  content: string[];
  parts?: PartDisplay[];
  markers?: MarkerRow[];
  error?: string;
};

type PartDisplay = {
  id: string;
  type: Exclude<Part["type"], "text" | "step-start" | "step-finish">;
  label: string;
  description: string;
  detail: React.ReactNode;
  icon: LucideIcon;
  tone: "brain" | "tool" | "file" | "patch" | "subtask" | "muted" | "error";
};

type MarkerRow = {
  id: string;
  type: "marker";
  variant?: "default" | "border" | "separator";
  content: string;
  icon?: LucideIcon;
  status?: boolean;
};

type ChatRow = MessageRow | MarkerRow;

type ChatLogEntry = {
  info: OpenCodeMessage;
  parts: Part[];
};

type SelectedModel = {
  providerID: string;
  modelID: string;
};

type ModelOption = {
  id: string;
  providerID: string;
  providerName: string;
  model: Model;
};

function ChatPage() {
  const { chatId } = Route.useParams();
  const { opencodeClient, opencodeDirectory } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = React.useState("");
  const [selectedModel, setSelectedModel] = React.useState<SelectedModel>();
  const locationQuery = opencodeDirectory ? { directory: opencodeDirectory } : undefined;
  const sessionQueryKey = ["opencode", "session", opencodeDirectory, chatId] as const;
  const chatLogQueryKey = ["opencode", "chat-log", opencodeDirectory, chatId] as const;
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: async () =>
      (
        await opencodeClient.session.get({
          ...locationQuery,
          sessionID: chatId,
        })
      ).data,
    retry: false,
  });
  const providersQuery = useQuery({
    queryKey: ["opencode", "providers", opencodeDirectory],
    queryFn: async () => (await opencodeClient.provider.list({ ...locationQuery })).data,
    retry: false,
  });
  const chatLogQuery = useQuery({
    queryKey: chatLogQueryKey,
    queryFn: async () =>
      (
        await opencodeClient.session.messages({
          ...locationQuery,
          sessionID: chatId,
        })
      ).data,
    retry: false,
  });
  const sendMessage = useMutation({
    mutationFn: async (text: string) =>
      (
        await opencodeClient.session.prompt({
          ...locationQuery,
          sessionID: chatId,
          ...(selectedModel ? { model: selectedModel } : {}),
          parts: [{ type: "text", text }],
        })
      ).data,
    onSuccess: async () => {
      setMessageText("");
      await queryClient.invalidateQueries({ queryKey: chatLogQueryKey });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
  const modelOptions = React.useMemo(
    () => mapModelOptions(providersQuery.data),
    [providersQuery.data],
  );
  const currentModel = selectedModel ?? modelFromSession(sessionQuery.data);
  const currentModelOption = currentModel ? findModelOption(modelOptions, currentModel) : undefined;
  const currentModelLabel =
    currentModelOption?.model.name ?? currentModel?.modelID ?? "Select model";
  const chatRows = mapOpenCodeChatLog(chatLogQuery.data ?? []);
  const canSend = messageText.trim().length > 0 && !sendMessage.isPending;

  React.useEffect(() => {
    if (selectedModel || !sessionQuery.data?.model) return;

    setSelectedModel(modelFromSession(sessionQuery.data));
  }, [selectedModel, sessionQuery.data]);

  function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = messageText.trim();
    if (!text) return;

    sendMessage.mutate(text);
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-card px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {sessionQuery.data?.slug ? `#${sessionQuery.data.slug}` : "#loading-session"}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {sessionQuery.data ? sessionTitle(sessionQuery.data) : "Loading conversation"}
          </h1>
        </div>
        <ModelPicker
          currentModel={currentModel}
          currentModelLabel={currentModelLabel}
          disabled={providersQuery.isLoading || sendMessage.isPending}
          error={providersQuery.error}
          modelOptions={modelOptions}
          onSelectModel={setSelectedModel}
        />
      </header>

      <MessageScrollerProvider
        autoScroll
        defaultScrollPosition="last-anchor"
        scrollPreviousItemPeek={72}
      >
        <MessageScroller className="flex-1 bg-background">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-4xl gap-3 px-4 py-6 sm:px-6 lg:px-8">
              {chatLogQuery.isLoading ? (
                <MessageScrollerItem messageId="loading-chat-log">
                  <ChatMarker
                    row={{
                      id: "loading-chat-log",
                      type: "marker",
                      content: "Loading OpenCode chat log...",
                      icon: WrenchIcon,
                      status: true,
                    }}
                  />
                </MessageScrollerItem>
              ) : chatLogQuery.error ? (
                <MessageScrollerItem messageId="chat-log-error">
                  <ChatMessage
                    row={{
                      id: "chat-log-error",
                      type: "message",
                      role: "assistant",
                      sender: "OpenCode UI",
                      time: "",
                      content: [getErrorMessage(chatLogQuery.error)],
                      error: "Failed to load OpenCode session messages.",
                    }}
                  />
                </MessageScrollerItem>
              ) : chatRows.length ? (
                chatRows.map((row, index) => (
                  <MessageScrollerItem
                    key={row.id}
                    messageId={row.id}
                    scrollAnchor={row.type === "message" && row.role === "user"}
                  >
                    {row.type === "marker" ? (
                      <ChatMarker row={row} />
                    ) : (
                      <ChatMessage
                        row={row}
                        showHeader={shouldShowMessageHeader(chatRows, index)}
                      />
                    )}
                  </MessageScrollerItem>
                ))
              ) : (
                <MessageScrollerItem messageId="empty-chat-log">
                  <ChatMarker
                    row={{
                      id: "empty-chat-log",
                      type: "marker",
                      variant: "separator",
                      content: "No messages in this session yet",
                    }}
                  />
                </MessageScrollerItem>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <footer className="shrink-0 border-t bg-card px-4 py-4 sm:px-6">
        <form
          className="mx-auto flex w-full max-w-4xl items-center gap-2"
          onSubmit={handleSendMessage}
        >
          <Input
            aria-label="Message composer"
            disabled={sendMessage.isPending}
            placeholder="Message OpenCode"
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
          />
          <Button disabled={!canSend} type="submit" aria-label="Send message">
            {sendMessage.isPending ? "Sending" : "Send"}
            <SendIcon data-icon="inline-end" />
          </Button>
        </form>
        {sendMessage.error ? (
          <p className="mx-auto mt-2 max-w-4xl text-sm text-destructive">
            {getErrorMessage(sendMessage.error)}
          </p>
        ) : null}
      </footer>
    </div>
  );
}

function sessionTitle(session: Session) {
  return session.title || session.slug || session.id;
}

function modelFromSession(session?: Session): SelectedModel | undefined {
  if (!session?.model) return undefined;

  return {
    providerID: session.model.providerID,
    modelID: session.model.id,
  };
}

function modelValue(model: SelectedModel) {
  return `${model.providerID}:${model.modelID}`;
}

function findModelOption(options: ModelOption[], model: SelectedModel) {
  return options.find(
    (option) => option.providerID === model.providerID && option.model.id === model.modelID,
  );
}

function mapModelOptions(data?: { all: Provider[]; connected: string[] }) {
  if (!data) return [];

  const connected = new Set(data.connected);
  const providers = data.connected.length
    ? data.all.filter((provider) => connected.has(provider.id))
    : data.all;

  return providers.flatMap((provider) =>
    Object.values(provider.models)
      .filter((model) => model.status !== "deprecated")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((model) => ({
        id: modelValue({ providerID: provider.id, modelID: model.id }),
        providerID: provider.id,
        providerName: provider.name,
        model,
      })),
  );
}

function groupModelOptions(options: ModelOption[]) {
  const groups = new Map<string, ModelOption[]>();

  for (const option of options) {
    const group = groups.get(option.providerName) ?? [];
    group.push(option);
    groups.set(option.providerName, group);
  }

  return Array.from(groups, ([providerName, models]) => ({ providerName, models })).sort((a, b) =>
    a.providerName.localeCompare(b.providerName),
  );
}

function ModelPicker({
  currentModel,
  currentModelLabel,
  disabled,
  error,
  modelOptions,
  onSelectModel,
}: {
  currentModel: SelectedModel | undefined;
  currentModelLabel: string;
  disabled: boolean;
  error: unknown;
  modelOptions: ModelOption[];
  onSelectModel: (model: SelectedModel) => void;
}) {
  const groups = groupModelOptions(modelOptions);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="max-w-72 justify-between" disabled={disabled} variant="outline">
          <span className="truncate">{error ? "Models unavailable" : currentModelLabel}</span>
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {groups.length ? (
          groups.map((group) => (
            <DropdownMenuSub key={group.providerName}>
              <DropdownMenuSubTrigger>{group.providerName}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-96 w-80 overflow-y-auto">
                {group.models.map((option) => {
                  const selected = currentModel && option.id === modelValue(currentModel);

                  return (
                    <DropdownMenuItem
                      key={option.id}
                      className="justify-between"
                      onSelect={() =>
                        onSelectModel({
                          providerID: option.providerID,
                          modelID: option.model.id,
                        })
                      }
                    >
                      <span className="truncate">{option.model.name}</span>
                      {selected ? <CheckIcon /> : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))
        ) : (
          <DropdownMenuItem disabled>No models available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatMarker({ row }: { row: MarkerRow }) {
  const Icon = row.icon;

  return (
    <Marker role={row.status ? "status" : undefined} variant={row.variant}>
      {Icon ? (
        <MarkerIcon>
          <Icon />
        </MarkerIcon>
      ) : null}
      <MarkerContent>{row.content}</MarkerContent>
    </Marker>
  );
}

function shouldShowMessageHeader(rows: ChatRow[], index: number) {
  const row = rows[index];

  if (!row || row.type !== "message") return false;

  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previous = rows[previousIndex];

    if (!previous) continue;
    if (previous.type === "marker") return true;

    return previous.role !== row.role;
  }

  return true;
}

function ChatMessage({ row, showHeader = true }: { row: MessageRow; showHeader?: boolean }) {
  const align = row.role === "user" ? "end" : "start";
  const bubbleVariant = row.error ? "destructive" : row.role === "user" ? "default" : "secondary";

  return (
    <Message align={align} className="gap-0">
      <MessageContent className="gap-1.5">
        {showHeader ? (
          <MessageHeader>{row.time ? `${row.sender} · ${row.time}` : row.sender}</MessageHeader>
        ) : null}
        {row.markers?.map((marker) => (
          <ChatMarker key={marker.id} row={marker} />
        ))}
        {row.error ? (
          <Bubble align={align} className="max-w-[78%]" variant="destructive">
            <BubbleContent>{row.error}</BubbleContent>
          </Bubble>
        ) : null}
        {row.content.length ? (
          <Bubble align={align} className="max-w-[78%]" variant={bubbleVariant}>
            <BubbleContent className="flex flex-col gap-2 border-border bg-card shadow-sm group-data-[align=end]/bubble:bg-primary group-data-[align=end]/bubble:text-primary-foreground">
              <div className="flex flex-col gap-2">
                {row.content.map((paragraph, index) => (
                  <p key={`${row.id}-text-${index}`}>{paragraph}</p>
                ))}
              </div>
            </BubbleContent>
          </Bubble>
        ) : null}
        {row.parts?.length ? <PartStrip align={align} parts={row.parts} /> : null}
      </MessageContent>
    </Message>
  );
}

function PartStrip({ align, parts }: { align: "start" | "end"; parts: PartDisplay[] }) {
  const [selectedId, setSelectedId] = React.useState<string | undefined>();
  const selected = parts.find((part) => part.id === selectedId);

  return (
    <Collapsible open={Boolean(selected)}>
      <div className={`flex gap-1.5 ${align === "end" ? "justify-end" : "justify-start"}`}>
        {parts.map((part) => {
          const Icon = part.icon;
          const selectedPart = selectedId === part.id;

          return (
            <CollapsibleTrigger key={part.id} asChild>
              <Button
                aria-label={`${selectedPart ? "Hide" : "Show"} ${part.label}`}
                className={partToneClass(part.tone, selectedPart)}
                size="icon-xs"
                title={part.label}
                variant="ghost"
                onClick={() => setSelectedId(selectedPart ? undefined : part.id)}
              >
                <Icon />
              </Button>
            </CollapsibleTrigger>
          );
        })}
      </div>
      <CollapsibleContent>
        {selected ? <PartDetails align={align} part={selected} /> : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PartDetails({ align, part }: { align: "start" | "end"; part: PartDisplay }) {
  const Icon = part.icon;

  return (
    <Bubble align={align} variant="outline">
      <BubbleContent className="flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Icon />
          <span>{part.label}</span>
        </div>
        <p className="text-muted-foreground">{part.description}</p>
        <div className="flex flex-col gap-2">{part.detail}</div>
      </BubbleContent>
    </Bubble>
  );
}

function partToneClass(tone: PartDisplay["tone"], selected: boolean) {
  const selectedClass = selected ? "ring-2 ring-ring" : "";
  const toneClass = {
    brain: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/25",
    tool: "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25",
    file: "bg-cyan-500/15 text-cyan-700 hover:bg-cyan-500/25",
    patch: "bg-pink-500/15 text-pink-700 hover:bg-pink-500/25",
    subtask: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/25",
    muted: "bg-muted text-muted-foreground hover:bg-muted/80",
    error: "bg-destructive/15 text-destructive hover:bg-destructive/25",
  }[tone];

  return `${toneClass} ${selectedClass}`;
}

function mapOpenCodeChatLog(entries: ChatLogEntry[]): ChatRow[] {
  return entries.flatMap((entry, entryIndex): ChatRow[] => {
    const info = entry.info;
    const role = info.role;
    const row: MessageRow = {
      id: info.id || `message-${entryIndex}`,
      type: "message",
      role,
      sender: role === "user" ? "You" : "OpenCode",
      time: formatTime(info.time.created),
      content: [],
      parts: [],
      markers: [],
    };

    if (role === "assistant" && info.error) {
      row.error = assistantErrorMessage(info.error);
    }

    for (const [partIndex, part] of entry.parts.entries()) {
      const id = part.id || `${row.id}-part-${partIndex}`;

      switch (part.type) {
        case "text":
          if (!part.ignored && part.text.trim()) {
            row.content.push(part.text);
          }
          if (part.ignored) {
            // Hidden in the clean chat view. Advanced mode can surface ignored context later.
          }
          break;
        case "reasoning":
          if (part.text.trim()) {
            row.parts?.push({
              id,
              type: "reasoning",
              label: "Reasoning",
              description: "Assistant reasoning for this step.",
              detail: <p>{part.text}</p>,
              icon: BrainIcon,
              tone: "brain",
            });
          }
          break;
        case "file":
          row.parts?.push(filePartToDisplay(part));
          break;
        case "tool":
          row.parts?.push(toolPartToDisplay(part));
          break;
        case "patch":
          row.parts?.push(patchPartToDisplay(part));
          break;
        case "step-start":
          // Hidden for now. These are too noisy for the default chat UI.
          break;
        case "step-finish":
          // Hidden for now. These are too noisy for the default chat UI.
          break;
        case "snapshot":
          row.parts?.push({
            id,
            type: "snapshot",
            label: "Snapshot",
            description: "OpenCode saved a snapshot at this point in the session.",
            detail: <code className="text-xs wrap-break-word">{part.snapshot}</code>,
            icon: ArchiveIcon,
            tone: "muted",
          });
          break;
        case "agent":
          row.parts?.push({
            id,
            type: "agent",
            label: "Agent",
            description: `Agent: ${part.name}`,
            detail: part.source ? <p>{part.source.value}</p> : <p>{part.name}</p>,
            icon: BotIcon,
            tone: "muted",
          });
          break;
        case "retry":
          row.parts?.push({
            id,
            type: "retry",
            label: "Retry",
            description: `Attempt ${part.attempt}`,
            detail: <p>{part.error.data.message}</p>,
            icon: RefreshCwIcon,
            tone: "error",
          });
          break;
        case "compaction":
          row.parts?.push({
            id,
            type: "compaction",
            label: "Compaction",
            description: part.auto
              ? "Conversation context was compacted automatically."
              : "Conversation context was compacted.",
            detail: part.overflow ? (
              <p>Compaction was triggered by context overflow.</p>
            ) : (
              <p>Context was summarized.</p>
            ),
            icon: MinimizeIcon,
            tone: "muted",
          });
          break;
        case "subtask":
          row.parts?.push({
            id,
            type: "subtask",
            label: "Subtask",
            description: part.description || part.prompt,
            detail: (
              <div className="flex flex-col gap-1">
                <p>{part.prompt}</p>
                <p className="text-muted-foreground">Agent: {part.agent}</p>
              </div>
            ),
            icon: ListTodoIcon,
            tone: "subtask",
          });
          break;
      }
    }

    return hasVisibleContent(row) ? [row] : [];
  });
}

function hasVisibleContent(row: MessageRow) {
  return Boolean(row.content.length || row.parts?.length || row.markers?.length || row.error);
}

function formatTime(value?: number) {
  if (!value) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function assistantErrorMessage(error: AssistantMessage["error"]): string | undefined {
  if (!error) return undefined;
  if ("data" in error && "message" in error.data && typeof error.data.message === "string") {
    return error.data.message;
  }

  return error.name;
}

function filePartToDisplay(part: FilePart): PartDisplay {
  const name =
    part.filename ?? fileNameFromPath(part.source?.type === "file" ? part.source.path : part.url);

  return {
    id: part.id,
    type: "file",
    label: "File",
    description: name,
    detail: (
      <div className="flex flex-col gap-1">
        <p>{part.mime}</p>
        <code className="text-xs wrap-break-word">
          {part.source?.type === "file" ? part.source.path : part.url}
        </code>
      </div>
    ),
    icon: attachmentIcon(part.mime, name),
    tone: "file",
  };
}

function toolPartToDisplay(part: ToolPart): PartDisplay {
  const state = part.state;
  const title = "title" in state && state.title ? state.title : part.tool;
  const status = state.status;

  return {
    id: part.id,
    type: "tool",
    label: "Tool",
    description: `${title} · ${status}`,
    detail: toolDetail(part),
    icon: status === "error" ? WrenchIcon : TerminalIcon,
    tone: status === "error" ? "error" : "tool",
  };
}

function toolDetail(part: ToolPart) {
  switch (part.state.status) {
    case "pending":
      return <CodeBlock value={part.state.raw || summarizeUnknown(part.state.input)} />;
    case "running":
      return <CodeBlock value={summarizeUnknown(part.state.input)} />;
    case "completed":
      return <p>{summarizeText(part.state.output)}</p>;
    case "error":
      return <p>{part.state.error}</p>;
  }
}

function patchPartToDisplay(part: PatchPart): PartDisplay {
  return {
    id: part.id,
    type: "patch",
    label: "Patch",
    description: `Changed ${part.files.length} ${part.files.length === 1 ? "file" : "files"}`,
    detail: (
      <div className="flex flex-col gap-1">
        {part.files.map((file) => (
          <code key={file} className="text-xs wrap-break-word">
            {file}
          </code>
        ))}
      </div>
    ),
    icon: GitPullRequestIcon,
    tone: "patch",
  };
}

function CodeBlock({ value }: { value: string }) {
  return <code className="text-xs wrap-break-word">{value}</code>;
}

function summarizeUnknown(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeText(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (!compact) return "Completed";
  if (compact.length <= 500) return compact;

  return `${compact.slice(0, 497)}...`;
}

function fileNameFromPath(value: string) {
  const cleaned = value.split("?")[0] ?? value;
  const parts = cleaned.split("/").filter(Boolean);

  return parts.at(-1) ?? value;
}

function attachmentIcon(mime: string, name: string): LucideIcon {
  if (mime.includes("typescript") || /\.(ts|tsx|js|jsx|json|md)$/i.test(name)) return FileCodeIcon;
  if (mime.startsWith("text/") || /\.(txt|log)$/i.test(name)) return FileTextIcon;

  return FileTextIcon;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}
