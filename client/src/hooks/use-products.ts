import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export function useProducts() {
    return useQuery<Product[]>({
        queryKey: ["/api/products"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/products");
            return res.json();
        },
    });
}

export function useCreateProduct() {
    return useMutation({
        mutationFn: async (data: { name: string; category?: string }) => {
            const res = await apiRequest("POST", "/api/products", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
    });
}

export function useDeleteProduct() {
    return useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/products/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        },
    });
}
