import { CountedAnthropic } from "./index.js";

/**
 * Exemplo de uso do CountedAnthropic
 *
 * Este exemplo mostra como usar o SDK proxy para rastrear custos automaticamente
 *
 * Pré-requisitos:
 * 1. Contador de Tokens rodando: npm run dev
 * 2. Projeto criado no dashboard
 * 3. ANTHROPIC_API_KEY em .env
 */

const client = new CountedAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  projectId: "exemplo-agente", // Crie este projeto no dashboard primeiro
  backendUrl: "http://localhost:3001",
  debug: true, // Mostrar logs detalhados
});

async function main() {
  console.log("🚀 Contador de Tokens - Exemplo Anthropic Proxy\n");

  try {
    console.log("1️⃣ Enviando mensagem para Claude...\n");

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content:
            "Explique brevemente como funciona contabilização de custos de APIs. Responda em 2-3 linhas.",
        },
      ],
    });

    console.log("\n2️⃣ Resposta de Claude:");
    console.log("---");
    console.log(message.content[0].text);
    console.log("---\n");

    console.log("3️⃣ Informações da Requisição:");
    console.log(`   Input Tokens: ${message.usage.input_tokens}`);
    console.log(`   Output Tokens: ${message.usage.output_tokens}`);
    console.log(
      `   Total Tokens: ${message.usage.input_tokens + message.usage.output_tokens}`
    );

    console.log("\n✅ Custo foi registrado automaticamente no Contador!");
    console.log("🌐 Verifique em: http://localhost:3001");
    console.log("📊 Vá para 'Dashboard' para ver os custos\n");
  } catch (error) {
    console.error("❌ Erro:", error.message);
    console.log("\nDicas:");
    console.log(
      "• Verifique se Contador de Tokens está rodando: npm run dev"
    );
    console.log("• Verifique se ANTHROPIC_API_KEY está definida");
    console.log("• Verifique se o projeto 'exemplo-agente' existe no dashboard");
  }
}

main();
