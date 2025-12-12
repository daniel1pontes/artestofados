#!/bin/bash
set -e

# Script de inicialização para criar o banco padrão do usuário
# Isso evita erros quando conexões não especificam o banco de dados
# O banco principal "estofados_db" já é criado automaticamente pelo POSTGRES_DB

echo "Criando banco padrão do usuário 'artestofados' se não existir..."

# Verificar se o banco já existe
DB_EXISTS=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='artestofados'")

if [ -z "$DB_EXISTS" ]; then
    echo "Criando banco 'artestofados'..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
        CREATE DATABASE artestofados;
        GRANT ALL PRIVILEGES ON DATABASE artestofados TO $POSTGRES_USER;
EOSQL
    echo "Banco 'artestofados' criado com sucesso!"
else
    echo "Banco 'artestofados' já existe, pulando criação."
fi

