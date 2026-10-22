const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const menuButton = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');
function closeMenu() { mobileMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Abrir menu'); }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileMenu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
mobileMenu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuButton.focus(); } });
matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
const revealItems = document.querySelectorAll('[data-reveal], .ink-reveal');
if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  revealItems.forEach(element => { element.classList.add('reveal-ready'); observer.observe(element); });
} else revealItems.forEach(element => element.classList.add('visible'));
const services = [...document.querySelectorAll('.service-list details')];
services.forEach(detail => detail.addEventListener('toggle', () => {
  if (!detail.open) return;
  services.forEach(other => { if (other !== detail) other.open = false; });
  document.querySelector('#service-word').textContent = detail.dataset.word;
}));
document.querySelector('.motion-toggle').addEventListener('click', event => {
  const paused = document.body.classList.toggle('motion-paused');
  event.currentTarget.setAttribute('aria-pressed', String(paused));
  event.currentTarget.setAttribute('aria-label', paused ? 'Reprendre les animations' : 'Pausar animações contínuas');
  event.currentTarget.textContent = paused ? '▷' : 'Ⅱ';
});
const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');
const whatsappNext = document.querySelector('#whatsapp-next');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const phone = data.telefone.replace(/\D/g, '');
  if (phone.length < 10 || phone.length > 13) { status.textContent = 'Confira o WhatsApp e inclua o DDD.'; form.elements.telefone.focus(); return; }
  const button = form.querySelector('button[type=submit]');
  button.disabled = true; button.firstChild.textContent = 'Enviando… '; status.textContent = '';
  whatsappNext.href = 'https://wa.me/5519999315179?text=' + encodeURIComponent(`Olá! Vim pelo site da The Mídia.\nNome: ${data.nome}\nNegócio: ${data.negocio}\n${data.mensagem || 'Quero conversar sobre marketing para o meu negócio.'}`);
  try {
    const response = await fetch('https://automacao2.themidiamarketing.com.br/webhook/form-themidia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: data.nome.trim(), email: data.email.trim(), telefone: data.telefone.trim(), negocio: data.negocio, mensagem: data.mensagem.trim(), consentimento: true }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error('Falha no envio');
    status.textContent = 'Recebemos sua mensagem. Você também pode continuar a conversa pelo WhatsApp.';
  } catch {
    status.textContent = 'Não foi possível confirmar o envio. Continue pelo WhatsApp usando o link abaixo.';
  } finally {
    whatsappNext.hidden = false; button.disabled = false; button.firstChild.textContent = 'Vamos conversar ';
  }
});
// Mantém a instrumentação existente apenas no domínio público, sem eventos na prévia local.
if (location.hostname === 'www.themidiamarketing.com.br' || location.hostname === 'themidiamarketing.com.br') {
  window.fbq = window.fbq || function(){ window.fbq.queue.push(arguments); };
  window.fbq.queue = window.fbq.queue || []; window.fbq.loaded = true; window.fbq.version = '2.0';
  const meta = document.createElement('script'); meta.src = 'https://connect.facebook.net/en_US/fbevents.js'; meta.async = true; document.head.append(meta);
  window.fbq('init', '595890515304194'); window.fbq('track', 'PageView');
  window.oaiq = window.oaiq || function(){ window.oaiq.q.push(arguments); }; window.oaiq.q = window.oaiq.q || [];
  const ads = document.createElement('script'); ads.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js'; ads.async = true; document.head.append(ads);
  window.oaiq('init', { pixelId:'93nrgbG7cyVrwEjXLAStHK' });
  const conversions = document.createElement('script'); conversions.src = '/openai-conversions.js'; document.head.append(conversions);
}
