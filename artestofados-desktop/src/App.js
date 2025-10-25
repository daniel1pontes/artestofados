import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Chatbot from './pages/Chatbot';
import GerarOS from './pages/GerarOS';
import BancoOS from './pages/BancoOS';
import './styles/global.css';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/chatbot" replace />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/gerar-os" element={<GerarOS />} />
            <Route path="/banco-os" element={<BancoOS />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;