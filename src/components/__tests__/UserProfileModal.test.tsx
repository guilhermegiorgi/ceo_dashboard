import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UserProfileModal from "../UserProfileModal";
import apiClient from "@/services/apiClient";
import toast from "react-hot-toast";

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getCurrentUser: jest.fn(),
      logout: jest.fn(),
    },
  };
});

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  getCurrentUser: jest.Mock;
  logout: jest.Mock;
};

const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

const sampleUser = {
  id: "user-1",
  name: "Guilherme Giorgi",
  email: "gui@gg.ai",
  role: "admin",
  status: "active",
  createdAt: "2024-01-10T12:00:00Z",
  lastLoginAt: "2025-02-13T10:00:00Z",
};

describe("UserProfileModal", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getCurrentUser.mockResolvedValue(sampleUser);
    Object.defineProperty(window, "location", {
      value: { href: "", assign: jest.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
  });

  it("exibe dados do usuário carregados da API", async () => {
    render(<UserProfileModal onClose={jest.fn()} />);

    expect(mockedApi.getCurrentUser).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(screen.getByText(sampleUser.name)).toBeInTheDocument()
    );
    expect(screen.getByText(sampleUser.email)).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });

  it("aciona logout limpando tokens e redirecionando", async () => {
    mockedApi.logout.mockResolvedValue({});
    localStorage.setItem("token", "abc");
    localStorage.setItem("refreshToken", "xyz");

    render(<UserProfileModal onClose={jest.fn()} />);
    await screen.findByText(sampleUser.name);

    fireEvent.click(screen.getByRole("button", { name: /sair/i }));

    await waitFor(() =>
      expect(mockedApi.logout).toHaveBeenCalledTimes(1)
    );
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login");
    expect(mockedToast.success).toHaveBeenCalled();
  });

  it("abre configurações ao acionar atalho", async () => {
    const onOpenSettings = jest.fn();
    render(
      <UserProfileModal onClose={jest.fn()} onOpenSettings={onOpenSettings} />
    );

    await screen.findByText(sampleUser.name);

    fireEvent.click(
      screen.getByRole("button", { name: /abrir configurações/i })
    );

    expect(onOpenSettings).toHaveBeenCalled();
  });
});

