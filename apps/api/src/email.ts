const { EMAIL_SCRIPT_URL, EMAIL_SCRIPT_SECRET } = process.env;

// Sends an email through the Google Apps Script, or prints it to the log when the script isn't set up.
// Goes through the script because Render's free plan blocks direct connections to Gmail.
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!EMAIL_SCRIPT_URL || !EMAIL_SCRIPT_SECRET) {
    console.log(`Email to ${to}: ${subject}\n${text}`);
    return;
  }

  const response = await fetch(EMAIL_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: EMAIL_SCRIPT_SECRET, to, subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.text();
  if (result !== "sent") throw new Error(`Email script said: ${result}`);
}
