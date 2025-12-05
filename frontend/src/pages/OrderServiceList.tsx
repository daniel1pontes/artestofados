import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, PaginatedResponse } from "../services/api";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

interface OrderService {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  deliveryDeadline?: string;
  total: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  pdfPath?: string;
  createdAt: string;
  createdByUser: {
    name: string;
    email: string;
  };
}

export default function OrderServiceList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [delayFilter, setDelayFilter] = useState<string>("all");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/os/${id}`),
    onSuccess: () => {
      toast.success("Ordem de Serviço excluída com sucesso!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erro ao excluir OS");
    },
  });

  const { data, isLoading, refetch } = useQuery<
    PaginatedResponse<OrderService>
  >({
    queryKey: ["os-list", page, search, delayFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search && { search }),
        ...(delayFilter && delayFilter !== "all" && { delayFilter }),
      });
      const response = await api.get(`/os?${params}`);
      return response.data;
    },
  });

  const handleDownloadPDF = async (id: string, clientName: string) => {
    try {
      const response = await api.get(`/os/${id}/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `os-${id}-${clientName.replace(/\s+/g, "-")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao baixar PDF");
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "-";
    // Extrai apenas a parte da data (YYYY-MM-DD) da string ISO, ignorando timezone
    const dateOnly = dateString.split("T")[0];
    const [year, month, day] = dateOnly.split("-");
    return `${day}/${month}/${year}`;
  };

  const getDaysUntilDeadline = (deliveryDeadline?: string) => {
    if (!deliveryDeadline) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extrai apenas a parte da data (YYYY-MM-DD) da string ISO
    const dateOnly = deliveryDeadline.split("T")[0];
    const [year, month, day] = dateOnly.split("-");
    const deadline = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ordens de Serviço
          </h1>
          <p className="text-gray-600">Gerencie todas as ordens de serviço</p>
        </div>
        <Link
          to="/os/new"
          className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Nova OS</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={delayFilter}
              onChange={(e) => {
                setDelayFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="all">Todas as OS</option>
              <option value="no-delay">Sem atraso</option>
              <option value="delayed">Atrasadas (qualquer)</option>
              <option value="7">Atrasadas mais de 7 dias</option>
              <option value="30">Atrasadas mais de 30 dias</option>
              <option value="60">Atrasadas mais de 60 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        ) : data?.data?.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhuma ordem de serviço encontrada</p>
            <Link
              to="/os/new"
              className="inline-flex items-center space-x-2 mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Primeira OS</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Prazo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Data de Entrega
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Criado por
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.data?.map((os) => (
                    <tr key={os.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm font-medium text-gray-900 max-w-xs break-words">
                          {os.clientName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="text-sm text-gray-900">
                          {os.clientPhone}
                        </div>
                        {os.clientEmail && (
                          <div className="text-sm text-gray-500">
                            {os.clientEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {os.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        {os.status === "COMPLETED" ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-medium text-green-600">
                              Entregue
                            </span>
                          </div>
                        ) : os.deliveryDeadline ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span
                              className={`text-xs font-medium ${
                                getDaysUntilDeadline(os.deliveryDeadline)! < 0
                                  ? "text-red-600 font-bold"
                                  : "text-gray-600"
                              }`}
                            >
                              {(() => {
                                const days = getDaysUntilDeadline(
                                  os.deliveryDeadline
                                );
                                if (days === null) return "";
                                if (days === 0) return "Hoje";
                                if (days === 1) return "Amanhã";
                                if (days === -1) return "Atrasado 1 dia";
                                if (days < -1)
                                  return `Atrasado ${Math.abs(days)} dias`;
                                if (days > 1) return `${days} dias`;
                                return "";
                              })()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            Sem prazo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle">
                        {formatDate(os.deliveryDeadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle">
                        <div className="max-w-xs break-words">
                          {os.createdByUser?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-middle">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/os/${os.id}`}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {os.pdfPath && (
                            <button
                              onClick={() =>
                                handleDownloadPDF(os.id, os.clientName)
                              }
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            to={`/os/${os.id}/edit`}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Tem certeza que deseja excluir esta Ordem de Serviço?"
                                )
                              ) {
                                deleteMutation.mutate(os.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.pagination && data.pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando{" "}
                      <span className="font-medium">
                        {(page - 1) * data.pagination.limit + 1}
                      </span>{" "}
                      a{" "}
                      <span className="font-medium">
                        {Math.min(
                          page * data.pagination.limit,
                          data.pagination.total
                        )}
                      </span>{" "}
                      de{" "}
                      <span className="font-medium">
                        {data.pagination.total}
                      </span>{" "}
                      resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>

                      {[...Array(data.pagination.pages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === i + 1
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === data.pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
