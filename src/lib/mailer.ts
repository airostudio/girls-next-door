import nodemailer from 'nodemailer'

/**
 * Outbound mail for magic links.
 *
 * Two transports, in priority order:
 *
 *   1. RESEND_API_KEY — Resend's HTTPS API. Preferred on Vercel: a serverless
 *      function talks to it over plain HTTPS, so there is no SMTP handshake to
 *      finish before the function's execution budget runs out, and no outbound
 *      port 465/587 to be blocked. Called with fetch rather than the `resend`
 *      package so this adds no dependency.
 *   2. EMAIL_SERVER — any SMTP URL, via nodemailer. Resend also offers SMTP
 *      (smtp://resend:<api key>@smtp.resend.com:587) and this keeps any other
 *      provider working unchanged.
 *
 * EMAIL_FROM is required either way. Under Resend it must be an address on a
 * domain verified in the Resend dashboard; anything else is rejected at send
 * time, not at deploy time, so a bad value shows up as mail that never arrives.
 */

export type MailTransport = 'resend' | 'smtp' | null

/** Which transport will actually be used, or null when mail is not configured. */
export function mailTransport(): MailTransport {
  if (!process.env.EMAIL_FROM) return null
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.EMAIL_SERVER) return 'smtp'
  return null
}

/** True when a transport and a from-address are both configured. */
export function mailEnabled(): boolean {
  return mailTransport() !== null
}

type Message = { to: string; subject: string; text: string; html: string }

async function sendViaResend(msg: Message): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  })

  if (!res.ok) {
    // Resend answers with a JSON body naming the cause — an unverified sending
    // domain, a bad key, a malformed from-address. Surface it: the alternative
    // is a caller that thinks the mail went out.
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend rejected the message (${res.status}): ${detail.slice(0, 500)}`)
  }
}

async function sendViaSmtp(msg: Message): Promise<void> {
  const transport = nodemailer.createTransport(process.env.EMAIL_SERVER)
  await transport.sendMail({ from: process.env.EMAIL_FROM, ...msg })
}

export async function sendMail(msg: Message): Promise<void> {
  switch (mailTransport()) {
    case 'resend': return sendViaResend(msg)
    case 'smtp':   return sendViaSmtp(msg)
    default:
      throw new Error('sendMail called with no mail transport configured. Set RESEND_API_KEY or EMAIL_SERVER, plus EMAIL_FROM.')
  }
}
