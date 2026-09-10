import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { localDateString, type ApplicationChannelStatus, type JobPlatformLink } from "../../../../shared/positionSchema";
import { PublicationLinksEditor } from "./PublicationLinksEditor";

const desktop = vi.hoisted(() => ({ isDesktop: vi.fn(() => false), openExternal: vi.fn() }));
vi.mock("../../../desktop/desktopBridge", () => ({
  isDesktopApplication: desktop.isDesktop,
  openExternalUrl: desktop.openExternal,
}));

function Harness() {
  const [links, setLinks] = useState<JobPlatformLink[]>([
    { platformName: "LinkedIn", url: "https://example.com/1", applicationStatus: null, applicationDate: null },
    { platformName: "Indeed", url: "https://example.com/2", applicationStatus: "viewed", applicationDate: "2026-01-02" },
  ]);
  const [career, setCareer] = useState<{ url: string | null; status: ApplicationChannelStatus | null; date: string | null }>({ url: "https://example.com/careers", status: null, date: null });
  return <PublicationLinksEditor links={links} careerPageUrl={career.url} careerPageApplicationStatus={career.status} careerPageApplicationDate={career.date} onLinksChange={setLinks} onCareerPageChange={(url, status, date) => setCareer({ url, status, date })} />;
}

describe("PublicationLinksEditor", () => {
  it("offers one focused action when no platforms exist", () => {
    const onLinksChange = vi.fn();
    render(<PublicationLinksEditor links={[]} careerPageUrl={null} careerPageApplicationStatus={null} careerPageApplicationDate={null} onLinksChange={onLinksChange} onCareerPageChange={vi.fn()} />);
    expect(screen.getByText("No job platforms added")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add platform" }));
    expect(onLinksChange).toHaveBeenCalledWith([{ platformName: "", url: "", applicationStatus: null, applicationDate: null }]);
  });

  it("tracks platform channels independently and suggests today when Applied is selected", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Application status 1"), { target: { value: "applied" } });
    expect(screen.getByLabelText("Application date 1")).toHaveValue(localDateString(new Date()));
    expect(screen.getByLabelText("Application status 2")).toHaveValue("viewed");
    expect(screen.getByLabelText("Application date 2")).toHaveValue("2026-01-02");
    fireEvent.change(screen.getByLabelText("Application date 1"), { target: { value: "2026-01-01" } });
    expect(screen.getByLabelText("Application date 1")).toHaveValue("2026-01-01");
  });

  it("supports untracked career metadata and confirms destructive clearing", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Career-page application status"), { target: { value: "applied" } });
    expect(screen.getByLabelText("Career-page application date")).toHaveValue(localDateString(new Date()));
    fireEvent.change(screen.getByLabelText("Career-page application status"), { target: { value: "" } });
    expect(screen.getByLabelText("Career-page application status")).toHaveValue("applied");
    fireEvent.change(screen.getByLabelText("Career-page application status"), { target: { value: "" } });
    expect(screen.getByLabelText("Career-page application status")).toHaveValue("");
    expect(screen.getByLabelText("Career-page application date")).toHaveValue("");
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("shows all channel definitions on demand", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Channel status definitions" }));
    const dialog = screen.getByRole("dialog", { name: "Channel status definitions" });
    for (const label of ["Not applied", "Applied", "Viewed", "Contacted", "Closed"]) expect(within(dialog).getByText(label)).toBeInTheDocument();
  });

  it("keeps valid links as browser anchors and uses the desktop opener", () => {
    desktop.isDesktop.mockReturnValue(false);
    render(<Harness />);
    expect(screen.getByRole("link", { name: "Open LinkedIn posting" })).toHaveAttribute("href", "https://example.com/1");
    expect(screen.getByRole("link", { name: "Open organization career page" })).toHaveAttribute("href", "https://example.com/careers");
    desktop.isDesktop.mockReturnValue(true);
    fireEvent.click(screen.getByRole("link", { name: "Open LinkedIn posting" }));
    expect(desktop.openExternal).toHaveBeenCalledWith("https://example.com/1");
  });
});
