import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useTamboThreadInput } from "@tambo-ai/react";
import { PosTamboProvider } from "../features/ai/tambo-provider";
import type { RetailBranch } from "../features/ai/retail-branch";
import { TamboWorkspace } from "../features/ai/TamboWorkspace";
import {
  createEmptyCart,
  type MockConversationEntry,
  runMockCommand,
} from "../features/ai/mock-agent";
import { PersistentCart } from "../features/cart/PersistentCart";
import { useLiveBranchCart } from "../features/cart/live-cart-store";
import {
  connectInventorySync,
  disconnectInventorySync,
} from "../features/inventory/inventory-sync-store";
import { ReceiptToastViewport } from "../features/notifications/receipt-toast";

const branches = [
  { code: "branch-a", label: "Branch A" },
  { code: "branch-b", label: "Branch B" },
] as const satisfies ReadonlyArray<RetailBranch>;

type AgentMode = "mock" | "live";

interface AppProps {
  agentMode?: AgentMode;
}

function getRequestedMode(agentMode?: AgentMode): AgentMode {
  if (agentMode) {
    return agentMode;
  }

  return import.meta.env.VITE_AGENT_MODE === "live" ? "live" : "mock";
}

export function App({ agentMode }: AppProps) {
  const [activeBranchCode, setActiveBranchCode] =
    useState<(typeof branches)[number]["code"]>("branch-a");
  const [mockCommand, setMockCommand] = useState("");
  const [mockEntries, setMockEntries] = useState<MockConversationEntry[]>([]);
  const [mockCart, setMockCart] = useState(() => createEmptyCart("Branch A"));
  const [mockError, setMockError] = useState<string | null>(null);
  const [isMockSubmitting, setIsMockSubmitting] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();

  const activeBranch =
    branches.find((branch) => branch.code === activeBranchCode) ?? branches[0];
  const requestedMode = getRequestedMode(agentMode);
  const hasLiveTambo = Boolean(import.meta.env.VITE_TAMBO_API_KEY);
  const resolvedMode: AgentMode =
    requestedMode === "live" && hasLiveTambo ? "live" : "mock";
  const isLiveFallback = requestedMode === "live" && resolvedMode === "mock";
  const liveCart = useLiveBranchCart(activeBranch.code, activeBranch.label);
  const displayCart = resolvedMode === "mock" ? mockCart : liveCart;
  const isMockBusy = isMockSubmitting || isTransitionPending;

  useEffect(() => {
    if (resolvedMode !== "live") {
      disconnectInventorySync();
      return;
    }

    connectInventorySync();

    return () => {
      disconnectInventorySync();
    };
  }, [resolvedMode]);

  async function handleMockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const command = mockCommand.trim();
    if (!command) {
      return;
    }

    setIsMockSubmitting(true);
    setMockError(null);

    try {
      const result = await runMockCommand(command, {
        branchName: activeBranch.label,
        cartId: displayCart.cartId,
      });

      startTransition(() => {
        setMockEntries((currentEntries) => [
          ...currentEntries,
          {
            id: `mock-${Date.now()}-${currentEntries.length + 1}`,
            command,
            reply: result.reply,
            surface: result.surface,
          },
        ]);

        if (result.cart) {
          setMockCart(result.cart);
        }
      });

      setMockCommand("");
    } catch (error) {
      setMockError(
        error instanceof Error
          ? error.message
          : "The demo agent could not process that command.",
      );
    } finally {
      setIsMockSubmitting(false);
    }
  }

  return (
    <PosTamboProvider activeBranch={activeBranch} branches={branches}>
      <div className="app-shell">
        <div className="app-container">
          <header className="app-header">
            <div>
              <p className="app-eyebrow">Tambo POS v1.2.0</p>
              <h1 className="app-title">Retail Command Center</h1>
            </div>

            <nav aria-label="Branch selector" className="branch-switcher">
              {branches.map((branch) => (
                <button
                  key={branch.code}
                  role="tab"
                  aria-selected={branch.code === activeBranch.code}
                  className={`branch-tab ${
                    branch.code === activeBranch.code ? "branch-tab-active" : ""
                  }`}
                  onClick={() => setActiveBranchCode(branch.code)}
                  type="button"
                >
                  {branch.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="app-main">
            <section className="app-panel workspace-panel">
              <div className="workspace-heading-row">
                <h2 className="section-title">Generative Workspace</h2>

                <div
                  className={`mode-pill ${
                    resolvedMode === "live" ? "mode-pill-live" : "mode-pill-mock"
                  }`}
                >
                  {resolvedMode === "live" ? "Live Tambo Mode" : "Demo Mock Mode"}
                </div>
              </div>

              <div className="workspace-body">
                <div className="workspace-scroll-shell">
                  {isLiveFallback ? (
                    <div className="workspace-note">
                      `VITE_TAMBO_API_KEY` is missing, so the shell is using the
                      deterministic mock agent for now.
                    </div>
                  ) : null}

                  {resolvedMode === "mock" ? (
                    <TamboWorkspace
                      mode="mock"
                      entries={mockEntries}
                      error={mockError}
                      isPending={isMockBusy}
                    />
                  ) : (
                    <TamboWorkspace mode="live" />
                  )}
                </div>

                {resolvedMode === "live" ? (
                  <LiveCommandComposer branchName={activeBranch.label} />
                ) : (
                  <MockCommandComposer
                    branchName={activeBranch.label}
                    command={mockCommand}
                    isSubmitting={isMockBusy}
                    onCommandChange={setMockCommand}
                    onSubmit={handleMockSubmit}
                  />
                )}
              </div>
            </section>

            <div className="cart-rail">
              <aside className="app-panel cart-panel">
                <h2 className="section-title">Persistent Cart</h2>

                <PersistentCart interactableId="cart-main" {...displayCart} />
              </aside>

              <ReceiptToastViewport />
            </div>
          </main>
        </div>
      </div>
    </PosTamboProvider>
  );
}

function MockCommandComposer({
  branchName,
  command,
  isSubmitting,
  onCommandChange,
  onSubmit,
}: {
  branchName: string;
  command: string;
  isSubmitting: boolean;
  onCommandChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form className="surface-card command-form" onSubmit={onSubmit}>
      <div className="workspace-surface-header">
        <div>
          <p className="workspace-surface-label">Command Input</p>
          <h3 className="workspace-surface-title">Mock cashier session</h3>
        </div>

        <span className="context-pill">{branchName}</span>
      </div>

      <div className="command-row">
        <input
          id="command-input"
          aria-label="Command input"
          className="command-input"
          onChange={(event) => onCommandChange(event.target.value)}
          placeholder="Type a command like 'Add 2 espressos'"
          value={command}
        />
        <button
          className="send-button"
          disabled={isSubmitting || command.trim().length === 0}
          type="submit"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
}

function LiveCommandComposer({ branchName }: { branchName: string }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { error, isDisabled, isPending, setValue, submit, value } =
    useTamboThreadInput();
  const liveError =
    submitError ?? (error instanceof Error ? error.message : null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    setSubmitError(null);

    try {
      await submit();
    } catch (submitFailure) {
      setSubmitError(
        submitFailure instanceof Error
          ? submitFailure.message
          : "Tambo could not process that live request.",
      );
    }
  }

  return (
    <form className="surface-card command-form" onSubmit={handleSubmit}>
      <div className="workspace-surface-header">
        <div>
          <p className="workspace-surface-label">Command Input</p>
          <h3 className="workspace-surface-title">Live Tambo thread</h3>
        </div>

        <span className="context-pill">{branchName}</span>
      </div>

      <div className="command-row">
        <input
          id="command-input"
          aria-label="Command input"
          className="command-input"
          disabled={isDisabled}
          onChange={(event) => {
            if (submitError) {
              setSubmitError(null);
            }

            setValue(event.target.value);
          }}
          placeholder="Ask Tambo to add items, show stock, or open reports"
          value={value}
        />
        <button
          className="send-button"
          disabled={isDisabled || isPending || value.trim().length === 0}
          type="submit"
        >
          {isPending ? "Sending..." : "Send"}
        </button>
      </div>

      {liveError ? <div className="workspace-error">{liveError}</div> : null}
    </form>
  );
}
