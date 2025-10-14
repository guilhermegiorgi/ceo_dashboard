import { useCallback, useEffect, useState } from "react";
import { useAPI } from "./useAPI";

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  team_size: number;
  budget: string;
  deadline: string;
  priority: string;
  roi: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

type CreateProjectPayload = Partial<Project> & {
  name: string;
  budget: string;
  deadline: string;
};

export const useProjects = () => {
  const api = useAPI();
  const [data, setData] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projects = await api.request<Project[]>("/api/projects");
      setData(projects);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(
    async (payload: CreateProjectPayload) => {
      await api.request("/api/projects", {
        method: "POST",
        body: payload,
      });
      await fetchProjects();
    },
    [api, fetchProjects]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      await api.request(`/api/projects/${id}`, {
        method: "PUT",
        body: updates,
      });
      await fetchProjects();
    },
    [api, fetchProjects]
  );

  return {
    data,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
  };
};
