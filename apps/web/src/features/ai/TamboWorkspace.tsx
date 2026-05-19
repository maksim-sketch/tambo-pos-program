
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import {
  ComponentRenderer,
  useTambo,
  type Content,
  type ReactTamboThreadMessage,
} from "@tambo-ai/react";
import { CustomerLoyaltyCard } from "../customers/CustomerLoyaltyCard";
import { InventoryStatus } from "../inventory/InventoryStatus";
import { SalesChart } from "../reports/SalesChart";
import type {
  MockConversationEntry,
  MockWorkspaceSurface,
} from "./mock-agent";

type TamboWorkspaceProps =
  | {
      mode: "mock";
      entries: MockConversationEntry[];
      isPending?: boolean;
      error?: string | null;
    }
  | {
      mode: "live";
    };

export function TamboWorkspace(props: TamboWorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  useAutoScroll(workspaceRef, props.mode === "mock" ? props.entries : undefined);

  if (props.mode === "live") {
    return <LiveWorkspace workspaceRef={workspaceRef} />;
  }

  return (
    <div ref={workspaceRef} className="workspace-feed" aria-live="polite">
      {props.entries.length === 0 ? (
        <section className="surface-card workspace-empty-state">
          <p className="workspace-surface-label">Ready For Commands</p>
          <h3 className="workspace-surface-title">Generative workspace standing by</h3>
          <p className="surface-support">
            Submit a cashier prompt to render inventory, CRM, reporting, or cart
            surfaces here.
          </p>
        </section>
      ) : (
        props.entries.map((entry) => (
          <div key={entry.id} className="workspace-turn">
            <article className="message-card message-card-user">
              <span className="message-role">Cashier</span>
              <p className="message-text">{entry.command}</p>
            </article>

            <article className="message-card message-card-assistant">
              <span className="message-role">Tambo Demo Agent</span>
              <p className="message-text">{entry.reply}</p>
              {entry.surface ? (
                <div className="workspace-surface">{renderMockSurface(entry.surface)}</div>
              ) : null}
            </article>
          </div>
        ))
      )}

      {props.isPending ? (
        <div className="surface-card workspace-pulse">
          Tambo is assembling the next retail surface...
        </div>
      ) : null}

      {props.error ? (
        <div className="surface-card workspace-error">{props.error}</div>
      ) : null}
    </div>
  );
}

function renderMockSurface(surface: MockWorkspaceSurface) {
  switch (surface.kind) {
    case "inventory":
      
      return <InventoryStatus {...surface.props} />;
      
    case "customer":
      return <CustomerLoyaltyCard {...surface.props} />;
    case "sales":
      return <SalesChart {...surface.props} />;
    default:
      return null;
  }
}


function LiveWorkspace({
  workspaceRef,
}: {
  workspaceRef: RefObject<HTMLDivElement | null>;
}) {
  const {
    authState,
    currentThreadId,
    isIdentified,
    isStreaming,
    isWaiting,
    messages,
  } = useTambo();
  const turns = useMemo(() => buildLiveTurns(messages), [messages]);

  useAutoScroll(workspaceRef, turns, isStreaming, isWaiting);
  const liveStatus = getLiveStatus({
    authStatus: authState.status,
    isIdentified,
    isWaiting,
  });
  
  if (turns.length === 0) {
    return (
      <div ref={workspaceRef} className="workspace-feed" aria-live="polite">
        <section className="surface-card workspace-empty-state">
          <p className="workspace-surface-label">Live Tambo</p>
          <h3 className="workspace-surface-title">Waiting for the first live prompt</h3>
          <p className="surface-support">
            Send a natural-language command and Tambo will render the matching retail
            surface here.
          </p>
        </section>
        {liveStatus ? (
          <div className={`surface-card ${liveStatus.className}`}>{liveStatus.message}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={workspaceRef} className="workspace-feed" aria-live="polite">
      {turns.map((turn) => (
        <LiveTurnView key={turn.id} threadId={currentThreadId} turn={turn} />
      ))}

      {isStreaming ? (
        <div className="surface-card workspace-pulse">
          Tambo is streaming the next update...
        </div>
      ) : null}

      {liveStatus ? (
        <div className={`surface-card ${liveStatus.className}`}>{liveStatus.message}</div>
      ) : null}
    </div>
  );
}

type MeaningfulContent = Extract<Content, { type: "text" | "component" }>;

interface LiveTurn {
  id: string;
  userMessage: ReactTamboThreadMessage & { content: MeaningfulContent[] };
  assistantMessage:
    | (ReactTamboThreadMessage & { content: MeaningfulContent[] })
    | null;
}

function LiveTurnView({
  threadId,
  turn,
}: {
  threadId: string;
  turn: LiveTurn;
}) {
  const assistantMessage = turn.assistantMessage;

  return (
    <div className="workspace-turn">
      <article className="message-card message-card-user">
        <span className="message-role">Cashier</span>
        {turn.userMessage.content.map((content, index) =>
          renderLiveContent({
            content,
            index,
            message: turn.userMessage,
            threadId,
          }),
        )}
      </article>

      {assistantMessage ? (
        <article className="message-card message-card-assistant">
          <span className="message-role">Tambo</span>
          {assistantMessage.content.map((content, index) =>
            renderLiveContent({
              content,
              index,
              message: assistantMessage,
              threadId,
            }),
          )}
        </article>
      ) : null}
    </div>
  );
}

function buildLiveTurns(messages: ReactTamboThreadMessage[]): LiveTurn[] {
  const turns: LiveTurn[] = [];
  let currentTurn: LiveTurn | null = null;

  // Collapse the raw live thread into cashier -> final assistant turns so
  // tool-status noise and empty placeholder messages do not show in the UI.
  for (const message of messages) {
    const meaningfulContent = getMeaningfulContents(message);

    if (message.role === "user") {
      if (meaningfulContent.length === 0) {
        continue;
      }

      currentTurn = {
        id: message.id,
        userMessage: {
          ...message,
          content: meaningfulContent,
        },
        assistantMessage: null,
      };
      turns.push(currentTurn);
      continue;
    }

    if (!currentTurn || meaningfulContent.length === 0) {
      continue;
    }

    const nextAssistantMessage = {
      ...message,
      content: meaningfulContent,
    };

    if (
      currentTurn.assistantMessage &&
      hasRenderableComponent(currentTurn.assistantMessage.content) &&
      !hasRenderableComponent(nextAssistantMessage.content)
    ) {
      continue;
    }

    currentTurn.assistantMessage = nextAssistantMessage;
  }

  return turns;
}

function getMeaningfulContents(
  message: ReactTamboThreadMessage,
): MeaningfulContent[] {
  return message.content.filter((content): content is MeaningfulContent => {
    if (content.type === "component") {
      return true;
    }

    if (content.type !== "text") {
      return false;
    }

    return content.text.trim().length > 0;
  });
}

function hasRenderableComponent(contents: MeaningfulContent[]) {
  return contents.some((content) => content.type === "component");
}

function useAutoScroll(
  workspaceRef: RefObject<HTMLDivElement | null>,
  ...dependencies: ReadonlyArray<unknown>
) {
  useLayoutEffect(() => {
    const scrollShell = workspaceRef.current?.closest(".workspace-scroll-shell");

    if (!(scrollShell instanceof HTMLElement)) {
      return;
    }

    scrollShell.scrollTop = scrollShell.scrollHeight;
  }, [workspaceRef, ...dependencies]);
}

function getLiveStatus({
  authStatus,
  isIdentified,
  isWaiting,
}: {
  authStatus: string;
  isIdentified: boolean;
  isWaiting: boolean;
}) {
  if (!isIdentified) {
    return {
      className: "workspace-error",
      message: `Tambo is not identified yet (auth status: ${authStatus}). Check the project API key, provider settings, and Tambo observability logs.`,
    };
  }

  if (isWaiting) {
    return {
      className: "workspace-pulse",
      message: "Tambo is waiting for the model to start responding...",
    };
  }

  return null;
}

function renderLiveContent({
  content,
  index,
  message,
  threadId,
}: {
  content: Content;
  index: number;
  message: ReactTamboThreadMessage;
  threadId: string;
}) {
  switch (content.type) {
    case "text":
      return (
        <p key={`${message.id}-text-${index}`} className="message-text">
          {formatAssistantText(content.text, message.role)}
        </p>
      );
    case "component":
      return (
        <div key={content.id} className="workspace-surface">
          <ComponentRenderer
            content={content}
            fallback={<div className="workspace-error">Unknown component surface</div>}
            messageId={message.id}
            threadId={threadId}
          />
        </div>
      );
    default:
      return null;
  }
}

function formatAssistantText(
  text: string,
  role: ReactTamboThreadMessage["role"],
) {
  if (role !== "assistant") {
    return text;
  }

  return text
    .replace(/[`*_]+/g, "")
    .replace(/\s-\s/g, " · ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
