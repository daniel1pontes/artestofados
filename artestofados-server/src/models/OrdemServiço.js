const { query } = require('../config/database');

class OrdemServico {
  static async create(osData) {
    const {
      cliente_id,
      prazo_entrega,
      forma_pagamento,
      desconto_total = 0,
      valor_total,
      imagem_projeto = null
    } = osData;

    const sql = `
      INSERT INTO ordens_servico (
        cliente_id, prazo_entrega, forma_pagamento,
        desconto_total, valor_total, imagem_projeto
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(sql, [
      cliente_id,
      prazo_entrega,
      forma_pagamento,
      desconto_total,
      valor_total,
      imagem_projeto
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const sql = `
      SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone
      FROM ordens_servico os
      JOIN clientes c ON os.cliente_id = c.id
      WHERE os.id = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async list(limit = 100, offset = 0) {
    const sql = `
      SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone
      FROM ordens_servico os
      JOIN clientes c ON os.cliente_id = c.id
      ORDER BY os.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await query(sql, [limit, offset]);
    return result.rows;
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
      UPDATE ordens_servico
      SET ${fields.join(', ')}
      WHERE id = $${counter}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id) {
    const sql = 'DELETE FROM ordens_servico WHERE id = $1';
    await query(sql, [id]);
  }

  static async getWithItems(id) {
    const os = await this.findById(id);
    
    if (!os) return null;

    const itemsSql = `
      SELECT * FROM itens_os
      WHERE os_id = $1
      ORDER BY created_at
    `;
    
    const itemsResult = await query(itemsSql, [id]);
    os.itens = itemsResult.rows;

    return os;
  }
}

module.exports = OrdemServico;