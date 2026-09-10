import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionDetailsRoute } from "./PositionDetailsRoute";
import type { Position, ReferenceData } from "../positionTypes";

const position: Position = { id: "p1", company: { name: "Acme", logoPath: null, logoUrl: null }, title: "Engineer", status: "applied", workMode: "remote", employmentType: "full_time", seniority: "Senior", departmentId: "eng", teamId: "web", locationId: "remote", hiringManager: { name: "Mina", phone: "123", position: "Director" }, salary: null, description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Build useful things." }] }] }, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, questions: [], readingItems: [], submittedResume: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const referenceData: ReferenceData = { version: 1, departments: [{ id: "eng", name: "Engineering", teams: [{ id: "web", name: "Web" }] }, { id: "product", name: "Product", teams: [{ id: "design", name: "Design" }] }], locations: [{ id: "remote", name: "Remote" }] };

describe("PositionDetailsRoute", () => {
  it("shows disabled unavailable values when reference lists are empty", async () => {
    const emptyPosition = { ...position, departmentId: null, teamId: null, locationId: null };
    render(<PositionDetailsRoute positionId="p1" section="role-details" onBack={vi.fn()} api={{ getPosition: vi.fn().mockResolvedValue(emptyPosition), getReferenceData: vi.fn().mockResolvedValue({ version: 1, departments: [], locations: [] }), updatePosition: vi.fn() }} />);
    await screen.findByLabelText("Department");
    expect(screen.getByLabelText("Department")).toHaveTextContent("No options available");
    expect(screen.getByLabelText("Department").querySelector('option[value=""]')).toBeDisabled();
    expect(screen.getByLabelText("Team")).toHaveTextContent("No options available");
    expect(screen.getByLabelText("Location")).toHaveTextContent("No options available");
  });

  it("clears dependent team, validates manager completeness, and saves", async () => {
    const updatePosition = vi.fn().mockResolvedValue({ ...position, departmentId: "product", teamId: null });
    render(<PositionDetailsRoute positionId="p1" section="role-details" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition }} />);
    await screen.findByDisplayValue("Engineering");
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "product" } });
    expect(screen.getByLabelText("Team")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Hiring manager phone"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Complete all hiring manager fields.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Hiring manager phone"), { target: { value: "456" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updatePosition).toHaveBeenCalled());
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
  });

  it("retains entered values after save failure", async () => {
    render(<PositionDetailsRoute positionId="p1" section="role-details" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn().mockRejectedValue(new Error("write failed")) }} />);
    await screen.findByDisplayValue("Mina");
    fireEvent.change(screen.getByLabelText("Hiring manager phone"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Could not save changes. Your entries are still here.")).toBeInTheDocument();
    expect(screen.getByLabelText("Hiring manager phone")).toHaveValue("999");
  });

  it("adds publication links, validates partial entries, and saves valid addresses", async () => {
    const updatePosition = vi.fn().mockResolvedValue(position);
    render(<PositionDetailsRoute positionId="p1" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition }} />);
    await screen.findByLabelText("Overall status");
    fireEvent.click(screen.getByRole("button", { name: "Add platform" }));
    fireEvent.change(screen.getByLabelText("Platform name 1"), { target: { value: "LinkedIn" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Enter both a platform name/)).toBeInTheDocument();
    expect(updatePosition).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Job posting URL 1"), { target: { value: "https://linkedin.com/jobs/1" } });
    fireEvent.change(screen.getByLabelText("Organization career-page URL"), { target: { value: "https://acme.test/careers/1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updatePosition).toHaveBeenCalledWith("p1", expect.objectContaining({
      jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1", applicationStatus: null, applicationDate: null }],
      careerPageUrl: "https://acme.test/careers/1",
    })));
  });

  it("removes a platform draft and saves all new fields empty", async () => {
    const updatePosition = vi.fn().mockResolvedValue(position);
    render(<PositionDetailsRoute positionId="p1" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition }} />);
    await screen.findByLabelText("Overall status");
    fireEvent.click(screen.getByRole("button", { name: "Add platform" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove platform link 1" }));
    expect(screen.queryByLabelText("Platform name 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updatePosition).toHaveBeenCalledWith("p1", expect.objectContaining({ jobPlatformLinks: [], careerPageUrl: null })));
  });

  it("shows a remote company logo and falls back when it fails", async () => {
    render(<PositionDetailsRoute positionId="p1" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue({ ...position, company: { ...position.company, logoUrl: "https://example.test/logo.png" } }), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() }} />);
    await screen.findByText("Engineer");
    const image = document.querySelector("img") as HTMLImageElement;
    fireEvent.error(image);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("edits overall status and adopts the authoritative advanced response", async () => {
    const updatePosition = vi.fn().mockResolvedValue({ ...position, status: "applied" });
    render(<PositionDetailsRoute positionId="p1" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue({ ...position, status: "saved" }), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition }} />);
    const status = await screen.findByLabelText("Overall status");
    fireEvent.change(status, { target: { value: "saved" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updatePosition).toHaveBeenCalledWith("p1", expect.objectContaining({ status: "saved" })));
    await waitFor(() => expect(screen.getByLabelText("Overall status")).toHaveValue("applied"));
  });

  it("places overall status definitions beside the detail selector", async () => {
    render(<PositionDetailsRoute positionId="p1" onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() }} />);
    await screen.findByLabelText("Overall status");
    expect(screen.getByRole("button", { name: "Overall status definitions" })).toBeInTheDocument();
  });

  it("places the submitted resume on Application and not Readiness", async () => {
    const sharedApi = { getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() };
    const application = render(<PositionDetailsRoute positionId="p1" section="application" onBack={() => undefined} api={sharedApi} />);
    expect(await screen.findByRole("heading", { name: "Submitted resume" })).toBeInTheDocument();
    application.unmount();
    render(<PositionDetailsRoute positionId="p1" section="readiness" onBack={() => undefined} api={sharedApi} />);
    expect(await screen.findByRole("heading", { name: "Readiness" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Submitted resume" })).not.toBeInTheDocument();
  });

  it("provides inner-page navigation and expands an empty hiring manager", async () => {
    const onSectionChange = vi.fn();
    render(<PositionDetailsRoute positionId="p1" section="role-details" onSectionChange={onSectionChange} onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue({ ...position, hiringManager: { name: "", phone: "", position: "" } }), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() }} />);
    await screen.findByRole("navigation", { name: "Position sections" });
    expect(screen.getByRole("heading", { name: "Role details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Application" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Questions" }));
    expect(onSectionChange).toHaveBeenCalledWith("questions");
    expect(screen.getByText("No hiring manager added")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add manager" }));
    expect(screen.getByLabelText("Hiring manager name")).toHaveFocus();
  });

  it("guards inner-page navigation and discards confirmed position edits", async () => {
    const onSectionChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<PositionDetailsRoute positionId="p1" section="application" onSectionChange={onSectionChange} onBack={() => undefined} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() }} />);
    const status = await screen.findByLabelText("Overall status");
    fireEvent.change(status, { target: { value: "saved" } });
    fireEvent.click(screen.getByRole("button", { name: "Role details" }));
    expect(onSectionChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Role details" }));
    expect(onSectionChange).toHaveBeenCalledWith("role-details");
    await waitFor(() => expect(status).toHaveValue("applied"));
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("renders only the selected preparation page and guards Back for a dirty question", async () => {
    const onBack = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PositionDetailsRoute positionId="p1" section="questions" onBack={onBack} api={{ getPosition: vi.fn().mockResolvedValue(position), getReferenceData: vi.fn().mockResolvedValue(referenceData), updatePosition: vi.fn() }} />);
    await screen.findByRole("heading", { name: "Questions" });
    expect(screen.queryByRole("heading", { name: "Readiness" })).not.toBeInTheDocument();
    expect(screen.queryByText("Job description")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    fireEvent.change(screen.getByLabelText("Question title"), { target: { value: "Draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to positions" }));
    expect(onBack).not.toHaveBeenCalled();
  });
});
