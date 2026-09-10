import type { EmailProvider, TransactionalEmail } from "./emailProvider.js";

export function createTestEmailProvider() {
  const messages: TransactionalEmail[] = [];
  const provider: EmailProvider = {
    async send(message) {
      messages.push(structuredClone(message));
    },
  };
  return { provider, messages, clear: () => messages.splice(0) };
}
