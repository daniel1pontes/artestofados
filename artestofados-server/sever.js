require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatbotRoutes = require('./src/routes/chatbot');
const osRoutes = require('./src/routes/os');
const calendarRoutes = require('./src/routes/calendar');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/chatbot', chatbotRoutes);
app.use('/api/os', osRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;