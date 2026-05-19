import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

var tamboState = {
  useTamboValue: {
    authState: { status: "identified" },
    currentThreadId: "thread-live",
    isIdentified: true,
    isIdle: true,
    isStreaming: false,
    isWaiting: false,
    messages: [],
  },
  useTamboThreadInputValue: {
    error: null as Error | null,
    isDisabled: false,
    isPending: false,
    setValue: vi.fn(),
    submit: vi.fn(async () => ({ threadId: "thread-live" })),
    value: "",
  },
};

vi.mock("@tambo-ai/react", async () => {
  const react = await import("react");

  return {
    TamboClientContext: react.createContext(undefined),
    TamboProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ComponentRenderer: ({
      content,
    }: {
      content: { renderedComponent?: React.ReactNode | null };
    }) => <>{content.renderedComponent ?? null}</>,
    useTambo: () => tamboState.useTamboValue,
    useTamboThreadInput: () => tamboState.useTamboThreadInputValue,
    useTamboComponentState: <T,>(_key: string, value: T) =>
      [value, () => undefined] as const,
    withTamboInteractable: <TProps extends object>(
      Component: React.ComponentType<TProps>,
    ) =>
      function MockInteractable(props: TProps) {
        return <Component {...props} />;
      },
    defineTool: <T,>(tool: T) => tool,
  };
});

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    tamboState.useTamboValue = {
      authState: { status: "identified" },
      currentThreadId: "thread-live",
      isIdentified: true,
      isIdle: true,
      isStreaming: false,
      isWaiting: false,
      messages: [],
    };
    tamboState.useTamboThreadInputValue = {
      error: null,
      isDisabled: false,
      isPending: false,
      setValue: vi.fn(),
      submit: vi.fn(async () => ({ threadId: "thread-live" })),
      value: "",
    };
  });

  it("adds 2 espressos to the persistent cart in mock mode", async () => {
    render(<App agentMode="mock" />);

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Add 2 espressos" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Espresso")).toBeInTheDocument();
    expect(screen.getByText("$8.96")).toBeInTheDocument();
    expect(screen.queryByText("Blue Shirt")).not.toBeInTheDocument();
  });

  it("shows branch inventory in the workspace for stock commands", async () => {
    render(<App agentMode="mock" />);

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Check stock for Blue Shirt in all branches" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Inventory Status")).toBeInTheDocument();
    expect(screen.getAllByText(/low stock alert/i).length).toBeGreaterThan(0);
  });

  it("shows the customer loyalty card for CRM prompts", async () => {
    render(<App agentMode="mock" />);

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Pull up profile for Ada Lovelace" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText(/loyalty points/i)).toBeInTheDocument();
    expect(screen.getByText(/recent purchases/i)).toBeInTheDocument();
  });

  it("shows a sales chart surface for reporting prompts", async () => {
    render(<App agentMode="mock" />);

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Show me a chart of today's sales" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("heading", { name: "Today's Sales" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top Items" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Hourly Revenue" }),
    ).toBeInTheDocument();
  });

  it("keeps the current cart when a cashier enters an unsupported prompt", async () => {
    render(<App agentMode="mock" />);

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Add 2 espressos" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("Espresso")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: /command input/i }), {
      target: { value: "Open the garage door" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/try one of the demo prompts/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Espresso")).toBeInTheDocument();
    expect(screen.getByText("$8.96")).toBeInTheDocument();
  });

  it("shows live submit failures instead of failing silently", async () => {
    const previousApiKey = import.meta.env.VITE_TAMBO_API_KEY;

    import.meta.env.VITE_TAMBO_API_KEY = "tambo-test-key";
    tamboState.useTamboThreadInputValue = {
      error: null,
      isDisabled: false,
      isPending: false,
      setValue: vi.fn(),
      submit: vi.fn(async () => {
        throw new Error("Tambo run failed");
      }),
      value: "Check stock for Blue Shirt in all branches",
    };

    try {
      render(<App agentMode="live" />);

      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(await screen.findByText(/tambo run failed/i)).toBeInTheDocument();
    } finally {
      import.meta.env.VITE_TAMBO_API_KEY = previousApiKey;
    }
  });
});
