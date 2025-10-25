import React, { useState, useEffect } from 'react';
import { osService } from '../services/api';
import './BancoOS.css';

const BancoOS = () => {
  const [osList, setOsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOS, setSelectedOS] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadOS();
  }, []);

  const loadOS = async () => {
    setLoading(true);
    try {
      const { data } = await osService.list();
      setOsList(data.os || []);
    } catch (err) {
      console.error('Erro ao carregar OS:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const { data } = await osService.getById(id);
      setSelectedOS(data.os);
      setShowModal(true);
    } catch (err) {
      console.error('Erro ao carregar OS:', err);
      alert('Erro ao carregar detalhes da OS');
    }
  };

  const handleDownload = async (id, numeroOS) => {
    setDownloading(id);
    try {
      const response = await osService.downloadPDF(id);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OS_${numeroOS}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      alert('Erro ao baixar PDF da OS');
    } finally {
      setDownloading(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOS(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="banco-os-page">
      <div className="page-header">
        <h1>Banco de Ordens de Serviço</h1>
        <p>Visualize e gerencie todas as ordens de serviço criadas</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Carregando ordens de serviço...</p>
        </div>
      ) : osList.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>Nenhuma OS encontrada</h3>
          <p>Crie sua primeira ordem de serviço na aba "Gerar OS"</p>
        </div>
      ) : (
        <div className="os-grid">
          {osList.map((os) => (
            <div key={os.id} className="os-card">
              <div className="os-card-header">
                <div className="os-number">
                  <span className="number-label">OS #</span>
                  <span className="number-value">{os.numero_os}</span>
                </div>
                <span className={`status-badge status-${os.status}`}>
                  {os.status}
                </span>
              </div>

              <div className="os-card-body">
                <div className="os-info">
                  <span className="info-icon">👤</span>
                  <div className="info-content">
                    <span className="info-label">Cliente</span>
                    <span className="info-value">{os.cliente_nome}</span>
                  </div>
                </div>

                <div className="os-info">
                  <span className="info-icon">📅</span>
                  <div className="info-content">
                    <span className="info-label">Prazo de Entrega</span>
                    <span className="info-value">{formatDate(os.prazo_entrega)}</span>
                  </div>
                </div>

                <div className="os-info">
                  <span className="info-icon">💰</span>
                  <div className="info-content">
                    <span className="info-label">Valor Total</span>
                    <span className="info-value value-highlight">
                      {formatCurrency(os.valor_total)}
                    </span>
                  </div>
                </div>

                <div className="os-info">
                  <span className="info-icon">📞</span>
                  <div className="info-content">
                    <span className="info-label">Telefone</span>
                    <span className="info-value">{os.cliente_telefone}</span>
                  </div>
                </div>
              </div>

              <div className="os-card-footer">
                <button
                  className="btn btn-view"
                  onClick={() => handleView(os.id)}
                >
                  👁️ Visualizar
                </button>
                <button
                  className="btn btn-download"
                  onClick={() => handleDownload(os.id, os.numero_os)}
                  disabled={downloading === os.id}
                >
                  {downloading === os.id ? '⏳' : '📥'} Baixar PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && selectedOS && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ordem de Serviço #{selectedOS.numero_os}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Dados do Cliente</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Nome:</span>
                    <span className="detail-value">{selectedOS.cliente_nome}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Telefone:</span>
                    <span className="detail-value">{selectedOS.cliente_telefone}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Detalhes da OS</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Prazo de Entrega:</span>
                    <span className="detail-value">{formatDate(selectedOS.prazo_entrega)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Forma de Pagamento:</span>
                    <span className="detail-value">{selectedOS.forma_pagamento || 'Não informado'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{selectedOS.status}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Data de Criação:</span>
                    <span className="detail-value">{formatDate(selectedOS.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Itens da OS</h3>
                <div className="items-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Qtd</th>
                        <th>Descrição</th>
                        <th>Valor Unit.</th>
                        <th>Desconto</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOS.itens?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.quantidade}</td>
                          <td>{item.descricao}</td>
                          <td>{formatCurrency(item.valor_unitario)}</td>
                          <td>{formatCurrency(item.desconto)}</td>
                          <td className="total-cell">{formatCurrency(item.valor_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="detail-section">
                <div className="totals-summary">
                  {selectedOS.desconto_total > 0 && (
                    <div className="total-line">
                      <span>Desconto Total:</span>
                      <span className="discount-value">- {formatCurrency(selectedOS.desconto_total)}</span>
                    </div>
                  )}
                  <div className="total-line final-total">
                    <span>Valor Total:</span>
                    <span>{formatCurrency(selectedOS.valor_total)}</span>
                  </div>
                </div>
              </div>

              {selectedOS.imagem_projeto && (
                <div className="detail-section">
                  <h3>Imagem do Projeto</h3>
                  <img 
                    src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000'}${selectedOS.imagem_projeto}`}
                    alt="Projeto"
                    className="project-image"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-download"
                onClick={() => handleDownload(selectedOS.id, selectedOS.numero_os)}
              >
                📥 Baixar PDF
              </button>
              <button className="btn btn-secondary" onClick={closeModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BancoOS;