export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailProvider {
  send(message: TransactionalEmail): Promise<void>;
}

export function createConsoleEmailProvider(): EmailProvider {
  return {
    async send(message) {
      console.info("Transactional email queued", { to: message.to, subject: message.subject });
    },
  };
}
