import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StrategicSessionPlanner from "../StrategicSessionPlanner";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getSessions: jest.fn(),
      getInsights: jest.fn(),
      createSession: jest.fn(),
      updateSession: jest.fn(),
      scheduleSession: jest.fn(),
    },
  };
});

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  getSessions: jest.Mock;
  getInsights: jest.Mock;
  createSession: jest.Mock;
  updateSession: jest.Mock;
  scheduleSession: jest.Mock;
};

describe("StrategicSessionPlanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultSessions = [
    {
      id: "1",
      title: "Sessão de Alinhamento",
      type: "strategic_alignment",
      description: "Revisar objetivos do trimestre",
      suggested_duration: 90,
      participants: ["CEO", "CTO"],
      preparation_notes: ["Revisar OKRs"],
      expected_outcomes: ["Plano consensual"],
      priority: "high",
      trigger_insight: "Insight piloto Agro",
      scheduled_date: "2025-02-15",
      status: "scheduled",
      created_at: "2025-02-10T12:00:00Z",
      updated_at: "2025-02-10T12:00:00Z",
    },
  ];

  const defaultInsights = [
    {
      id: "insight-1",
      title: "Escalar programa Agro SaaS",
      description: "Existe oportunidade para expandir parcerias regionais.",
      confidence: 0.82,
      urgency: "high",
      relatedNotes: ["INSIGHTS/AGRO.md"],
    },
  ];

  const renderPlanner = async () => {
    mockedApi.getSessions.mockResolvedValue(defaultSessions);
    mockedApi.getInsights.mockResolvedValue(defaultInsights);
    mockedApi.createSession.mockResolvedValue({});
    const result = render(React.createElement(StrategicSessionPlanner));
    await waitFor(() =>
      expect(
        screen.getByText(/Sessão de Alinhamento/i)
      ).toBeInTheDocument()
    );
    return result;
  };

  it("renderiza sessões retornadas pela API", async () => {
    await renderPlanner();
    expect(
      screen.getByText(/Revisar objetivos do trimestre/i)
    ).toBeInTheDocument();
  });

  it("permite criar uma nova sessão estratégica", async () => {
    await renderPlanner();

    fireEvent.click(screen.getByRole("button", { name: /Nova sessão/i }));

    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: "Sessão Piloto" },
    });

    fireEvent.change(screen.getByLabelText(/Objetivo da sessão/i), {
      target: { value: "Mapear dependências do piloto multi-tenant." },
    });

    const saveButton = screen.getByRole("button", { name: /Criar sessão/i });
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(mockedApi.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sessão Piloto",
          suggested_duration: expect.any(Number),
        })
      )
    );
  });
});
