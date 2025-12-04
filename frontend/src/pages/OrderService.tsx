import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, FileText, Upload, X } from "lucide-react";

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  unitValue: number;
  total: number;
}

interface OrderServiceData {
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  deliveryDeadline: string;
  paymentMethod: string;
  items: OrderItem[];
  discount: number;
  total: number;
}

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export default function OrderService() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState<OrderServiceData>({
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    deliveryDeadline: "",
    paymentMethod: "",
    items: [{ name: "", quantity: 1, unitValue: 0, total: 0 }],
    discount: 0,
    total: 0,
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Load OS data when editing
  useEffect(() => {
    if (isEditing && id) {
      // Limpar arquivos quando entrar em modo de edição
      setUploadedFiles([]);

      const loadOS = async () => {
        try {
          const response = await api.get(`/os/${id}`);
          const data = response.data;

          setFormData({
            clientName: data.clientName,
            clientPhone: data.clientPhone || "",
            clientAddress: data.clientAddress || "",
            deliveryDeadline: data.deliveryDeadline
              ? new Date(data.deliveryDeadline).toISOString().split("T")[0]
              : "",
            paymentMethod: data.paymentMethod || "",
            items: data.items || [
              { name: "", quantity: 1, unitValue: 0, total: 0 },
            ],
            discount: data.discount || 0,
            total: data.total || 0,
          });
        } catch (error) {
          toast.error("Erro ao carregar OS");
          navigate("/os");
        }
      };

      loadOS();
    }
  }, [isEditing, id, navigate]);

  const createMutation = useMutation({
    mutationFn: (data: OrderServiceData) => {
      // Create FormData for multipart upload
      const formData = new FormData();

      // Add all OS data
      Object.entries(data).forEach(([key, value]) => {
        if (key === "items") {
          formData.append("items", JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      });

      // Add images if any (apenas para criação)
      uploadedFiles.forEach((uploadedFile) => {
        formData.append("images", uploadedFile.file);
      });

      // Add generatePDF flag
      formData.append("generatePDF", "true");

      return api.post("/os", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      toast.success("Ordem de Serviço criada com sucesso!");
      navigate("/os");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erro ao criar OS");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrderServiceData) => {
      return api.put(`/os/${id}`, {
        ...data,
        regeneratePDF: false,
      });
    },
    onSuccess: () => {
      toast.success("Ordem de Serviço atualizada com sucesso!");
      navigate("/os");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Erro ao atualizar OS");
    },
  });

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1, unitValue: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newFile: UploadedFile = {
            file,
            preview: event.target?.result as string,
            id: Math.random().toString(36).substr(2, 9),
          };
          setUploadedFiles((prev) => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Apenas imagens são permitidas");
      }
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const calculateSubtotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === "quantity" || field === "unitValue") {
        newItems[index].total =
          newItems[index].quantity * newItems[index].unitValue;
      }

      const subtotal = calculateSubtotal(newItems);
      const total = subtotal * (1 - prev.discount / 100);

      return { ...prev, items: newItems, total };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.clientName ||
      !formData.deliveryDeadline ||
      !formData.paymentMethod
    ) {
      toast.error("Preencha o nome, prazo de entrega e forma de pagamento");
      return;
    }

    const validItems = formData.items.filter(
      (item) => item.name && item.quantity > 0 && item.unitValue > 0
    );

    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item válido");
      return;
    }

    const data = { ...formData, items: validItems };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const subtotal = calculateSubtotal(formData.items);
  const total = subtotal * (1 - formData.discount / 100);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
        </h1>
        <p className="text-gray-600">
          {isEditing
            ? "Atualize os dados da OS"
            : "Preencha os dados para criar uma nova OS"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Data */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Dados do Cliente</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do cliente *
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.clientPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientPhone: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <input
                type="text"
                value={formData.clientAddress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientAddress: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prazo de entrega *
              </label>
              <input
                type="date"
                value={formData.deliveryDeadline}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryDeadline: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de pagamento *
              </label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
                placeholder="Ex: Pagamento em 1+1, sendo 50% no fechamento..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Itens do Serviço
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Item</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 text-sm font-medium text-gray-700 border-b pb-2 px-4">
              <div className="flex-1">Item</div>
              <div className="w-24 text-center">Quantidade</div>
              <div className="w-24 text-right">Valor Unitário</div>
              <div className="w-52"></div>
            </div>

            {formData.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Descrição do item"
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="w-24">
                  <input
                    type="number"
                    placeholder="Qtd"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="w-32">
                  <input
                    type="number"
                    placeholder="Valor Unitário"
                    min="0"
                    step="0.01"
                    value={item.unitValue}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "unitValue",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="w-32 text-right font-medium">
                  R$ {item.total.toFixed(2)}
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Discount and Total */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo Financeiro
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desconto (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.discount}
                onChange={(e) => {
                  const discount = parseFloat(e.target.value) || 0;
                  setFormData((prev) => ({
                    ...prev,
                    discount,
                    total: calculateSubtotal(prev.items) * (1 - discount / 100),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">
                  Desconto ({formData.discount}%):
                </span>
                <span className="font-medium text-red-600">
                  - R$ {((subtotal * formData.discount) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Image Attachments - Apenas para criação */}
        {!isEditing && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Anexos</h2>

            <div className="mb-4">
              <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-gray-400">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Clique para adicionar imagens
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF até 10MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedFiles.map((uploadedFile) => (
                  <div key={uploadedFile.id} className="relative group">
                    <img
                      src={uploadedFile.preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(uploadedFile.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate("/os")}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center space-x-2 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>
              {createMutation.isPending || updateMutation.isPending
                ? "Salvando..."
                : isEditing
                ? "Atualizar OS"
                : "Criar OS"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
