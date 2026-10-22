const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('.letter-reveal').forEach((element) => {
  const text = element.dataset.text || element.textContent;
  element.textContent = '';
  [...text].forEach((letter, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = letter === ' ' ? '\u00a0' : letter;
    span.style.transitionDelay = `${Math.min(index * 22, 500)}ms`;
    element.appendChild(span);
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal, .letter-reveal, .step').forEach((element) => observer.observe(element));

const heroLetters = document.querySelectorAll('.hero .letter-reveal');
requestAnimationFrame(() => heroLetters.forEach((element, index) => {
  setTimeout(() => element.classList.add('visible'), reducedMotion ? 0 : 300 + index * 180);
}));

const progress = document.querySelector('.progress span');
const nav = document.querySelector('.nav-shell');
const inkHeadings = [...document.querySelectorAll('.scroll-ink')];
const timeline = document.querySelector('.timeline');
const timelineFill = document.querySelector('.timeline-line span');

function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }

function updateScrollEffects() {
  const scrollTop = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max ? scrollTop / max : 0})`;
  nav.classList.toggle('scrolled', scrollTop > 80);

  inkHeadings.forEach((heading) => {
    const rect = heading.getBoundingClientRect();
    const amount = clamp((window.innerHeight * .82 - rect.top) / (window.innerHeight * .72));
    heading.style.setProperty('--ink-progress', `${amount * 100}%`);
  });

  if (timeline) {
    const rect = timeline.getBoundingClientRect();
    const amount = clamp((window.innerHeight * .55 - rect.top) / Math.max(rect.height - window.innerHeight * .2, 1));
    timelineFill.style.setProperty('--line-progress', `${amount * 100}%`);
  }
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) requestAnimationFrame(() => { updateScrollEffects(); ticking = false; });
  ticking = true;
}, { passive: true });
window.addEventListener('resize', updateScrollEffects);
updateScrollEffects();

if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.magnetic').forEach((element) => {
    element.addEventListener('mousemove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * .14;
      const y = (event.clientY - rect.top - rect.height / 2) * .18;
      element.style.transform = `translate(${x}px, ${y}px)`;
    });
    element.addEventListener('mouseleave', () => { element.style.transform = ''; });
  });
}
