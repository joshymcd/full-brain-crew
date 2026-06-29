import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  FileCodeIcon,
  FileTextIcon,
  GitBranchIcon,
  PaperclipIcon,
  SendIcon,
  TerminalIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
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

type ChatAttachment = {
  name: string;
  meta: string;
  icon: LucideIcon;
};

type MessageRow = {
  id: string;
  type: "message";
  role: "assistant" | "user";
  sender: string;
  time: string;
  content: string[];
  attachments?: ChatAttachment[];
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

const dummyRows: ChatRow[] = [
  {
    id: "today",
    type: "marker",
    variant: "separator",
    content: "Dummy transcript",
  },
  {
    id: "assistant-intro",
    type: "message",
    role: "assistant",
    sender: "OpenCode UI",
    time: "09:12",
    content: [
      "This is a static preview of the custom OpenCode chat surface.",
      "No session data is loaded yet, so every row here is local test data.",
    ],
  },
  {
    id: "user-request",
    type: "message",
    role: "user",
    sender: "You",
    time: "09:13",
    content: ["Sketch out the chat route before wiring it to OpenCode."],
  },
  {
    id: "tool-marker",
    type: "marker",
    variant: "border",
    content: "Read route tree, UI primitives, and layout conventions",
    icon: CheckIcon,
  },
  {
    id: "assistant-plan",
    type: "message",
    role: "assistant",
    sender: "OpenCode UI",
    time: "09:14",
    content: [
      "I would keep this page dumb for now: route param in the header, dummy transcript in the scroller, and a disabled composer at the bottom.",
      "Attachments can represent files OpenCode might later send through tool calls or context selection.",
    ],
    attachments: [
      { name: "route-map.txt", meta: "Text · 2 KB", icon: FileTextIcon },
      { name: "message-renderer.tsx", meta: "TSX · 12 KB", icon: FileCodeIcon },
    ],
  },
  {
    id: "branch-marker",
    type: "marker",
    content: "Preview branch: local-only chat data",
    icon: GitBranchIcon,
  },
  {
    id: "user-follow-up",
    type: "message",
    role: "user",
    sender: "You",
    time: "09:15",
    content: ["Make sure the scroller and composer feel like a real app shell."],
  },
  {
    id: "assistant-status",
    type: "marker",
    content: "Waiting for OpenCode integration",
    icon: WrenchIcon,
    status: true,
  },
  {
    id: "assistant-shell",
    type: "message",
    role: "assistant",
    sender: "OpenCode UI",
    time: "09:16",
    content: [
      "The composer below is intentionally disabled. When the OpenCode SDK is wired in, this should become the place where prompts, attachments, and session controls converge.",
    ],
    attachments: [{ name: "terminal-session.log", meta: "Log · 8 KB", icon: TerminalIcon }],
  },
];

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

  void chatLogQuery;

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-card px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Dummy chat route
          </p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">Chat {chatId}</h1>
        </div>
        <div className="hidden items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:flex">
          <PaperclipIcon />
          Static test data
        </div>
      </header>

      <MessageScrollerProvider
        autoScroll
        defaultScrollPosition="last-anchor"
        scrollPreviousItemPeek={72}
      >
        <MessageScroller className="flex-1 bg-background">
          <MessageScrollerViewport>
            <MessageScrollerContent className="mx-auto w-full max-w-4xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
              {dummyRows.map((row) => (
                <MessageScrollerItem
                  key={row.id}
                  messageId={row.id}
                  scrollAnchor={row.type === "message" && row.role === "user"}
                >
                  {row.type === "marker" ? <ChatMarker row={row} /> : <ChatMessage row={row} />}
                </MessageScrollerItem>
              ))}
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

function ChatMessage({ row }: { row: MessageRow }) {
  const align = row.role === "user" ? "end" : "start";
  const initials = row.role === "user" ? "YO" : "OC";

  return (
    <Message align={align}>
      <MessageAvatar>
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>
          {row.sender} · {row.time}
        </MessageHeader>
        <Bubble align={align} variant={row.role === "user" ? "default" : "secondary"}>
          <BubbleContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {row.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {row.attachments ? <ChatAttachments attachments={row.attachments} /> : null}
          </BubbleContent>
        </Bubble>
        <MessageFooter>{row.role === "user" ? "Queued locally" : "Preview response"}</MessageFooter>
      </MessageContent>
    </Message>
  );
}

function ChatAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  return (
    <AttachmentGroup aria-label="Message attachments" className="w-full" role="group" tabIndex={0}>
      {attachments.map((attachment) => {
        const Icon = attachment.icon;

        return (
          <Attachment key={attachment.name} className="w-64" size="sm">
            <AttachmentMedia>
              <Icon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.name}</AttachmentTitle>
              <AttachmentDescription>{attachment.meta}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}
