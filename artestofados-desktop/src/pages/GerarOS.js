import React, { useState } from 'react';
import { osService } from '../services/api';
import './GerarOS.css';

const GerarOS = () => {
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_telefone: '',
    cliente_email: '',
    prazo_entrega: '',
    forma_pagamento: '',
    desconto_total: 0
  });

  const [itens, setItens] = useState([
    { quantidade: 1, descricao: '', valor_unitario: 0, desconto: 0 }
  ]);

  const [imagemProjeto, setImagemProjeto] = useState(null);
  const [imagemPreview, setImagemPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const novosItens = [...itens];
    novosItens[index][field] = value;
    setItens(novosItens);
  };

  const addItem = () => {
    setItens([{ quantidade: 1, descricao: '', valor_unitario: 0, desconto: 0 }, ...itens]);
  };

  const removeItem = (index) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagemProjeto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagemProjeto(null);
    setImagemPreview(null);
  };

  const calcularTotal = () => {
    const subtotal = itens.reduce((total, item) => {
      const quantidade = parseFloat(item.quantidade) || 0;
      const valorUnitario = parseFloat(item.valor_unitario) || 0;
      const desconto = parseFloat(item.desconto) || 0;
      const itemTotal = (quantidade * valorUnitario) - desconto;
      return total + itemTotal;
    }, 0);
    
    const descontoTotal = parseFloat(formData.desconto_total) || 0;
    return Math.max(0, subtotal - descontoTotal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cliente_nome || !formData.cliente_telefone || !formData.prazo_entrega) {
      setError('Preencha todos os campos obrigatórios');
      setTimeout(() => setError(null), 5000);
      return;
    }

    const itensValidos = itens.filter(item => item.descricao && item.valor_unitario > 0);
    if (itensValidos.length === 0) {
      setError('Adicione pelo menos um item válido');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = {
        ...formData,
        itens: itensValidos,
        imagem_projeto: imagemProjeto
      };

      console.log('Enviando dados:', data);
      const response = await osService.create(data);
      console.log('Resposta:', response);
      
      setSuccess(true);
      
      // Limpar formulário
      setFormData({
        cliente_nome: '',
        cliente_telefone: '',
        cliente_email: '',
        prazo_entrega: '',
        forma_pagamento: '',
        desconto_total: 0
      });
      setItens([{ quantidade: 1, descricao: '', valor_unitario: 0, desconto: 0 }]);
      setImagemProjeto(null);
      setImagemPreview(null);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Erro completo:', err);
      
      // Tratamento de erro mais detalhado
      let mensagemErro = 'Erro ao criar Ordem de Serviço. ';
      
      if (err.response) {
        // Erro da API (4xx, 5xx)
        console.error('Erro da API:', err.response.data);
        mensagemErro += err.response.data.message || err.response.data.error || 'Erro no servidor.';
      } else if (err.request) {
        // Requisição foi feita mas sem resposta
        console.error('Sem resposta do servidor:', err.request);
        mensagemErro += 'Servidor não respondeu. Verifique se o backend está rodando.';
      } else {
        // Erro ao configurar a requisição
        console.error('Erro na configuração:', err.message);
        mensagemErro += err.message;
      }
      
      setError(mensagemErro);
      setTimeout(() => setError(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gerar-os-page">
      <div className="page-header">
        <h1>Gerar Ordem de Serviço</h1>
        <p>Crie uma nova ordem de serviço para seus clientes</p>
      </div>

      {success && (
        <div className="alert alert-success">
          ✅ Ordem de Serviço criada com sucesso!
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="os-form">
        <div className="form-section">
          <h2>Dados do Cliente</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome do Cliente *</label>
              <input
                type="text"
                name="cliente_nome"
                value={formData.cliente_nome}
                onChange={handleInputChange}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="form-group">
              <label>Telefone *</label>
              <input
                type="tel"
                name="cliente_telefone"
                value={formData.cliente_telefone}
                onChange={handleInputChange}
                placeholder="(83) 99999-9999"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="cliente_email"
                value={formData.cliente_email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Detalhes da OS</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Prazo de Entrega *</label>
              <input
                type="date"
                name="prazo_entrega"
                value={formData.prazo_entrega}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Forma de Pagamento</label>
              <input
                type="text"
                name="forma_pagamento"
                value={formData.forma_pagamento}
                onChange={handleInputChange}
                placeholder="Ex: À vista, Parcelado 3x..."
              />
            </div>

            <div className="form-group">
              <label>Desconto Total (R$)</label>
              <input
                type="number"
                name="desconto_total"
                value={formData.desconto_total}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>Itens da OS</h2>
            <button type="button" className="btn btn-secondary" onClick={addItem}>
              ➕ Adicionar Item
            </button>
          </div>

          {itens.map((item, index) => (
            <div key={index} className="item-card">
              <div className="item-header">
                <span>Item {index + 1}</span>
                {itens.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeItem(index)}
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>

              <div className="item-grid">
                <div className="form-group">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    value={item.quantidade}
                    onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Descrição</label>
                  <textarea
                    value={item.descricao}
                    onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                    placeholder="Descreva o item..."
                    rows="2"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valor Unitário (R$)</label>
                  <input
                    type="number"
                    value={item.valor_unitario}
                    onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Desconto (R$)</label>
                  <input
                    type="number"
                    value={item.desconto}
                    onChange={(e) => handleItemChange(index, 'desconto', e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Total do Item</label>
                  <div className="total-display">
                    R$ {((item.quantidade * item.valor_unitario) - item.desconto).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="form-section">
          <h2>Imagem do Projeto</h2>
          <div className="image-upload-section">
            {!imagemPreview ? (
              <label className="image-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <div className="upload-placeholder">
                  <span className="upload-icon">📷</span>
                  <p>Clique para adicionar imagem</p>
                  <span className="upload-hint">JPG, PNG ou WEBP</span>
                </div>
              </label>
            ) : (
              <div className="image-preview">
                <img src={imagemPreview} alt="Preview do projeto" />
                <button type="button" className="btn-remove-image" onClick={removeImage}>
                  ❌ Remover Imagem
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="form-footer">
          <div className="total-section">
            <span className="total-label">Valor Total:</span>
            <span className="total-value">R$ {calcularTotal().toFixed(2)}</span>
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? '⏳ Gerando OS...' : '✅ Gerar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GerarOS;