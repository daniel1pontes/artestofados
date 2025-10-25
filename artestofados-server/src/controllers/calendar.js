const { createEvent, listAvailableSlots } = require('../config/google-calendar');

class CalendarController {
  async createVisit(req, res) {
    try {
      const { cliente_nome, telefone, data, hora } = req.body;

      if (!cliente_nome || !data || !hora) {
        return res.status(400).json({
          success: false,
          message: 'Dados obrigatórios não fornecidos'
        });
      }

      const startDateTime = new Date(`${data}T${hora}:00`);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      const summary = `Visita - ${cliente_nome}`;
      const description = `Reunião com cliente\nNome: ${cliente_nome}\nTelefone: ${telefone || 'Não informado'}`;

      const event = await createEvent(
        summary,
        description,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      res.json({
        success: true,
        message: 'Visita agendada com sucesso',
        event: {
          id: event.id,
          summary: event.summary,
          start: event.start,
          end: event.end,
          link: event.htmlLink
        }
      });
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao agendar visita',
        error: error.message
      });
    }
  }

  async getAvailableSlots(req, res) {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'Data não fornecida'
        });
      }

      const events = await listAvailableSlots(date);

      const businessHours = {
        start: 8,
        end: 18
      };

      const bookedSlots = events.map(event => ({
        start: new Date(event.start.dateTime).getHours(),
        end: new Date(event.end.dateTime).getHours()
      }));

      const availableSlots = [];
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        const isBooked = bookedSlots.some(slot => 
          hour >= slot.start && hour < slot.end
        );

        if (!isBooked) {
          availableSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
      }

      res.json({
        success: true,
        date,
        available_slots: availableSlots
      });
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar horários disponíveis',
        error: error.message
      });
    }
  }
}

module.exports = new CalendarController();