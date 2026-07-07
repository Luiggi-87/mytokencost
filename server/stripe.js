import Stripe from "stripe";
import { dbRun, dbGet } from "./db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Criar Stripe customer para projeto/cliente
 */
export async function createStripeCustomer(projectId, clientName, email) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("Stripe não configurado. Pulando criação de customer.");
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      name: clientName,
      email: email || `${clientName}@example.com`.replace(/\s/g, ""),
      metadata: { projectId },
    });

    // Salvar Stripe customer ID no banco
    await dbRun(
      "UPDATE projects SET stripe_customer_id = ? WHERE id = ?",
      [customer.id, projectId]
    );

    return customer.id;
  } catch (error) {
    console.error("Erro ao criar Stripe customer:", error);
    return null;
  }
}

/**
 * Cobrar custo automaticamente via Stripe
 */
export async function chargeStripeCustomer(projectId, amount, description) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log("Stripe não configurado. Pulando cobrança.");
    return null;
  }

  const project = await dbGet(
    "SELECT stripe_customer_id FROM projects WHERE id = ?",
    [projectId]
  );

  if (!project?.stripe_customer_id) {
    console.log(`Projeto ${projectId} não tem Stripe customer configurado`);
    return null;
  }

  try {
    // Criar taxa no Stripe
    const charge = await stripe.charges.create({
      customer: project.stripe_customer_id,
      amount: Math.round(amount * 100), // em centavos
      currency: "usd",
      description: description || `Custos de API - ${projectId}`,
      metadata: { projectId, amount },
    });

    console.log(`✅ Cobrança Stripe: $ ${amount} para projeto ${projectId}`);
    return charge;
  } catch (error) {
    console.error("Erro ao cobrar Stripe:", error);
    throw error;
  }
}

/**
 * Webhook handler para eventos do Stripe
 */
export function handleStripeWebhook(event) {
  switch (event.type) {
    case "charge.succeeded":
      console.log("✅ Cobrança bem-sucedida");
      break;
    case "charge.failed":
      console.log("❌ Cobrança falhou");
      break;
    case "customer.subscription.created":
      console.log("✅ Subscription criada");
      break;
    default:
      console.log("Evento Stripe:", event.type);
  }
}

export default stripe;
