import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useLanes() {
  return useQuery({
    queryKey: [api.lanes.list.path],
    queryFn: async () => {
      const res = await fetch(api.lanes.list.path, { credentials: "include" });
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
