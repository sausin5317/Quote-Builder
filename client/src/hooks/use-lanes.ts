import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useLanes(clientId?: number | null) {
  return useQuery({
    queryKey: clientId ? ['/api/lanes/client', clientId] : [api.lanes.list.path],
    queryFn: async () => {
      const url = clientId
        ? buildUrl(api.lanes.listByClient.path, { clientId })
        : api.lanes.list.path;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lanes");
      return api.lanes.list.responses[200].parse(await res.json());
    },
  });
}

export function useLane(id: number | null) {
  return useQuery({
    queryKey: [api.lanes.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.lanes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch lane");
      return api.lanes.get.responses[200].parse(await res.json());
    },
  });
}

export function useImportLanes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.lanes.bulkUpload.path, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import lanes");
      }

      return res.json() as Promise<{ count: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.lanes.list.path] });
    }
  });
}
