import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const out = path.join(root, 'dist');
await mkdir(out, { recursive: true });
// Lista explícita: nunca publicar .env, API, migrações, testes ou instruções internas.
const dirs = ['_next', '_not-found', '404', 'admin', 'blog', 'briefing-site', 'formulario-contrato', 'clinica-estetica'];
const publicExtensions = /\.(html|css|js|mjs|png|webp|avif|jpg|jpeg|svg|ico|woff2|txt)$/i;
async function copyPublic(source, destination) {
  await cp(source, destination, { recursive: true, filter: (src) => !/\.(md|bak)$/i.test(src) && !path.basename(src).startsWith('.') });
}
for (const dir of dirs) await copyPublic(path.join(root, dir), path.join(out, dir));
for (const item of await readdir(root, { withFileTypes: true })) {
  if (item.isFile() && publicExtensions.test(item.name)) await cp(path.join(root, item.name), path.join(out, item.name));
}
function publicUrl(name, fallback = '') {
  const val = process.env[name] || fallback;
  if (!val) return '';
  const url = new URL(val);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(`${name} precisa de URL HTTPS.`);
  return url.href;
}
export function config() {
  const pixel = process.env.META_PIXEL_ID || '';
  if (pixel && !/^\d+$/.test(pixel)) throw new Error('META_PIXEL_ID inválido.');
  return {
    endpoint: '/api/clinica-estetica',
    directWebhookUrl: publicUrl('PUBLIC_N8N_WEBHOOK_URL', 'https://automacao2.themidiamarketing.com.br/webhook/form-themidia'),
    pixelId: pixel,
    siteUrl: publicUrl('PUBLIC_SITE_URL', 'https://www.themidiamarketing.com.br'),
    instagramUrl: publicUrl('PUBLIC_INSTAGRAM_URL', 'https://www.instagram.com/agenciathemidia/'),
    whatsappUrl: publicUrl('PUBLIC_WHATSAPP_URL', 'https://wa.me/5519999315179'),
    bookingUrl: publicUrl('PUBLIC_BOOKING_URL')
  };
}
await writeFile(path.join(out, 'clinica-estetica/config.js'), `window.CLINICA_CONFIG = ${JSON.stringify(config()).replaceAll('<', '\\u003c')};\n`);
console.log('Site pronto em dist/. API executada no servidor.');
