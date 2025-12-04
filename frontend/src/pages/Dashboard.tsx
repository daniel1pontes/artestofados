import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Link } from "react-router-dom";
import { CalendarDays, FileText } from "lucide-react";

interface DashboardStats {
  appointmentsToday: number;
  appointmentsThisWeek: number;
  totalOS: number;
}

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  type: "ONLINE" | "IN_STORE";
  start: string;
  end: string;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const [appointmentsToday, appointmentsThisWeek, totalOS] =
        await Promise.all([
          api
            .get(
              `/appointments?week=${Math.ceil(
                (today.getTime() - weekStart.getTime()) /
                  (7 * 24 * 60 * 60 * 1000)
              )}`
            )
            .then(
              (res) =>
                res.data.filter((apt: any) => {
                  const aptDate = new Date(apt.start);
                  return aptDate.toDateString() === today.toDateString();
                }).length
            ),
          api.get("/appointments").then((res) => res.data.length),
          api.get("/os").then((res) => res.data.os?.length || 0),
        ]);

      return {
        appointmentsToday,
        appointmentsThisWeek,
        totalOS,
      };
    },
  });

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery<
    Appointment[]
  >({
    queryKey: ["week-appointments"],
    queryFn: async () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const res = await api.get("/appointments", {
        params: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
        },
      });

      return res.data;
    },
  });

  const statsCards = [
    {
      title: "Agendamentos Hoje",
      value: stats?.appointmentsToday || 0,
      icon: CalendarDays,
      color: "bg-blue-500",
    },
    {
      title: "Agendamentos esta Semana",
      value: stats?.appointmentsThisWeek || 0,
      icon: CalendarDays,
      color: "bg-green-500",
    },
    {
      title: "Total de OS",
      value: stats?.totalOS || 0,
      icon: FileText,
      color: "bg-purple-500",
    },
  ];

  // Daily Calendar Component
  const DailyCalendar = ({ appointments }: { appointments: Appointment[] }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate time slots from 8:00 to 18:00
    const timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    }

    // Filter appointments for today only
    const todayAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.start);
      return aptDate.toDateString() === today.toDateString();
    });

    // Group appointments by time
    const appointmentsByTime = todayAppointments.reduce((acc, apt) => {
      const hour = new Date(apt.start).getHours();
      const timeKey = `${hour.toString().padStart(2, "0")}:00`;

      if (!acc[timeKey]) acc[timeKey] = [];
      acc[timeKey].push(apt);
      return acc;
    }, {} as Record<string, Appointment[]>);

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header with only time slots */}
          <div className="grid grid-cols-11 gap-0 border-b border-gray-200">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="p-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200"
              >
                {time}
              </div>
            ))}
          </div>

          {/* Appointments row */}
          <div className="grid grid-cols-11 gap-0 min-h-[60px]">
            {/* Time columns */}
            {timeSlots.map((time) => (
              <div key={time} className="border-r border-gray-200 p-0.5">
                {appointmentsByTime[time]?.map((apt) => {
                  const isOnline = apt.type === "ONLINE";
                  return (
                    <div
                      key={apt.id}
                      className={`text-xs p-0.5 rounded mb-0.5 truncate ${
                        isOnline
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                      title={`${apt.clientName} (${
                        isOnline ? "Online" : "Na Loja"
                      })`}
                    >
                      <div className="font-medium truncate text-xs">
                        {apt.clientName}
                      </div>
                      <div className="text-xs opacity-75 leading-tight">
                        {isOnline ? "Online" : "Loja"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {todayAppointments.length === 0 && (
            <div className="text-center py-8 text-gray-500 col-span-11">
              Nenhum agendamento para hoje
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Daily Calendar */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Agendamentos de Hoje
            </h2>
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
        </div>

        <div className="p-6">
          {isLoadingAppointments ? (
            <div className="space-y-4">
              {[...Array(11)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 animate-pulse"
                >
                  <div className="w-20 h-8 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DailyCalendar appointments={appointments || []} />
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <Link
              to="/os/new"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Criar Nova OS
            </Link>
            <Link
              to="/chatbot"
              className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Gerenciar WhatsApp
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informações do Sistema
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Horário de atendimento: 08:00 - 18:00</p>
            <p>• Visitas/Reuniões online: Segunda a Sexta</p>
            <p>• Duração padrão: 1 hora por atendimento</p>
            <p>• Capacidade: 1 online + 1 presencial por horário</p>
            <p>• Sistema integrado com Google Calendar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
