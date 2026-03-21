export function contactAdminTemplate(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; font-weight: bold;">Name:</td><td>${data.name}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td>${data.email}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${data.phone ?? 'N/A'}</td></tr>
      </table>
      <h3 style="color: #1a1a1a; margin-top: 24px;">Message:</h3>
      <p style="white-space: pre-wrap;">${data.message}</p>
    </div>
  `;
}

export function contactConfirmationTemplate(name: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Hello ${name},</h2>
      <p>Thank you for reaching out to Ink 37 Tattoos. We have received your message and will get back to you within 24 hours.</p>
      <p>Best regards,<br>Ink 37 Tattoos</p>
    </div>
  `;
}
