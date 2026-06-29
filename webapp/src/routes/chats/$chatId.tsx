import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type {
  AssistantMessage,
  Message as OpenCodeMessage,
  Part,
} from "@opencode-ai/sdk/v2/client";
import {
  BrainIcon,
  ChevronDownIcon,
  PaperclipIcon,
  SendIcon,
  TerminalIcon,
  WrenchIcon,
} from "lucide-react";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  reasoning?: string[];
  markers?: MarkerRow[];
  error?: string;
};

type MarkerRow = {
  id: string;
  type: "marker";
  variant?: "default" | "border" | "separator";
  content: string;
  icon?: typeof TerminalIcon;
  status?: boolean;
};

type ChatRow = MessageRow | MarkerRow;

type ChatLogEntry = {
  info: OpenCodeMessage;
  parts: Part[];
};

function ChatPage() {
  const { chatId } = Route.useParams();
  const { opencodeClient, opencodeDirectory } = Route.useRouteContext();
  const locationQuery = opencodeDirectory ? { directory: opencodeDirectory } : undefined;
  const chatLogQuery = useQuery({
    queryKey: ["opencode", "chat-log", opencodeDirectory, chatId],
    queryFn: async () =>
      (
        await opencodeClient.session.messages({
          ...locationQuery,
          sessionID: chatId,
        })
      ).data,
    retry: false,
  });
  const chatRows = mapOpenCodeChatLog(chatLogQuery.data ?? []);

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-card px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            OpenCode session
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">Chat {chatId}</h1>
        </div>
        <div className="hidden items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:flex">
          <PaperclipIcon />
          Live chat log
        </div>
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
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2">
          <Input
            disabled
            aria-label="Message composer"
            placeholder="OpenCode integration coming soon"
          />
          <Button disabled aria-label="Send message">
            Send
            <SendIcon data-icon="inline-end" />
          </Button>
        </div>
      </footer>
    </div>
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
    <Message align={align}>
      <MessageContent>
        {showHeader ? (
          <MessageHeader>{row.time ? `${row.sender} · ${row.time}` : row.sender}</MessageHeader>
        ) : null}
        {row.markers?.map((marker) => (
          <ChatMarker key={marker.id} row={marker} />
        ))}
        {row.error ? (
          <Bubble align={align} variant="destructive">
            <BubbleContent>{row.error}</BubbleContent>
          </Bubble>
        ) : null}
        {row.content.length ? (
          <Bubble align={align} variant={bubbleVariant}>
            <BubbleContent className="flex flex-col gap-2">
              <div className="flex flex-col gap-2">
                {row.content.map((paragraph, index) => (
                  <p key={`${row.id}-text-${index}`}>{paragraph}</p>
                ))}
              </div>
            </BubbleContent>
          </Bubble>
        ) : null}
        {row.reasoning?.length ? <ReasoningDisclosure reasoning={row.reasoning} /> : null}
      </MessageContent>
    </Message>
  );
}

function ReasoningDisclosure({ reasoning }: { reasoning: string[] }) {
  return (
    <Collapsible>
      <Bubble variant="ghost">
        <BubbleContent className="flex flex-col gap-2 text-muted-foreground">
          <CollapsibleTrigger asChild>
            <Button aria-label="Toggle reasoning" size="icon-xs" variant="ghost">
              <BrainIcon />
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col gap-2">
            {reasoning.map((item, index) => (
              <p key={`reasoning-${index}`}>{item}</p>
            ))}
          </CollapsibleContent>
        </BubbleContent>
      </Bubble>
    </Collapsible>
  );
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
      reasoning: [],
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
            row.reasoning?.push(part.text);
          }
          break;
        case "file":
          // Hidden for now to keep the transcript focused on conversation text.
          break;
        case "tool":
          // Hidden for now. Advanced mode can expose tool calls and outputs later.
          break;
        case "patch":
          // Hidden for now. Advanced mode can expose changed files later.
          break;
        case "step-start":
          // Hidden for now. These are too noisy for the default chat UI.
          break;
        case "step-finish":
          // Hidden for now. These are too noisy for the default chat UI.
          break;
        case "snapshot":
          // Hidden for now. Advanced mode can expose snapshots later.
          break;
        case "agent":
          // Hidden for now. Message-level agent details are not useful in the clean view.
          break;
        case "retry":
          // Hidden for now unless the final assistant message exposes an error.
          break;
        case "compaction":
          // Hidden for now. Advanced mode can expose compaction boundaries later.
          break;
        case "subtask":
          row.markers?.push({
            id,
            type: "marker",
            variant: "border",
            content: `Subtask: ${part.description || part.prompt}`,
            icon: TerminalIcon,
          });
          break;
      }
    }

    return hasVisibleContent(row) ? [row] : [];
  });
}

function hasVisibleContent(row: MessageRow) {
  return Boolean(row.content.length || row.reasoning?.length || row.markers?.length || row.error);
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}
