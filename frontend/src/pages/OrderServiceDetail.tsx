import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  Edit,
  FileText,
  User,
  Phone,
  MapPin,
  Calendar,
  Trash2,
  Eye,
  X,
} from "lucide-react";

interface OrderService {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  deliveryDeadline?: string;
  paymentMethod?: string;
  total: number;
  discount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    name: string;
    email: string;
  };
  lastEditedByUser?: {
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitValue: number;
    total: number;
  }>;
}

export default function OrderServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [lastPdfPath, setLastPdfPath] = useState<string | null>(null);

  const { data: os, isLoading } = useQuery<OrderService>({
    queryKey: ["os", id],
    queryFn: async () => {
      const response = await api.get(`/os/${id}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/os/${id}`),
    onSuccess: () => {
      toast.success("Ordem de Serviço excluída com sucesso!");
      navigate("/os");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erro ao excluir OS");
    },
  });

  const handleDownloadPDF = async () => {
    if (!os?.pdfPath) return;

    try {
      const response = await api.get(`/os/${id}/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `os-${id}-${os.clientName.replace(/\s+/g, "-")}.pdf`
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

  const handleOpenPdfModal = async () => {
    if (!os?.pdfPath) {
      toast.error("PDF não disponível");
      return;
    }

    try {
      const response = await api.get(`/os/${id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setLastPdfPath(os.pdfPath || null);
      setShowPdfModal(true);
    } catch (error: any) {
      console.error("Erro ao carregar PDF:", error);
      toast.error(error.response?.data?.error || "Erro ao carregar PDF");
    }
  };

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        window.URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Recarregar PDF quando a OS for atualizada e o modal estiver aberto
  useEffect(() => {
    if (showPdfModal && os?.pdfPath && id) {
      // Só recarregar se o pdfPath mudou (PDF foi regenerado)
      if (lastPdfPath && lastPdfPath !== os.pdfPath) {
        const reloadPdf = async () => {
          try {
            // Limpar blob URL antigo
            if (pdfBlobUrl) {
              window.URL.revokeObjectURL(pdfBlobUrl);
            }

            // Buscar novo PDF
            const response = await api.get(`/os/${id}/pdf`, {
              responseType: "blob",
            });

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            setLastPdfPath(os.pdfPath || null);
          } catch (error: any) {
            console.error("Erro ao recarregar PDF:", error);
            toast.error(error.response?.data?.error || "Erro ao recarregar PDF");
          }
        };

        reloadPdf();
      } else if (!lastPdfPath) {
        // Primeira vez que abre o modal, apenas salvar o pdfPath
        setLastPdfPath(os.pdfPath || null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.pdfPath, showPdfModal, id, lastPdfPath]);

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setLastPdfPath(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!os) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Ordem de serviço não encontrada</p>
        <Link
          to="/os"
          className="inline-flex items-center space-x-2 mt-4 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para lista</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/os"
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Ordem de Serviço #{os.id.slice(-8)}
            </h1>
            <p className="text-gray-600">Detalhes completos da OS</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to={`/os/${os.id}/edit`}
            className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            <span>Editar</span>
          </Link>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Tem certeza que deseja excluir esta Ordem de Serviço?"
                )
              ) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="flex items-center space-x-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Dados do Cliente</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <p className="text-gray-900">{os.clientName}</p>
              </div>

              {os.clientPhone && (
                <div>
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <Phone className="h-4 w-4" />
                    <span>Telefone</span>
                  </label>
                  <p className="text-gray-900">{os.clientPhone}</p>
                </div>
              )}

              {os.deliveryDeadline && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prazo de Entrega
                  </label>
                  <p className="text-gray-900">
                    {new Date(os.deliveryDeadline).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              {os.paymentMethod && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <p className="text-gray-900">{os.paymentMethod}</p>
                </div>
              )}

              {os.clientAddress && (
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="h-4 w-4" />
                    <span>Endereço</span>
                  </label>
                  <p className="text-gray-900">{os.clientAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Itens do Serviço
            </h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                      Item
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Quantidade
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Valor Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {os.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 align-top">
                        <div className="max-w-xs break-words">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center align-middle">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right align-middle">
                        R$ {item.unitValue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right align-middle">
                        R$ {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* PDF Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Documento PDF
            </h3>

            <div className="space-y-3">
              <button
                onClick={handleOpenPdfModal}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Visualizar PDF</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resumo Financeiro
            </h3>

            <div className="space-y-3">
              {(() => {
                // Calcular subtotal somando os valores brutos dos itens (quantity * unitValue)
                // Isso garante que o subtotal seja antes de qualquer desconto
                const subtotal = os.items.reduce(
                  (sum, item) => sum + item.quantity * item.unitValue,
                  0
                );
                // Calcular valor do desconto em reais (desconto é percentual)
                const discountValue =
                  os.discount > 0 ? (subtotal * os.discount) / 100 : 0;

                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        R$ {subtotal.toFixed(2)}
                      </span>
                    </div>
                    {os.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Desconto ({os.discount}%):
                        </span>
                        <span className="font-medium text-red-600">
                          - R$ {discountValue.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600">
                          R$ {os.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Linha do Tempo</span>
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Criado em</p>
                <p className="font-medium">
                  {new Date(os.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-gray-500">
                  por {os.createdByUser.name}
                </p>
              </div>

              {os.updatedAt !== os.createdAt && os.lastEditedByUser && (
                <div>
                  <p className="text-sm text-gray-600">Atualizado em</p>
                  <p className="font-medium">
                    {new Date(os.updatedAt).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-gray-500">
                    por {os.lastEditedByUser.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={handleClosePdfModal}
            ></div>

            {/* Modal panel */}
            <div className="relative bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-xl">
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Visualizar PDF - OS #{os.id.slice(-8)}
                </h3>
                <button
                  onClick={handleClosePdfModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal body */}
              <div
                className="p-4 overflow-auto"
                style={{ height: "calc(90vh - 80px)" }}
              >
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    className="w-full h-full border-0"
                    title="PDF Viewer"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
