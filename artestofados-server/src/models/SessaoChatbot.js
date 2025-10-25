const { query } = require('../config/database');

class SessaoChatbot {
  static async create(telefone) {
    const sql = `
      INSERT INTO sessoes_chatbot (telefone)
      VALUES ($1)
      RETURNING *
    `;
    
    const result = await query(sql, [telefone]);
    return result.rows[0];
  }

  static async findByTelefone(telefone) {
    const sql = `
      SELECT * FROM sessoes_chatbot
      WHERE telefone = $1 AND ativo = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await query(sql, [telefone]);
    return result.rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let counter = 1;

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${counter}`);
        values.push(data[key]);
        counter++;
      }
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE sessoes_chatbot
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async addMessage(id, role, content) {
    const sql = `
      UPDATE sessoes_chatbot
      SET mensagens = mensagens || $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const message = JSON.stringify({ role, content, timestamp: new Date() });
    const result = await query(sql, [id, `[${message}]`]);
    return result.rows[0];
  }

  static async deactivate(id) {
    const sql = `
      UPDATE sessoes_chatbot
      SET ativo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await query(sql, [id]);
  }

  static async listActive() {
    const sql = `
      SELECT s.*, c.nome as cliente_nome
      FROM sessoes_chatbot s
      LEFT JOIN clientes c ON s.telefone = c.telefone
      WHERE s.ativo = true
      ORDER BY s.updated_at DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  static async getOrCreate(telefone) {
    let sessao = await this.findByTelefone(telefone);
    
    if (!sessao) {
      sessao = await this.create(telefone);
    }
    
    return sessao;
  }
}

module.exports = SessaoChatbot;