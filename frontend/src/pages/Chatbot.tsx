import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  Calendar,
  Phone,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  type: "ONLINE" | "IN_STORE";
  start: string;
  end: string;
}

interface WhatsAppStatus {
  id: string;
  status: "CONNECTED" | "DISCONNECTED" | "CONNECTING" | "PAUSED";
  phoneNumber?: string;
  qrCode?: string;
  connectedAt?: string;
}

export default function Chatbot() {
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  // Buscar status do WhatsApp usando useQuery
  const { data: whatsappStatus, refetch: refetchWhatsAppStatus } = useQuery<WhatsAppStatus>({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const response = await api.get("/whatsapp/status");
      return response.data;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos quando estiver conectando
  });

  // Buscar agendamentos usando useQuery
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ["weekly-appointments", currentWeekOffset],
    queryFn: async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(
        today.getDate() - today.getDay() + currentWeekOffset * 7
      );
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const response = await api.get("/appointments", {
        params: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
        },
      });

      return response.data || [];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  useEffect(() => {
    refetchWhatsAppStatus();
  }, [refetchWhatsAppStatus]);

  const toggleBotStatus = async () => {
    try {
      const newStatus = !isBotEnabled;
      await api.post("/whatsapp/toggle", { enabled: newStatus });
      setIsBotEnabled(newStatus);
      toast.success(`Bot ${newStatus ? "ativado" : "desativado"} com sucesso`);
      refetchWhatsAppStatus();
    } catch (error: any) {
      console.error("Error toggling bot:", error);
      toast.error("Erro ao alterar status do bot");
    }
  };

  const connectWhatsApp = async () => {
    try {
      setIsConnecting(true);
      const response = await api.post("/whatsapp/connect");

      toast.success("QR Code gerado com sucesso");
      setIsConnecting(false);

      // Refetch do status para atualizar com o QR Code
      refetchWhatsAppStatus();

      // Iniciar polling para verificar status da conexão
      const pollInterval = setInterval(async () => {
        try {
          const result = await refetchWhatsAppStatus();
          const currentStatus = result.data;
          
          // Se conectou, para o polling
          if (currentStatus?.status === "CONNECTED") {
            clearInterval(pollInterval);
            toast.success("WhatsApp conectado com sucesso!");
            setIsConnecting(false);
          }
        } catch (error) {
          console.error("Erro ao verificar status:", error);
        }
      }, 2000); // Verificar a cada 2 segundos

      // Parar polling após 60 segundos (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsConnecting(false);
      }, 60000);
    } catch (error: any) {
      setIsConnecting(false);
      console.error("Error connecting WhatsApp:", error);
      toast.error("Erro ao conectar WhatsApp");
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      await api.post("/whatsapp/disconnect");

      toast.success("WhatsApp desconectado e sessão limpa");
      
      // Refetch do status para atualizar
      refetchWhatsAppStatus();
    } catch (error: any) {
      console.error("Error disconnecting WhatsApp:", error);
      toast.error("Erro ao desconectar WhatsApp");
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWeekDays = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + currentWeekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekOffset((prev) =>
      direction === "next" ? prev + 1 : prev - 1
    );
  };

  const getWeekLabel = () => {
    if (currentWeekOffset === 0) {
      return "Esta Semana";
    } else if (currentWeekOffset === 1) {
      return "Próxima Semana";
    } else if (currentWeekOffset === -1) {
      return "Semana Passada";
    } else {
      return `Semana ${currentWeekOffset > 0 ? "+" : ""}${currentWeekOffset}`;
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.start);
      // Normalizar ambas as datas para o mesmo timezone (local) antes de comparar
      const aptDateNormalized = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
      const dayNormalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      return aptDateNormalized.getTime() === dayNormalized.getTime();
    });
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp Control Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Status WhatsApp
            </h2>
            <Phone className="h-5 w-5 text-gray-600" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conexão</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  whatsappStatus?.status === "CONNECTED"
                    ? "bg-green-100 text-green-700"
                    : whatsappStatus?.status === "CONNECTING"
                    ? "bg-yellow-100 text-yellow-700"
                    : whatsappStatus?.status === "PAUSED"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {whatsappStatus?.status === "CONNECTED"
                  ? "Conectado"
                  : whatsappStatus?.status === "CONNECTING"
                  ? "Conectando..."
                  : whatsappStatus?.status === "PAUSED"
                  ? "QR Code"
                  : "Desconectado"}
              </span>
            </div>

            {whatsappStatus?.phoneNumber && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Número</span>
                <span className="text-sm font-medium">
                  {whatsappStatus.phoneNumber}
                </span>
              </div>
            )}

            {whatsappStatus?.connectedAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Conectado em</span>
                <span className="text-sm font-medium">
                  {new Date(whatsappStatus.connectedAt).toLocaleString("pt-BR")}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {whatsappStatus?.status === "CONNECTED" ? (
                <>
                  <button
                    onClick={disconnectWhatsApp}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors text-sm"
                  >
                    Desconectar WhatsApp
                  </button>
                  <button
                    onClick={toggleBotStatus}
                    className={`flex-1 px-3 py-2 rounded-md transition-colors text-sm ${
                      isBotEnabled
                        ? "bg-gray-500 text-white hover:bg-gray-600"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {isBotEnabled ? "Pausar" : "Retomar"}
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWhatsApp}
                  disabled={isConnecting}
                  className="w-full bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    "Conectar"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        {isConnecting && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">QR Code</h2>
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <div className="text-center">
              <div className="bg-gray-100 p-8 rounded-lg mb-4">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-600 text-sm">Gerando QR Code...</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Por favor, aguarde enquanto geramos seu QR Code
              </p>
            </div>
          </div>
        )}

        {whatsappStatus?.status === "PAUSED" &&
          whatsappStatus.qrCode &&
          !isConnecting && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">QR Code</h2>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="text-center">
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <img
                    src={`data:image/png;base64,${whatsappStatus.qrCode}`}
                    alt="QR Code WhatsApp"
                    className="mx-auto max-w-[200px]"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Escaneie o QR Code com o WhatsApp para conectar
                </p>
              </div>
            </div>
          )}
      </div>

      {/* Weekly Calendar */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Agendamentos da Semana
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateWeek("prev")}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Semana anterior"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => navigateWeek("next")}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Próxima semana"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">{getWeekLabel()}</span>
              <span>
                {getWeekDays()[0].toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                -{" "}
                {getWeekDays()[6].toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Hoje
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoadingAppointments ? (
            <div className="grid grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded-lg mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-4">
              {getWeekDays().map((day, index) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday =
                  day.toDateString() === new Date().toDateString();

                return (
                  <div key={index} className="text-center">
                    <div
                      className={`text-sm font-medium mb-2 p-2 rounded-lg ${
                        isToday ? "bg-blue-100 text-blue-700" : "text-gray-600"
                      }`}
                    >
                      {day.toLocaleDateString("pt-BR", { weekday: "short" })}
                      <div className="text-lg">{day.getDate()}</div>
                    </div>

                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className={`text-xs p-1 rounded truncate ${
                            apt.type === "ONLINE"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                          title={`${apt.clientName} - ${formatTime(apt.start)}`}
                        >
                          <div className="font-medium truncate">
                            {apt.clientName}
                          </div>
                          <div className="text-xs opacity-75">
                            {formatTime(apt.start)}
                          </div>
                        </div>
                      ))}

                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 p-1">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}

                      {dayAppointments.length === 0 && (
                        <div className="text-xs text-gray-400 py-2">
                          Nenhum agendamento
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
