import nodemailer from "nodemailer";
import type { ApiConfig } from "../config.js";
import type { EmailProvider } from "./emailProvider.js";

export function createSmtpEmailProvider(config: ApiConfig): EmailProvider {
  const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT });
  return {
    async send(message) {
      await transport.sendMail({ from: config.SMTP_FROM, ...message });
    },
  };
}
