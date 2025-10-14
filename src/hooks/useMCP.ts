import { useCallback, useEffect, useState } from "react";

type MCPService = {
  id: string;
  name: string;
  status: "active" | "idle" | "processing" | "error";
  description: string;
  successRate: number;
  queries: number;
};

const DEFAULT_SERVICES: MCPService[] = [
  {
    id: "context-agent",
    name: "Context Agent",
    status: "active",
    description: "Analisa notas recentes e sugere contexto estratégico.",
    successRate: 92,
    queries: 128,
  },
  {
    id: "insight-miner",
    name: "Insight Miner",
    status: "processing",
    description: "Gera insights combinando dados do dashboard e Obsidian.",
    successRate: 88,
    queries: 94,
  },
  {
    id: "project-sync",
    name: "Project Sync",
    status: "idle",
    description: "Mantém os projetos alinhados com notas e decisões.",
    successRate: 76,
    queries: 57,
  },
  {
    id: "risk-watcher",
    name: "Risk Watcher",
    status: "active",
    description: "Identifica riscos emergentes nos fluxos de informações.",
    successRate: 81,
    queries: 72,
  },
];

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const useMCP = () => {
  const [services, setServices] = useState<MCPService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      setServices(DEFAULT_SERVICES);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, []);

  const updateServiceStats = useCallback((serviceId: string) => {
    setServices((prev) =>
      prev.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              queries: service.queries + 1,
              successRate: Math.min(
                100,
                service.successRate + Math.random() * 1.5 - 0.5
              ),
              status: "processing",
            }
          : service
      )
    );

    setTimeout(() => {
      setServices((prev) =>
        prev.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                status: "active",
              }
            : service
        )
      );
    }, 600);
  }, []);

  const queryService = useCallback(
    async (serviceId: string, query: string) => {
      updateServiceStats(serviceId);
      await delay(500 + Math.random() * 400);

      const responseText = `Simulated response from ${serviceId} for prompt: "${query}".`;

      return {
        prompt: query,
        output: responseText,
        generatedAt: new Date().toISOString(),
      };
    },
    [updateServiceStats]
  );

  const queryAllServices = useCallback(
    async (query: string) => {
      const responses = await Promise.all(
        services.map(async (service) => ({
          serviceId: service.id,
          serviceName: service.name,
          success: true,
          response: await queryService(service.id, query),
        }))
      );

      return {
        responses,
        queriedAt: new Date().toISOString(),
      };
    },
    [queryService, services]
  );

  return {
    services,
    loading,
    queryService,
    queryAllServices,
  };
};
