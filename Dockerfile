# Dockerfile para PostgreSQL customizado
FROM postgres:16-alpine

# Instalar utilitários adicionais se necessário
RUN apk add --no-cache \
    bash \
    curl

# Copiar scripts de inicialização (se houver)
# Os scripts em /docker-entrypoint-initdb.d/ são executados automaticamente
# quando o banco é inicializado pela primeira vez
COPY ./database/init-scripts/ /docker-entrypoint-initdb.d/

# Dar permissões de execução aos scripts shell
RUN chmod +x /docker-entrypoint-initdb.d/*.sh 2>/dev/null || true

# Configurações customizadas do PostgreSQL
# Você pode criar um arquivo postgresql.conf customizado se necessário
# COPY ./database/postgresql.conf /etc/postgresql/postgresql.conf

# Manter as variáveis de ambiente padrão do PostgreSQL
# POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB serão definidas no docker-compose.yml

# Expor a porta padrão do PostgreSQL
EXPOSE 5432

# O comando padrão do postgres:16-alpine já inicia o servidor
# Não é necessário sobrescrever, mas podemos adicionar verificações se necessário

