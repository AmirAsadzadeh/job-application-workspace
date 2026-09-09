import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionCreateRoute } from "./PositionCreateRoute";

const referenceData = {
  version: 1 as const,
  departments: [
    { id: "eng", name: "Engineering", teams: [{ id: "web", name: "Web" }] },
    { id: "product", name: "Product", teams: [{ id: "design", name: "Design" }] },
  ],
  locations: [{ id: "remote", name: "Remote" }],
};

function renderRoute(createPosition = vi.fn().mockResolvedValue({ id: "created" })) {
  const onCreated = vi.fn();
  render(<PositionCreateRoute onBack={() => undefined} onCreated={onCreated} api={{ getReferenceData: vi.fn().mockResolvedValue(referenceData), createPosition }} />);
  return { createPosition, onCreated };
}

async function completeRequiredFields() {
  await screen.findByText("Basics");
  fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: "Acme" } });
  fireEvent.change(screen.getByLabelText(/Position name/), { target: { value: "Frontend Engineer" } });
  fireEvent.change(screen.getByLabelText(/Work mode/), { target: { value: "remote" } });
  fireEvent.change(screen.getByLabelText(/Seniority/), { target: { value: "Senior" } });
}

describe("PositionCreateRoute", () => {
  it("shows disabled unavailable values when reference lists are empty", async () => {
    render(<PositionCreateRoute onBack={vi.fn()} onCreated={vi.fn()} api={{ getReferenceData: vi.fn().mockResolvedValue({ version: 1, departments: [], locations: [] }), createPosition: vi.fn() }} />);
    await screen.findByText("Basics");
    expect(screen.getByLabelText("Department")).toHaveTextContent("No options available");
    expect(screen.getByLabelText("Department").querySelector('option[value=""]')).toBeDisabled();
    expect(screen.getByLabelText("Team")).toHaveTextContent("No options available");
    expect(screen.getByLabelText("Location")).toHaveTextContent("No options available");
  });

  it("creates a minimum position with approved defaults", async () => {
    const { createPosition, onCreated } = renderRoute();
    await completeRequiredFields();
    expect(screen.getByDisplayValue("Full-time")).toBeInTheDocument();
    expect(screen.getAllByText("Saved").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole("button", { name: "Create position" }));
    await waitFor(() => expect(createPosition).toHaveBeenCalledWith(expect.objectContaining({ companyName: "Acme", title: "Frontend Engineer", employmentType: "full_time", salary: null })));
    expect(createPosition.mock.calls[0][0]).not.toHaveProperty("status");
    expect(onCreated).toHaveBeenCalled();
  });

  it("submits channel metadata while keeping overall status repository-controlled", async () => {
    const { createPosition } = renderRoute();
    await completeRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Add platform" }));
    fireEvent.change(screen.getByLabelText("Platform name 1"), { target: { value: "LinkedIn" } });
    fireEvent.change(screen.getByLabelText("Job posting URL 1"), { target: { value: "https://example.com/jobs/1" } });
    fireEvent.change(screen.getByLabelText("Application status 1"), { target: { value: "viewed" } });
    fireEvent.click(screen.getByRole("button", { name: "Create position" }));
    await waitFor(() => expect(createPosition).toHaveBeenCalledWith(expect.objectContaining({
      jobPlatformLinks: [expect.objectContaining({ platformName: "LinkedIn", applicationStatus: "viewed" })],
      careerPageApplicationStatus: null,
      careerPageApplicationDate: null,
    })));
    expect(createPosition.mock.calls[0][0]).not.toHaveProperty("status");
  });

  it("keeps conditional manager and salary errors beside their groups", async () => {
    const { createPosition } = renderRoute();
    await completeRequiredFields();
    fireEvent.change(screen.getByLabelText("Hiring manager name"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("Salary minimum"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Salary maximum"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Salary currency"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Create position" }));
    expect(await screen.findByText("Complete all hiring manager fields.")).toBeInTheDocument();
    expect(screen.getByText("Salary maximum must not be below minimum.")).toBeInTheDocument();
    expect(createPosition).not.toHaveBeenCalled();
  });

  it("rejects a salary with a missing numeric boundary", async () => {
    const { createPosition } = renderRoute();
    await completeRequiredFields();
    fireEvent.change(screen.getByLabelText("Salary maximum"), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText("Salary currency"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Create position" }));
    expect(await screen.findByText("Complete all salary fields.")).toBeInTheDocument();
    expect(createPosition).not.toHaveBeenCalled();
  });

  it("submits optional assignment, manager, salary, logo, and publication details", async () => {
    const { createPosition } = renderRoute();
    await completeRequiredFields();
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "eng" } });
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "web" } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "remote" } });
    fireEvent.change(screen.getByLabelText("Employment type"), { target: { value: "contract" } });
    fireEvent.change(screen.getByLabelText("Hiring manager name"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("Hiring manager phone"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Hiring manager position"), { target: { value: "Director" } });
    fireEvent.change(screen.getByLabelText("Salary minimum"), { target: { value: "4000" } });
    fireEvent.change(screen.getByLabelText("Salary maximum"), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText("Salary currency"), { target: { value: "eur" } });
    fireEvent.click(screen.getByRole("button", { name: "Image URL" }));
    fireEvent.change(screen.getByLabelText("Company logo image URL"), { target: { value: "https://example.test/logo.png" } });
    fireEvent.click(screen.getByRole("button", { name: "Add platform" }));
    fireEvent.change(screen.getByLabelText("Platform name 1"), { target: { value: "LinkedIn" } });
    fireEvent.change(screen.getByLabelText("Job posting URL 1"), { target: { value: "https://linkedin.com/jobs/1" } });
    fireEvent.change(screen.getByLabelText("Organization career-page URL"), { target: { value: "https://acme.test/careers/1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create position" }));
    await waitFor(() => expect(createPosition).toHaveBeenCalledWith(expect.objectContaining({
      companyLogo: { kind: "remote", url: "https://example.test/logo.png" },
      departmentId: "eng",
      teamId: "web",
      locationId: "remote",
      employmentType: "contract",
      hiringManager: { name: "Mina", phone: "123", position: "Director" },
      salary: { min: 4000, max: 6000, currency: "EUR" },
      jobPlatformLinks: [{ platformName: "LinkedIn", url: "https://linkedin.com/jobs/1", applicationStatus: null, applicationDate: null }],
      careerPageUrl: "https://acme.test/careers/1",
    })));
  });

  it("retries reference-data loading", async () => {
    const getReferenceData = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(referenceData);
    render(<PositionCreateRoute onBack={vi.fn()} onCreated={vi.fn()} api={{ getReferenceData, createPosition: vi.fn() }} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Basics")).toBeInTheDocument();
    expect(getReferenceData).toHaveBeenCalledTimes(2);
  });

  it("registers unload protection only after the form becomes dirty", async () => {
    renderRoute();
    await screen.findByText("Basics");
    const untouched = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouched);
    expect(untouched.defaultPrevented).toBe(false);
    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: "Acme" } });
    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it("clears a team when department changes", async () => {
    renderRoute();
    await screen.findByText("Basics");
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "eng" } });
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "web" } });
    expect(screen.getByLabelText("Team")).toHaveValue("web");
    fireEvent.change(screen.getByLabelText("Department"), { target: { value: "product" } });
    expect(screen.getByLabelText("Team")).toHaveValue("");
  });

  it("prevents a second submission and retains values after failure", async () => {
    let rejectRequest!: (error: Error) => void;
    const createPosition = vi.fn(() => new Promise((_, reject) => { rejectRequest = reject; }));
    renderRoute(createPosition);
    await completeRequiredFields();
    const button = screen.getByRole("button", { name: "Create position" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(createPosition).toHaveBeenCalledTimes(1);
    rejectRequest(new Error("disk full"));
    expect(await screen.findByText("Could not create position. Your entries are still here.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Company name/)).toHaveValue("Acme");
  });
});
