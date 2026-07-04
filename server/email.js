import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const t = getTransporter();

  if (!t) {
    console.log(`⚠️ SMTP não configurado. Link de reset para ${email}: ${resetUrl}`);
    return false;
  }

  await t.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "MyTokenCost - Redefinir senha",
    html: `
      <p>Você solicitou a redefinição da sua senha no MyTokenCost.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
      <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
    `,
  });

  console.log(`✅ Email de reset enviado para ${email}`);
  return true;
}
