import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ProjectOverview from "../ProjectOverview";
import apiClient from "@/services/apiClient";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getProjects: jest.fn(),
    },
  };
});

const mockedApi = apiClient as unknown as {
  getProjects: jest.Mock;
};

const projectsSample = [
  {
    id: "p1",
    name: "Lançamento Agro SaaS",
    status: "On Track",
    progress: 72,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
    budget: "R$ 250k",
    roi: "+35%",
  },
  {
    id: "p2",
    name: "Migração Multi-tenant",
    status: "At Risk",
    progress: 45,
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "medium",
  },
  {
    id: "p3",
    name: "Hub de Insights",
    status: "Delayed",
    progress: 30,
    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: "high",
  },
];

describe("ProjectOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getProjects.mockResolvedValue(projectsSample);
  });

  it("renderiza cards de projetos e métricas", async () => {
    render(<ProjectOverview />);

    expect(mockedApi.getProjects).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(
        screen.getByText(/Project Overview/i)
      ).toBeInTheDocument()
    );

    expect(
      screen.getByText(/Lançamento Agro SaaS/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/72%/i)).toBeInTheDocument();
  });

  it("aplica filtro de status", async () => {
    render(<ProjectOverview />);

    await screen.findByText(/Project Overview/i);

    fireEvent.change(screen.getByDisplayValue(/Todos os status/i), {
      target: { value: "at_risk" },
    });

    expect(screen.getByText(/Migração Multi-tenant/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Lançamento Agro SaaS/i)
    ).not.toBeInTheDocument();
  });
});

