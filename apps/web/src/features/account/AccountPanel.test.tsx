import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountPanel } from "./AccountPanel";

describe("AccountPanel", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows private-data disclosure and revokes a selected session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sessions: [{ id: "session-2", createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z", expiresAt: "2026-10-10T00:00:00.000Z", ipAddress: null, userAgent: "Desktop", current: false }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ revoked: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sessions: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AccountPanel onClose={() => undefined} />);
    expect(await screen.findByText(/Offline data on this device remains independent/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/account/sessions/session-2", expect.objectContaining({ method: "DELETE" })));
    await waitFor(() => expect(screen.queryByText("Desktop", { exact: false })).not.toBeInTheDocument());
  });
});
