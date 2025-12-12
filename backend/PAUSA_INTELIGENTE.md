# 🤖 Pausa Inteligente do Chatbot

## 📋 Visão Geral

Esta funcionalidade implementa uma **pausa inteligente automática** de 2 horas no chatbot quando detecta **interferência humana** em uma conversa entre o chatbot e o cliente.

## 🎯 Como Funciona

### Detecção Automática de Interferência Humana

O sistema detecta interferência humana quando:
- Um atendente responde **manualmente** uma mensagem no WhatsApp
- A mensagem é enviada pelo próprio número conectado (`message.fromMe = true`)
- O sistema então **pausa automaticamente** o chatbot por 2 horas **apenas para aquele cliente específico**

### Fluxo de Funcionamento

```
1. Cliente envia mensagem → Bot responde normalmente

2. Atendente vê a conversa e responde manualmente
   → Sistema detecta interferência humana
   → Bot é pausado por 2 horas para esse cliente

3. Cliente continua enviando mensagens
   → Bot NÃO responde (está pausado)
   → Atendente pode continuar conversando normalmente

4. Após 2 horas, pausa expira automaticamente
   → Bot volta a responder normalmente
```

## 🔧 Mudanças Implementadas

### 1. Schema do Prisma
Novos campos adicionados ao modelo `ConversationSession`:
- `pausedUntil`: Data/hora até quando o chatbot está pausado
- `pausedBy`: Motivo da pausa (ex: "HUMAN_INTERVENTION")

### 2. ConversationRepository
Novos métodos adicionados:
- `pauseConversation()`: Pausa o chatbot para uma conversa
- `unpauseConversation()`: Remove a pausa de uma conversa
- `isConversationPaused()`: Verifica se está pausado
- `getPauseTimeRemaining()`: Retorna tempo restante em minutos

### 3. ChatbotOrchestratorService
- Verifica se a conversa está pausada **antes** de processar mensagens
- Expõe métodos públicos para gerenciar pausas

### 4. WhatsAppService
- Detecta mensagens enviadas pelo próprio número (interferência humana)
- Pausa automaticamente o chatbot quando detecta interferência
- Verifica pausas antes de processar mensagens

### 5. Rotas da API
Novas rotas para gerenciar pausas manualmente:

#### POST `/api/chatbot/conversations/:phoneNumber/pause`
Pausa uma conversa manualmente
```json
{
  "hours": 2
}
```

#### POST `/api/chatbot/conversations/:phoneNumber/unpause`
Despausa uma conversa manualmente

#### GET `/api/chatbot/conversations/:phoneNumber/pause-status`
Verifica o status da pausa

## 📡 Exemplos de Uso da API

### Pausar Conversa Manualmente
```bash
POST /api/chatbot/conversations/5511999999999/pause
Authorization: Bearer <token>
Content-Type: application/json

{
  "hours": 3
}

# Resposta
{
  "success": true,
  "message": "Conversa pausada por 3 horas",
  "phoneNumber": "5511999999999",
  "hours": 3
}
```

### Despausar Conversa
```bash
POST /api/chatbot/conversations/5511999999999/unpause
Authorization: Bearer <token>

# Resposta
{
  "success": true,
  "message": "Conversa despausada com sucesso",
  "phoneNumber": "5511999999999"
}
```

### Verificar Status da Pausa
```bash
GET /api/chatbot/conversations/5511999999999/pause-status
Authorization: Bearer <token>

# Resposta
{
  "success": true,
  "phoneNumber": "5511999999999",
  "isPaused": true,
  "remainingMinutes": 87,
  "remainingHours": 2
}
```

## 🎨 Características Principais

### ✅ Pausa Específica por Cliente
- A pausa afeta apenas o cliente específico
- Outros clientes continuam sendo atendidos normalmente pelo bot

### ⏰ Expiração Automática
- Após 2 horas, a pausa expira automaticamente
- Não requer intervenção manual para reativar

### 🔄 Verificação em Tempo Real
- Antes de processar cada mensagem, o sistema verifica se há pausa ativa
- Se a pausa expirou, é removida automaticamente

### 📊 Logs Detalhados
```
🚨 Interferência humana detectada para 5511999999999
✅ Chatbot pausado por 2 horas para 5511999999999 devido à interferência humana
⏸️ Conversa pausada para 5511999999999. Tempo restante: 87 minutos
```

## 🛠️ Configuração

### Tempo de Pausa Padrão
O tempo padrão é de **2 horas**, mas pode ser configurado ao chamar os métodos:

```typescript
// Pausar por tempo personalizado
await chatbotOrchestrator.pauseConversation(phoneNumber, 3); // 3 horas
```

### Personalizar Detecção
Se necessário, você pode modificar a lógica de detecção em:
- `backend/src/services/WhatsAppService.ts` → método `handleMessage()`

## 📊 Banco de Dados

### Migration Criada
```sql
-- migration: 20251212094930_add_pause_fields_to_conversation

ALTER TABLE "conversation_sessions" 
ADD COLUMN "pausedUntil" TIMESTAMP,
ADD COLUMN "pausedBy" TEXT;
```

### Consulta Manual
```sql
-- Ver conversas pausadas
SELECT phoneNumber, pausedUntil, pausedBy, 
       EXTRACT(EPOCH FROM (pausedUntil - NOW())) / 60 as minutes_remaining
FROM conversation_sessions
WHERE pausedUntil > NOW();

-- Despausar manualmente
UPDATE conversation_sessions
SET pausedUntil = NULL, pausedBy = NULL
WHERE phoneNumber = '5511999999999';
```

## 🧪 Testando a Funcionalidade

1. **Inicie uma conversa com o bot**
   - Cliente: "Olá"
   - Bot: Responde normalmente

2. **Responda manualmente pelo WhatsApp**
   - Abra o WhatsApp Web/Desktop
   - Responda a conversa como atendente
   - ✅ Sistema detecta e pausa o bot

3. **Cliente continua enviando mensagens**
   - Cliente: "Obrigado!"
   - Bot: **NÃO responde** (está pausado)

4. **Verifique os logs**
   ```
   🚨 Interferência humana detectada para 5511999999999
   ✅ Chatbot pausado por 2 horas...
   ```

5. **Após 2 horas**
   - Cliente: "Ainda estou interessado"
   - Bot: Volta a responder automaticamente

## 🚨 Considerações Importantes

### ⚠️ Mensagens fromMe
- `message.fromMe = true` indica que a mensagem foi enviada pelo próprio número conectado
- Isso inclui mensagens enviadas de qualquer dispositivo conectado (Web, Desktop, Mobile)

### 🔄 Múltiplos Dispositivos
- Se você tem vários atendentes usando o mesmo número, qualquer um pode pausar o bot ao responder

### 📱 Grupos
- A funcionalidade **NÃO afeta grupos**
- Bot já ignora mensagens de grupos por padrão

### ⏱️ Performance
- A verificação de pausa é rápida (query simples no banco)
- Não impacta significativamente o tempo de resposta

## 📈 Próximas Melhorias (Sugestões)

- [ ] Dashboard para visualizar conversas pausadas
- [ ] Notificações quando pausas expiram
- [ ] Histórico de interferências humanas
- [ ] Estatísticas de pausas por período
- [ ] Pausa configurável por cliente (alguns 1h, outros 3h, etc.)

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte o banco de dados diretamente
3. Use as rotas da API para gerenciar pausas manualmente

---

**Implementado em:** 12/12/2024
**Versão:** 1.0.0

