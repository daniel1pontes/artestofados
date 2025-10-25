import React, { useState, useEffect } from 'react';
import { chatbotService } from '../services/api';
import './Chatbot.css';

const Chatbot = () => {
  const [qrCode, setQrCode] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadSessions();
      const interval = setInterval(loadSessions, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const checkStatus = async () => {
    try {
      const { data } = await chatbotService.getStatus();
      setIsConnected(data.status.isReady);
      setIsPaused(data.status.isPaused);
      
      if (!data.status.isReady && data.status.qrCode) {
        setQrCode(data.status.qrCode);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await chatbotService.connect();
      setTimeout(checkQRCode, 2000);
    } catch (err) {
      setError('Erro ao conectar WhatsApp');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkQRCode = async () => {
    try {
      const { data } = await chatbotService.getQR();
      if (data.qrCode) {
        setQrCode(data.qrCode);
      }
      if (data.isReady) {
        setIsConnected(true);
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao obter QR Code:', err);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Deseja realmente desconectar o WhatsApp?')) {
      setLoading(true);
      try {
        await chatbotService.disconnect();
        setIsConnected(false);
        setQrCode(null);
        setSessions([]);
      } catch (err) {
        setError('Erro ao desconectar');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      await chatbotService.pause();
      setIsPaused(true);
    } catch (err) {
      setError('Erro ao pausar atendimento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    try {
      await chatbotService.resume();
      setIsPaused(false);
    } catch (err) {
      setError('Erro ao retomar atendimento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data } = await chatbotService.getSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    }
  };

  return (
    <div className="chatbot-page">
      <div className="page-header">
        <h1>Chatbot WhatsApp</h1>
        <p>Gerencie o atendimento automático via WhatsApp</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="connection-section">
        <div className="connection-card">
          <h2>Status da Conexão</h2>
          
          <div className="status-indicator">
            <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
            {isPaused && <span className="paused-badge">Pausado</span>}
          </div>

          {!isConnected && !qrCode && (
            <button 
              className="btn btn-primary" 
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
          )}

          {qrCode && (
            <div className="qr-code-section">
              <p>Escaneie o QR Code com seu WhatsApp:</p>
              <img src={qrCode} alt="QR Code" className="qr-code" />
              <p className="qr-instruction">
                Abra o WhatsApp → Menu → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}

          {isConnected && (
            <div className="connection-actions">
              {!isPaused ? (
                <button 
                  className="btn btn-warning" 
                  onClick={handlePause}
                  disabled={loading}
                >
                  ⏸️ Pausar Atendimento
                </button>
              ) : (
                <button 
                  className="btn btn-success" 
                  onClick={handleResume}
                  disabled={loading}
                >
                  ▶️ Retomar Atendimento
                </button>
              )}
              
              <button 
                className="btn btn-danger" 
                onClick={handleDisconnect}
                disabled={loading}
              >
                🔌 Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="sessions-section">
          <h2>Atendimentos Ativos</h2>
          
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum atendimento ativo no momento</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <span className="session-phone">📱 {session.telefone}</span>
                    <span className="session-date">
                      {new Date(session.updated_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="session-body">
                    <div className="session-info">
                      <span className="info-label">Cliente:</span>
                      <span className="info-value">{session.cliente_nome || 'Não identificado'}</span>
                    </div>
                    <div className="session-info">
                      <span className="info-label">Tipo de Serviço:</span>
                      <span className="info-value">
                        {session.tipo_servico ? (
                          <span className={`badge badge-${session.tipo_servico}`}>
                            {session.tipo_servico === 'fabricacao' ? '🛠️ Fabricação' : '🔧 Reforma'}
                          </span>
                        ) : (
                          'Não definido'
                        )}
                      </span>
                    </div>
                    {session.tipo_estofado && (
                      <div className="session-info">
                        <span className="info-label">Tipo:</span>
                        <span className="info-value">{session.tipo_estofado}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Chatbot;