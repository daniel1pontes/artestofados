const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `Você é um assistente virtual da Artestofados, uma loja especializada em fabricação e reforma de estofados.

Seu objetivo é atender os clientes seguindo este fluxo:

1. Saudação inicial amigável
2. Perguntar se o cliente quer "fabricação" ou "reforma"
3. Se REFORMA:
   - Pedir para enviar foto do estofado
   - Informar que a equipe entrará em contato em breve
   - Encerrar atendimento
4. Se FABRICAÇÃO:
   - Perguntar o tipo: sofá, cadeira, poltrona ou cama
   - Perguntar se já tem projeto/design definido
   - Perguntar se deseja marcar uma reunião/visita
   - Se sim, oferecer horários disponíveis

Seja cordial, objetivo e profissional.`;

async function chat(messages) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Erro ao chamar OpenAI:', error);
    throw error;
  }
}

module.exports = {
  openai,
  chat,
  SYSTEM_PROMPT
};