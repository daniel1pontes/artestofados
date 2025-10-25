const { query } = require('../config/database');

class ItemOS {
  static async create(itemData) {
    const {
      os_id,
      quantidade,
      descricao,
      valor_unitario,
      desconto = 0
    } = itemData;

    const valor_total = (quantidade * valor_unitario) - desconto;

    const sql = `
      INSERT INTO itens_os (
        os_id, quantidade, descricao,
        valor_unitario, desconto, valor_total
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(sql, [
      os_id,
      quantidade,
      descricao,
      valor_unitario,
      desconto,
      valor_total
    ]);

    return result.rows[0];
  }

  static async findByOS(os_id) {
    const sql = 'SELECT * FROM itens_os WHERE os_id = $1 ORDER BY created_at';
    const result = await query(sql, [os_id]);
    return result.rows;
  }

  static async delete(id) {
    const sql = 'DELETE FROM itens_os WHERE id = $1';
    await query(sql, [id]);
  }

  static async deleteByOS(os_id) {
    const sql = 'DELETE FROM itens_os WHERE os_id = $1';
    await query(sql, [os_id]);
  }
}

module.exports = ItemOS;