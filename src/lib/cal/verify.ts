import crypto from 'crypto';

export function verifyCalSignature(body: string, signature: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
