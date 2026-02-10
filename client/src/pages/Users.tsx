import { useQuery, useMutation } from "@tanstack/react-query";
import { User, InsertUser, USER_ROLES } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast"; // Assuming this exists or similar
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, KeyRound, UserPlus } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";

const createUserSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Invalid email"),
    role: z.enum(USER_ROLES),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [iscreateOpen, setIsCreateOpen] = useState(false);
    const [resetUserId, setResetUserId] = useState<number | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: CreateUserFormData) => {
            const res = await apiRequest("POST", "/api/users", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setIsCreateOpen(false);
            toast({ title: "User created successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: "User deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async ({ id, password }: { id: number, password: string }) => {
            await apiRequest("PUT", `/api/users/${id}/password`, { password });
        },
        onSuccess: () => {
            setResetUserId(null);
            toast({ title: "Password updated" });
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
        }
    });

    const form = useForm<CreateUserFormData>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            username: "",
            password: "",
            email: "",
            role: "viewer",
        },
    });

    if (currentUser?.role !== "admin") {
        return <div className="p-8 text-center text-red-500">Unauthorized: Admin access required</div>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">User Management</h1>
                <Dialog open={iscreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <FormProvider {...form}>
                            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Username</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {USER_ROLES.map(role => (
                                                        <SelectItem key={role} value={role}>
                                                            {role.charAt(0).toUpperCase() + role.slice(1)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Creating..." : "Create User"}
                                </Button>
                            </form>
                        </FormProvider>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.username}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            u.role === 'approver' ? 'bg-blue-100 text-blue-800' :
                                                u.role === 'quoter' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </TableCell>
                                <TableCell>{u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "-"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Dialog >
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => setResetUserId(u.id)}>
                                                <KeyRound className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                        {resetUserId === u.id && (
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Reset Password for {u.username}</DialogTitle>
                                                </DialogHeader>
                                                <ResetPasswordForm id={u.id} onSubmit={(pw) => resetPasswordMutation.mutate({ id: u.id, password: pw })} isLoading={resetPasswordMutation.isPending} />
                                            </DialogContent>
                                        )}
                                    </Dialog>

                                    {currentUser?.id !== u.id && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm(`Are you sure you want to delete ${u.username}?`)) {
                                                    deleteMutation.mutate(u.id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function ResetPasswordForm({ id, onSubmit, isLoading }: { id: number, onSubmit: (pw: string) => void, isLoading: boolean }) {
    const [password, setPassword] = useState("");
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 chars" />
            </div>
            <Button className="w-full" onClick={() => onSubmit(password)} disabled={isLoading || password.length < 6}>
                {isLoading ? "Updating..." : "Update Password"}
            </Button>
        </div>
    );
}
