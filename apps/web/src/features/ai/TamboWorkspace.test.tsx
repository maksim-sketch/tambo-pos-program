import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

var tamboState: {
  useTamboValue: {
    authState: { status: string };
    currentThreadId: string;
    isIdentified: boolean;
    isStreaming: boolean;
    isWaiting: boolean;
    messages: Array<{
      id: string;
      role: string;
      content: Array<Record<string, unknown>>;
    }>;
  };
} = {
  useTamboValue: {
    authState: { status: "identified" },
    currentThreadId: "thread-live",
    isIdentified: true,
    isStreaming: false,
    isWaiting: false,
    messages: [],
  },
};

vi.mock("@tambo-ai/react", async () => {
  return {
    ComponentRenderer: ({
      content,
    }: {
      content: { renderedComponent?: React.ReactNode | null };
    }) => <>{content.renderedComponent ?? null}</>,
    useTambo: () => tamboState.useTamboValue,
  };
});

import { TamboWorkspace } from "./TamboWorkspace";

describe("TamboWorkspace", () => {
  beforeEach(() => {
    tamboState.useTamboValue = {
      authState: { status: "identified" },
      currentThreadId: "thread-live",
      isIdentified: true,
      isStreaming: false,
      isWaiting: false,
      messages: [],
    };
  });

  it("shows a waiting state while a live Tambo response has not started streaming yet", () => {
    tamboState.useTamboValue = {
      ...tamboState.useTamboValue,
      isWaiting: true,
      messages: [
        {
          id: "msg-user-1",
          role: "user",
          content: [{ type: "text", text: "Check stock for Blue Shirt" }],
        },
      ],
    };

    render(<TamboWorkspace mode="live" />);

    expect(
      screen.getByText(/waiting for the model to start responding/i),
    ).toBeInTheDocument();
  });

  it("shows an authentication warning instead of staying silent", () => {
    tamboState.useTamboValue = {
      ...tamboState.useTamboValue,
      authState: { status: "anonymous" },
      isIdentified: false,
      messages: [
        {
          id: "msg-user-1",
          role: "user",
          content: [{ type: "text", text: "Check stock for Blue Shirt" }],
        },
      ],
    };

    render(<TamboWorkspace mode="live" />);

    expect(screen.getByText(/tambo is not identified yet/i)).toBeInTheDocument();
    expect(screen.getByText(/auth status: anonymous/i)).toBeInTheDocument();
  });

  it("suppresses tool-status noise and empty cashier placeholders in live mode", () => {
    tamboState.useTamboValue = {
      ...tamboState.useTamboValue,
      messages: [
        {
          id: "msg-user-1",
          role: "user",
          content: [{ type: "text", text: "Check stock for Blue Shirt" }],
        },
        {
          id: "msg-assistant-1",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "checkInventory",
              statusMessage: "Stock checked.",
            },
            {
              type: "text",
              text: "Blue Shirt stock across all branches.",
            },
          ],
        },
        {
          id: "msg-user-2",
          role: "user",
          content: [{ type: "text", text: "   " }],
        },
        {
          id: "msg-assistant-2",
          role: "assistant",
          content: [
            {
              type: "component",
              id: "cmp-1",
              renderedComponent: <div>Inventory Status</div>,
            },
          ],
        },
      ],
    };

    render(<TamboWorkspace mode="live" />);

    expect(screen.getAllByText("Cashier")).toHaveLength(1);
    expect(screen.queryByText("Stock checked.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/blue shirt stock across all branches/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Inventory Status")).toBeInTheDocument();
  });

  it("strips markdown-style formatting from assistant text before rendering it", () => {
    tamboState.useTamboValue = {
      ...tamboState.useTamboValue,
      messages: [
        {
          id: "msg-user-1",
          role: "user",
          content: [{ type: "text", text: "checkout" }],
        },
        {
          id: "msg-assistant-1",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Checked out at **Branch A**. - Total: **$4.48**",
            },
          ],
        },
      ],
    };

    render(<TamboWorkspace mode="live" />);

    expect(
      screen.getByText("Checked out at Branch A. · Total: $4.48"),
    ).toBeInTheDocument();
  });
});
