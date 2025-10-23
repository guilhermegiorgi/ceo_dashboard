import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SettingsModal from "../SettingsModal";
import apiClient, {
  BrainCloudSettings,
  defaultBrainCloudSettings,
} from "@/services/apiClient";
import toast from "react-hot-toast";

jest.mock("@/services/apiClient", () => {
  const actual = jest.requireActual("@/services/apiClient");
  return {
    __esModule: true,
    ...actual,
    default: {
      getBrainCloudSettings: jest.fn(),
      updateBrainCloudSettings: jest.fn(),
      testBrainCloudConnection: jest.fn(),
    },
  };
});

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  getBrainCloudSettings: jest.Mock<
    Promise<BrainCloudSettings>,
    []
  >;
  updateBrainCloudSettings: jest.Mock<
    Promise<BrainCloudSettings>,
    [BrainCloudSettings]
  >;
  testBrainCloudConnection: jest.Mock<
    Promise<{ success: boolean; mode: "rest" | "mcp" }>,
    [BrainCloudSettings, "rest" | "mcp"]
  >;
};

const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

describe("SettingsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

const renderModal = (
  props?: Partial<React.ComponentProps<typeof SettingsModal>>
) =>
  render(
    React.createElement(SettingsModal, {
      open: true,
      onClose: jest.fn(),
      ...props,
    })
  );

  it("carrega e apresenta as configurações do Brain Cloud", async () => {
    mockedApi.getBrainCloudSettings.mockResolvedValue({
      ...defaultBrainCloudSettings,
      baseUrl: "https://braincloud.example.com",
    });
    renderModal();

    expect(mockedApi.getBrainCloudSettings).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(
        screen.getByDisplayValue("https://braincloud.example.com")
      ).toBeInTheDocument()
    );
  });

  it("permite editar e salvar configurações", async () => {
    mockedApi.getBrainCloudSettings.mockResolvedValue(
      defaultBrainCloudSettings
    );
    mockedApi.updateBrainCloudSettings.mockResolvedValue({
      ...defaultBrainCloudSettings,
      baseUrl: "https://new-endpoint.dev",
    });

    renderModal();

    const baseUrlInput = await screen.findByLabelText(/Base URL/i);
    fireEvent.change(baseUrlInput, { target: { value: "https://new-endpoint.dev" } });

    const saveButton = screen.getByRole("button", {
      name: /salvar alterações/i,
    });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() =>
      expect(mockedApi.updateBrainCloudSettings).toHaveBeenCalled()
    );
    expect(mockedApi.updateBrainCloudSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://new-endpoint.dev",
      })
    );
    expect(mockedToast.success).toHaveBeenCalled();
  });

  it("testa conexão REST com sucesso", async () => {
    mockedApi.getBrainCloudSettings.mockResolvedValue(
      defaultBrainCloudSettings
    );
    mockedApi.testBrainCloudConnection.mockResolvedValue({
      success: true,
      mode: "rest",
    });

    renderModal();

    const testButton = await screen.findByRole("button", { name: /testar rest/i });
    fireEvent.click(testButton);

    await waitFor(() =>
      expect(mockedApi.testBrainCloudConnection).toHaveBeenCalledTimes(1)
    );
    expect(mockedToast.success).toHaveBeenCalled();
  });
});
