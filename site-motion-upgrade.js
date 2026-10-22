(() => {
  let observer;
  let progress;
  const getObserver = () => observer || (observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('tm-visible');
  }), { threshold: .14 }));

  function upgrade() {
    document.body.classList.add('motion-upgrade');
    const header = document.body.querySelector(':scope > header');
    const heroText = document.querySelector('.hero-text-wrapper-midia');
    let hero = heroText;
    while (hero && hero.parentElement?.tagName !== 'MAIN') hero = hero.parentElement;
    if (hero) {
      hero.id = 'tm-home-hero';
      if (!hero.querySelector('.tm-orbit-dot')) {
        const dot = document.createElement('span'); dot.className = 'tm-orbit-dot'; dot.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('p'); copy.className = 'tm-hero-copy'; copy.innerHTML = '<strong>Estratégia, criação e performance</strong> conectadas para transformar atenção em crescimento.';
        const side = document.createElement('span'); side.className = 'tm-hero-side'; side.textContent = 'The Mídia · Hortolândia · SP';
        hero.append(dot, copy, side);
      }
    }
    if (!progress || !progress.isConnected) {
      progress = document.querySelector('.tm-scroll-progress') || document.createElement('span');
      progress.className = 'tm-scroll-progress'; progress.setAttribute('aria-hidden', 'true');
      if (!progress.isConnected) document.body.appendChild(progress);
    }
    const names = { sobre:'Quem somos', servicos:'Ecossistema', resultados:'Performance', depoimentos:'Confiança', blog:'Conteúdo', contato:'Próximo passo' };
    Object.entries(names).forEach(([id, name], index) => {
      const section = document.getElementById(id); const title = section?.querySelector('h2');
      if (!title) return;
      if (!title.parentNode.querySelector(':scope > .tm-section-index')) {
        const badge = document.createElement('div'); badge.className = 'tm-section-index';
        badge.innerHTML = `<i>${String(index + 1).padStart(2, '0')}</i><span>${name}</span>`;
        title.parentNode.insertBefore(badge, title);
      }
      if (!title.classList.contains('tm-letter-title')) {
        title.classList.add('tm-letter-title'); const text = title.textContent.trim(); title.textContent = '';
        [...text].forEach((character, charIndex) => {
          const span = document.createElement('span'); span.className = 'tm-char'; span.textContent = character === ' ' ? '\u00a0' : character;
          span.style.transitionDelay = `${Math.min(charIndex * 17, 420)}ms`; title.appendChild(span);
        });
      }
    });
    document.querySelectorAll('main section').forEach((section) => [...section.children].forEach((child) => child.classList.add('tm-reveal')));
    const services = document.getElementById('servicos');
    if (services && !document.querySelector('.tm-marquee')) {
      const marquee = document.createElement('div'); marquee.className = 'tm-marquee'; marquee.setAttribute('aria-label', 'Especialidades The Mídia');
      marquee.innerHTML = '<div class="tm-marquee-track"><span>TRÁFEGO PAGO</span><i>✦</i><span>CONTEÚDO</span><i>✦</i><span>SITES</span><i>✦</i><span>ESTRATÉGIA</span><i>✦</i><span>TRÁFEGO PAGO</span><i>✦</i><span>CONTEÚDO</span><i>✦</i><span>SITES</span><i>✦</i><span>ESTRATÉGIA</span><i>✦</i></div>';
      services.parentNode.insertBefore(marquee, services);
    }
    const reveal = getObserver(); document.querySelectorAll('.tm-reveal,.tm-letter-title').forEach((element) => reveal.observe(element));
    const top = window.scrollY; const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? top / max : 0})`; if (header) header.classList.toggle('tm-compact', top > 80);
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) requestAnimationFrame(() => { upgrade(); ticking = false; }); ticking = true; }, { passive:true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', upgrade); else upgrade();
  setTimeout(upgrade, 500); setTimeout(upgrade, 1400); setTimeout(upgrade, 2800);
})();
