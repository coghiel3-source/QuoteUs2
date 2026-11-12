interface MailTransport<T> {
  sendMail(message: unknown): Promise<T>;
  close(): void;
}

// A socket timeout alone is not a total deadline: SMTP can stall at several
// separate stages. Close the connection when the overall deadline expires.
export async function sendMailWithDeadline<T>(
  transport: MailTransport<T>,
  message: unknown,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      transport.sendMail(message),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Email delivery timed out"));
          transport.close();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
