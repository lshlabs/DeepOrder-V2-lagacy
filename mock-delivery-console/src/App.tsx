import { Navigate, Route, Routes } from "react-router-dom"
import { ConsoleLayout } from "@/layouts/ConsoleLayout"
import ApiManagementPage from "@/routes/ApiManagementPage"
import MenuManagementPage from "@/routes/MenuManagementPage"
import OrdersPage from "@/routes/OrdersPage"
import UserApprovalPage from "@/routes/UserApprovalPage"

export default function App() {
  return (
    <Routes>
      <Route element={<ConsoleLayout />}>
        <Route index element={<MenuManagementPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="api-management" element={<ApiManagementPage />} />
        <Route path="user-approval" element={<UserApprovalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
