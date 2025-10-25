const { query } = require('../config/database');

class Cliente {
  static async create(nome, telefone, email = null) {
    const sql = `
      INSERT INTO clientes (nome, telefone, email)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await query(sql, [nome, telefone, email]);
    return result.rows[0];
  }

  static async findByTelefone(telefone) {
    const sql = 'SELECT * FROM clientes WHERE telefone = $1';
    const result = await query(sql, [telefone]);
    return result.rows[0];
  }

  static async findById(id) {
    const sql = 'SELECT * FROM clientes WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  static async getOrCreate(nome, telefone, email = null) {
    let cliente = await this.findByTelefone(telefone);
    
    if (!cliente) {
      cliente = await this.create(nome, telefone, email);
    }
    
    return cliente;
  }

  static async list() {
    const sql = 'SELECT * FROM clientes ORDER BY created_at DESC';
    const result = await query(sql);
    return result.rows;
  }
}

module.exports = Cliente;