'use strict';
const products = JSON.parse(document.querySelector('#public-products').textContent);
const productById = new Map(products.map(product => [product.id, product]));
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const CART_KEY = 'aqui-na-rede-pedido-v1';
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  if (Array.isArray(saved)) {
    const seen = new Set();
    cart = saved.filter(item => item && productById.has(item.id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 && !seen.has(item.id) && seen.add(item.id)).map(item => ({ id:item.id, quantity:item.quantity }));
  }
} catch { /* The order also works without local storage. */ }
const cartDialog = document.querySelector('#cart-dialog');
const mediaDialog = document.querySelector('#media-dialog');
const neighborhood = document.querySelector('#neighborhood');
const menu = document.querySelector('#main-nav');
const menuToggle = document.querySelector('.menu-toggle');
const toast = document.querySelector('.toast');
let toastTimer;
let dialogOpener;
function announce(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
window.addEventListener('resize', () => { if (window.innerWidth > 840) setMenu(false); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); menuToggle.focus(); } });
document.addEventListener('click', event => { if (!event.target.closest('.header')) setMenu(false); });
function updateMessage() {
  const total = cart.reduce((sum,item) => sum + (productById.get(item.id).price || 0) * item.quantity, 0);
  const lines = ['Olá! Montei meu pedido no site da Aqui na Rede:', ''];
  for (const item of cart) {
    const p = productById.get(item.id);
    lines.push(`${item.quantity} × ${p.name} (${p.unit}) — ${p.price === null ? 'valor a confirmar' : money(p.price * item.quantity)}`);
  }
  if (cart.some(item => productById.get(item.id).price !== null)) lines.push('', `Subtotal dos itens com preço: ${money(total)}.`);
  if (cart.some(item => productById.get(item.id).price === null)) lines.push('Há itens com valor a confirmar, não incluídos no subtotal.');
  if (cart.some(item => item.id === 'file-de-pescada-mais-camarao')) lines.push('Combo filé de pescada: R$ 169 informado para Taguatinga. Confirmar condição para meu bairro.');
  const district = neighborhood.value.trim();
  if (district) lines.push('', `Meu bairro: ${district}`);
  for (const [id, label] of [['customer-name','Nome'],['customer-address','Endereço'],['customer-extra','Complemento'],['order-notes','Observações']]) {
    const value = document.getElementById(id).value.trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  lines.push('Pagamento: pendente. Frete e total final a confirmar.');
  lines.push('', 'Pode confirmar disponibilidade, pesos, composição dos combos, valor final e condições de entrega?');
  const link = document.querySelector('#send-order');
  if (cart.length) link.href = 'https://wa.me/5561991498683?text=' + encodeURIComponent(lines.join('\n'));
  else link.removeAttribute('href');
}
function renderCart() {
  const count = cart.reduce((sum,item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = String(count); });
  document.querySelectorAll('[data-cart-open]').forEach(el => el.setAttribute('aria-label', `Abrir meu pedido, ${count} ${count === 1 ? 'item' : 'itens'}`));
  const list = document.querySelector('#cart-items');
  document.querySelector('.cart-summary').hidden = !cart.length;
  if (!cart.length) {
    list.innerHTML = '<div class="empty-cart"><h3>Seu pedido está vazio.</h3><p>Escolha um combo ou pescado para começar seu pedido.</p><button class="button button--navy" data-browse type="button">Escolher meus pescados <span aria-hidden="true">→</span></button></div>';
  } else {
    list.innerHTML = cart.map(item => {
      const p = productById.get(item.id);
      return `<article class="cart-item"><div><h3>${escapeHTML(p.name)}</h3><p>${escapeHTML(p.unit)}</p></div><span class="cart-item-price">${p.price === null ? 'A consultar' : money(p.price * item.quantity)}</span><div class="cart-item-controls"><button type="button" data-change="${p.id}" data-delta="-1" aria-label="Diminuir ${escapeHTML(p.name)}" ${item.quantity === 1 ? 'disabled' : ''}>−</button><span aria-label="Quantidade">${item.quantity}</span><button type="button" data-change="${p.id}" data-delta="1" aria-label="Aumentar ${escapeHTML(p.name)}" ${item.quantity === 99 ? 'disabled' : ''}>+</button></div><button class="remove-item" type="button" data-remove="${p.id}" aria-label="Remover ${escapeHTML(p.name)} do pedido">Remover</button></article>`;
    }).join('');
  }
  const knownTotal = cart.reduce((sum,item) => sum + (productById.get(item.id).price || 0) * item.quantity, 0);
  const hasKnown = cart.some(item => productById.get(item.id).price !== null);
  const quotes = cart.reduce((sum,item) => sum + (productById.get(item.id).price === null ? item.quantity : 0), 0);
  document.querySelector('#cart-subtotal').textContent = hasKnown ? money(knownTotal) : 'A consultar';
  document.querySelector('#cart-quotes').textContent = quotes ? `+ ${quotes} ${quotes === 1 ? 'item com valor a confirmar' : 'itens com valores a confirmar'}.` : '';
  updateMessage();
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* Optional persistence. */ }
}
function openDialog(dialog) {
  setMenu(false);
  dialogOpener = document.activeElement;
  document.body.classList.add('dialog-open');
  dialog.showModal();
  dialog.querySelector('.icon-button').focus();
}
for (const dialog of [cartDialog,mediaDialog]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (dialog === mediaDialog) {
      const video = dialog.querySelector('video');
      if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
      document.querySelector('#media-content').replaceChildren();
    }
    if (dialogOpener && document.contains(dialogOpener)) dialogOpener.focus();
  });
}
document.querySelector('[data-close-cart]').addEventListener('click', () => cartDialog.close());
document.querySelector('[data-close-media]').addEventListener('click', () => mediaDialog.close());
neighborhood.addEventListener('input', updateMessage);
document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if (add) {
    event.preventDefault();
    const p = productById.get(add.dataset.add);
    if (!p) return;
    const item = cart.find(item => item.id === p.id);
    if (item?.quantity === 99) return announce('Limite de 99 unidades por produto no pedido.');
    if (item) item.quantity += 1; else cart.push({id:p.id,quantity:1});
    renderCart(); animateAddedProduct(add); announce(`${p.title} adicionado ao pedido.`);
  }
  if (event.target.closest('[data-cart-open]')) { renderCart(); openDialog(cartDialog); }
  if (event.target.closest('[data-browse]')) { cartDialog.close(); document.querySelector('#combos').scrollIntoView(); }
  const change = event.target.closest('[data-change]');
  if (change) {
    const item = cart.find(item => item.id === change.dataset.change);
    if (!item) return;
    item.quantity = Math.max(1,Math.min(99,item.quantity + Number(change.dataset.delta)));
    const id = item.id, delta = change.dataset.delta;
    renderCart();
    const buttons = cartDialog.querySelectorAll(`[data-change="${id}"]`);
    const preferred = Array.from(buttons).find(button => button.dataset.delta === delta && !button.disabled);
    (preferred || Array.from(buttons).find(button => !button.disabled))?.focus();
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) {
    cart = cart.filter(item => item.id !== remove.dataset.remove);
    renderCart();
    (cartDialog.querySelector('[data-remove]') || cartDialog.querySelector('[data-browse]')).focus();
  }
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    const category = filter.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button === filter)));
    let count = 0;
    document.querySelectorAll('#pescados [data-category]').forEach(item => {
      item.hidden = category !== 'all' && item.dataset.category !== category;
      if (!item.hidden) count++;
    });
    document.querySelector('.more-products').hidden = !document.querySelector('.product-row:not([hidden])');
    document.querySelector('#filter-status').textContent = `${count} produtos encontrados.`;
  }
  const media = event.target.closest('[data-video], [data-photo]');
  if (media) {
    event.preventDefault();
    const video = !!media.dataset.video;
    const p = productById.get(media.dataset.video || media.dataset.photo);
    if (!p) return;
    document.querySelector('#media-title').textContent = p.name;
    const content = document.querySelector('#media-content');
    const element = document.createElement(video ? 'video' : 'img');
    element.src = video ? `assets/videos/${p.id}.mp4` : `assets/produtos/${p.id}-comercial-v3-900.webp`;
    if (video) { element.controls=true; element.playsInline=true; element.muted=true; element.preload='metadata'; element.poster=`assets/produtos/${p.id}-480.webp`; element.setAttribute('aria-label',`Vídeo real de ${p.name}`); }
    else element.alt = `Imagem ambientada de ${p.name}`;
    mediaDialog.dataset.product = p.id;
    document.querySelector(".media-options").hidden = video || !p.originalPhoto;
    document.querySelectorAll("[data-image-version]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.imageVersion === "studio")));
    content.replaceChildren(element); openDialog(mediaDialog);
    if (video) element.play().catch(() => { /* Native controls remain available. */ });
  }
});
window.addEventListener('pagehide', () => mediaDialog.querySelector('video')?.pause());
document.querySelector('#current-year').textContent = new Date().getFullYear();
renderCart();
// Enable enhanced controls only once initialization succeeded.
if (typeof HTMLDialogElement !== 'undefined' && typeof cartDialog.showModal === 'function') document.documentElement.classList.add('js');

document.querySelectorAll('[data-image-version]').forEach(button => button.addEventListener('click', () => {
  const p = productById.get(mediaDialog.dataset.product);
  const image = document.querySelector('#media-content img');
  if (!p || !image) return;
  const studio = button.dataset.imageVersion === 'studio';
  image.src = 'assets/produtos/' + p.id + (studio ? '-comercial-v3-900.webp' : '-900.webp');
  image.alt = (studio ? 'Imagem ambientada de ' : 'Foto original de ') + p.name;
  document.querySelectorAll('[data-image-version]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));


// Destaques manuais: o combo mais vendido abre a página; sem troca automática.
const heroProducts=JSON.parse(document.getElementById('hero-products').textContent);
const heroCarousel=document.querySelector('.hero-carousel');
let heroIndex=0;
function showHero(index){
 if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-opt-in')) {
  const copy = document.querySelector('.origin-copy');
  if (copy.animate) { copy.getAnimations().forEach(a=>a.cancel()); copy.animate([{opacity:.2,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}],{duration:650,easing:'ease-out'}); }
 }
 heroIndex=(index+heroProducts.length)%heroProducts.length;
 const p=heroProducts[heroIndex];
 for(const key of ['label','line','accent','lead','price','unit','cta','terms'])document.getElementById('hero-'+key).textContent=p[key];
 document.getElementById('hero-order').href='#'+p.id;
 document.getElementById('hero-order').dataset.add=p.id;
 document.getElementById('hero-details').href='#'+p.id;
 document.querySelector('.hero-track').style.transform='translateX(-'+(heroIndex*100)+'%)';
 document.querySelectorAll('.hero-slide').forEach((slide,i)=>slide.setAttribute('aria-hidden',String(i!==heroIndex)));
 document.querySelectorAll('[data-hero-index]').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===heroIndex)));
 document.getElementById('hero-status').textContent='Destaque '+(heroIndex+1)+' de '+heroProducts.length+' · '+p.title;
}
document.querySelectorAll('[data-hero-index]').forEach(button=>button.addEventListener('click',()=>showHero(Number(button.dataset.heroIndex))));
heroCarousel.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showHero(heroIndex+(event.key==='ArrowRight'?1:-1));}});
let swipeStart=null;
heroCarousel.addEventListener('touchstart',event=>{const t=event.touches[0];swipeStart={x:t.clientX,y:t.clientY};},{passive:true});
heroCarousel.addEventListener('touchend',event=>{if(!swipeStart)return;const t=event.changedTouches[0],dx=t.clientX-swipeStart.x,dy=t.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)showHero(heroIndex+(dx<0?1:-1));},{passive:true});
heroCarousel.addEventListener('touchcancel',()=>{swipeStart=null;});
document.querySelectorAll('[data-hero-step]').forEach(button=>button.addEventListener('click',()=>showHero(heroIndex+Number(button.dataset.heroStep))));

const checkoutForm = document.getElementById('checkout-form');
checkoutForm.addEventListener('input', updateMessage);
checkoutForm.addEventListener('submit', event => event.preventDefault());
document.getElementById('send-order').addEventListener('click', event => {
  for (const input of checkoutForm.querySelectorAll('input[required]')) {
    input.setCustomValidity(input.value.trim() ? '' : 'Preencha este campo.');
  }
  if (!cart.length || !checkoutForm.reportValidity()) { event.preventDefault(); return; }
  updateMessage();
});
checkoutForm.addEventListener('input', event => event.target.setCustomValidity?.(''));

// Motion is progressive enhancement: all content remains visible without it.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function animateAddedProduct(button) {
  if (motionPreference.matches || typeof button.animate !== 'function') return;
  button.animate([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:260,easing:'ease-out'});
  document.querySelectorAll('[data-cart-count]').forEach(counter=>counter.animate([{transform:'scale(1)'},{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:420,easing:'ease-out'}));
}
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      revealObserver.unobserve(entry.target);
      if (!motionPreference.matches && typeof entry.target.animate === 'function') {
        entry.target.animate([{opacity:.25,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.7,.3,1)'});
      }
    });
  },{threshold:.08});
  document.querySelectorAll('.product-card,.section-heading,.order-info-grid').forEach(element=>revealObserver.observe(element));
}
motionPreference.addEventListener('change',()=>{
  if (motionPreference.matches && document.getAnimations) document.getAnimations().forEach(animation=>animation.cancel());
});

// Visible, pausable product presentation. No timers while off screen.
const autoplayButton = document.getElementById('hero-autoplay');
const heroSection = document.querySelector('.campaign-hero');
let slideshowTimer = null;
let slideshowPaused = motionPreference.matches;
let heroVisible = true;
function scheduleSlideshow() {
  clearTimeout(slideshowTimer);
  autoplayButton.textContent = slideshowPaused ? 'Reproduzir apresentação' : 'Pausar apresentação';
  autoplayButton.setAttribute('aria-pressed', String(slideshowPaused));
  if (slideshowPaused || document.hidden || !heroVisible || heroSection.matches(':hover') || heroSection.contains(document.activeElement) || cartDialog.open || mediaDialog.open) return;
  slideshowTimer = setTimeout(()=>{showHero(heroIndex+1);scheduleSlideshow();},4500);
}
autoplayButton.addEventListener('click',()=>{slideshowPaused=!slideshowPaused;document.documentElement.classList.toggle('motion-opt-in',!slideshowPaused);if(!slideshowPaused)showHero(heroIndex+1);scheduleSlideshow();});
heroSection.addEventListener('mouseenter',scheduleSlideshow);
heroSection.addEventListener('mouseleave',scheduleSlideshow);
heroSection.addEventListener('focusin',scheduleSlideshow);
heroSection.addEventListener('focusout',()=>setTimeout(scheduleSlideshow,0));
heroSection.addEventListener('touchstart',()=>clearTimeout(slideshowTimer),{passive:true});
heroSection.addEventListener('touchend',scheduleSlideshow,{passive:true});
document.addEventListener('visibilitychange',scheduleSlideshow);
cartDialog.addEventListener('close',scheduleSlideshow);
mediaDialog.addEventListener('close',scheduleSlideshow);
motionPreference.addEventListener('change',()=>{slideshowPaused=motionPreference.matches;document.documentElement.classList.remove('motion-opt-in');scheduleSlideshow();});
if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;scheduleSlideshow();},{threshold:.15}).observe(heroSection);
scheduleSlideshow();
