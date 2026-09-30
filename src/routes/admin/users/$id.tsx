import { createFileRoute } from "@tanstack/react-router";
import AdminUserDetail from "@/pages/AdminUserDetail";

export const Route = createFileRoute("/admin/users/$id")({
  component: AdminUserDetail,
});
