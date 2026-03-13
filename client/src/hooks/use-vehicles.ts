import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Vehicle } from "@shared/schema";

export function useVehicles() {
    return useQuery<Vehicle[]>({
        queryKey: ["/api/vehicles"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/vehicles");
            return res.json();
        },
    });
}

export function useCreateVehicle() {
    return useMutation({
        mutationFn: async (data: { name: string; category?: string }) => {
            const res = await apiRequest("POST", "/api/vehicles", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        },
    });
}

export function useDeleteVehicle() {
    return useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/vehicles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        },
    });
}
