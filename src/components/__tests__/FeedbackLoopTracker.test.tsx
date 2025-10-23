import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import FeedbackLoopTracker from "../FeedbackLoopTracker";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getFeedbackActions: jest.fn(),
    },
  };
});

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  getFeedbackActions: jest.Mock;
};

const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

const sampleActions = [
  {
    id: "1",
    type: "decision",
    description: "Validar expansão Agro SaaS",
    status: "completed",
    timestamp: new Date().toISOString(),
    impact: "Alto impacto estratégico",
  },
  {
    id: "2",
    type: "insight_validation",
    description: "Revisar hipóteses de churn",
    status: "processing",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    obsidianNote: "INSIGHTS/churn.md",
  },
  {
    id: "3",
    type: "learning_captured",
    description: "Documentar lições do piloto NK",
    status: "pending",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

describe("FeedbackLoopTracker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getFeedbackActions.mockResolvedValue(sampleActions);
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renderiza métricas e timeline após carregar", async () => {
    render(<FeedbackLoopTracker />);

    expect(mockedApi.getFeedbackActions).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(
        screen.getByText(/Feedback Loop Tracker/i)
      ).toBeInTheDocument()
    );

    expect(
      screen.getByText(/Taxa de implementação/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/loops \(3\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Validar expansão Agro SaaS/i)
    ).toBeInTheDocument();
  });

  it("aplica filtro de status", async () => {
    render(<FeedbackLoopTracker />);

    await screen.findByText(/Feedback Loop Tracker/i);

    fireEvent.change(screen.getByDisplayValue(/Todos os status/i), {
      target: { value: "completed" },
    });

    expect(
      await screen.findByText(/Validar expansão Agro SaaS/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Revisar hipóteses de churn/i)
    ).not.toBeInTheDocument();
  });

  it("copia link da nota para a área de transferência", async () => {
    render(<FeedbackLoopTracker />);

    await screen.findByText(/Revisar hipóteses de churn/i);

    fireEvent.click(screen.getByRole("button", { name: /Copiar nota/i }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "INSIGHTS/churn.md"
      )
    );
    expect(mockedToast.success).toHaveBeenCalled();
  });
});

