import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StrategicInsights from "../StrategicInsights";
import apiClient from "@/services/apiClient";

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getInsights: jest.fn(),
      refreshInsights: jest.fn(),
    },
  };
});

jest.mock("../EnhancedAIInsightCard", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "insight-card" }, title),
}));

const mockedApi = apiClient as unknown as {
  getInsights: jest.Mock;
  refreshInsights: jest.Mock;
};

describe("StrategicInsights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultInsights = [
    {
      id: "insight-1",
      title: "Expansão Agro SaaS",
      description: "Recomenda ampliar atuação em cooperativas regionais.",
      confidence: 0.88,
      urgency: "high",
      relatedNotes: ["INSIGHTS/AGRO.md"],
      createdAt: "2025-02-14T12:00:00Z",
    },
  ];

  const renderBoard = async () => {
    mockedApi.getInsights.mockResolvedValue(defaultInsights);
    const result = render(React.createElement(StrategicInsights));
    await waitFor(() =>
      expect(screen.getByTestId("insight-card")).toBeInTheDocument()
    );
    return result;
  };

  it("exibe os insights estratégicos provenientes da API", async () => {
    await renderBoard();
    expect(screen.getByText(/Expansão Agro SaaS/i)).toBeInTheDocument();
  });

  it("permite filtrar insights pelo campo de busca", async () => {
    await renderBoard();
    const searchInput = screen.getByPlaceholderText(/Buscar por título/i);
    fireEvent.change(searchInput, {
      target: { value: "Finanças" },
    });
    await waitFor(() =>
      expect(screen.queryByTestId("insight-card")).not.toBeInTheDocument()
    );
    fireEvent.change(searchInput, {
      target: { value: "Agro" },
    });
    await waitFor(() =>
      expect(screen.getByTestId("insight-card")).toHaveTextContent(
        "Expansão Agro SaaS"
      )
    );
  });
});
