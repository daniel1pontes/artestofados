import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chatbot from "./pages/Chatbot";
import OrderService from "./pages/OrderService";
import OrderServiceList from "./pages/OrderServiceList";
import Users from "./pages/Users";
import OrderServiceDetail from "./pages/OrderServiceDetail";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/os" element={<OrderServiceList />} />
        <Route path="/os/new" element={<OrderService />} />
        <Route path="/os/:id" element={<OrderServiceDetail />} />
        <Route path="/os/:id/edit" element={<OrderService />} />
        {user.role === "ADMIN" && <Route path="/users" element={<Users />} />}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
