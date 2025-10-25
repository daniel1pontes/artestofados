const { pool } = require('../config/database');

const migrations = [
  `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `,
  `
  CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS ordens_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_os SERIAL UNIQUE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    prazo_entrega DATE NOT NULL,
    forma_pagamento TEXT,
    desconto_total DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente',
    imagem_projeto TEXT,
    assinatura_cliente TEXT,
    assinatura_artestofados TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS itens_os (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_id UUID REFERENCES ordens_servico(id) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    valor_unitario DECIMAL(10, 2) NOT NULL,
    desconto DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS sessoes_chatbot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telefone VARCHAR(20) NOT NULL,
    etapa VARCHAR(50) DEFAULT 'inicio',
    tipo_servico VARCHAR(20),
    tipo_estofado VARCHAR(50),
    tem_projeto BOOLEAN,
    quer_visita BOOLEAN,
    dados JSONB DEFAULT '{}',
    mensagens JSONB DEFAULT '[]',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_os_cliente ON ordens_servico(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_itens_os ON itens_os(os_id);
  CREATE INDEX IF NOT EXISTS idx_sessoes_telefone ON sessoes_chatbot(telefone);
  CREATE INDEX IF NOT EXISTS idx_sessoes_ativo ON sessoes_chatbot(ativo);
  `
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Executando migrations...');
    
    await client.query('BEGIN');
    
    for (let i = 0; i < migrations.length; i++) {
      console.log(`  ➡️  Migration ${i + 1}/${migrations.length}`);
      await client.query(migrations[i]);
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Migrations executadas com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };