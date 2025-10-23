import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkflowBuilder from "../WorkflowBuilder";

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("WorkflowBuilder", () => {
  it("renders component palette and canvas", () => {
    render(<WorkflowBuilder />);

    expect(screen.getByText(/components/i)).toBeInTheDocument();
    expect(screen.getAllByText(/trigger/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/actions/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/untitled workflow/i)).toBeInTheDocument();
  });
});
