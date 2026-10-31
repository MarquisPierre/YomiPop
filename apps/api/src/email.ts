import nodemailer from "nodemailer";

const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

// Sends through Gmail when its settings are present.
const gmail =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

// Sends an email, or prints it to the log when Gmail isn't set up.
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!gmail) {
    console.log(`Email to ${to}: ${subject}\n${text}`);
    return;
  }
  await gmail.sendMail({ from: `YomiPop <${GMAIL_USER}>`, to, subject, text });
}
