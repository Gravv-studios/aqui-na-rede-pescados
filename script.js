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
  const lines = ['Olá! Vim pelo site da Aqui na Rede e gostaria de consultar este pedido:', ''];
  for (const item of cart) {
    const p = productById.get(item.id);
    lines.push(`${item.quantity} × ${p.name} (${p.unit}) — ${p.price === null ? 'valor a confirmar' : money(p.price * item.quantity)}`);
  }
  if (cart.some(item => productById.get(item.id).price !== null)) lines.push('', `Subtotal dos itens com preço: ${money(total)}.`);
  if (cart.some(item => productById.get(item.id).price === null)) lines.push('Há itens com valor a confirmar, não incluídos no subtotal.');
  if (cart.some(item => item.id === 'file-de-pescada-mais-camarao')) lines.push('Combo filé de pescada: R$ 169 informado para Taguatinga. Confirmar condição para meu bairro.');
  const district = neighborhood.value.trim();
  if (district) lines.push('', `Meu bairro: ${district}`);
  lines.push('', 'Pode confirmar disponibilidade, pesos, composição dos combos, valor final e condições de entrega?');
  const link = document.querySelector('#send-order');
  if (cart.length) link.href = 'https://wa.me/5561991669749?text=' + encodeURIComponent(lines.join('\n'));
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
    const p = productById.get(add.dataset.add);
    if (!p) return;
    const item = cart.find(item => item.id === p.id);
    if (item?.quantity === 99) return announce('Limite de 99 unidades por produto no pedido.');
    if (item) item.quantity += 1; else cart.push({id:p.id,quantity:1});
    renderCart(); announce(`${p.title} adicionado ao pedido.`);
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
    element.src = video ? `assets/videos/${p.id}.mp4` : `assets/produtos/${p.id}-ice-900.webp`;
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
  image.src = 'assets/produtos/' + p.id + (studio ? '-ice-900.webp' : '-900.webp');
  image.alt = (studio ? 'Imagem ambientada de ' : 'Foto original de ') + p.name;
  document.querySelectorAll('[data-image-version]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));


// Destaques manuais: o combo mais vendido abre a página; sem troca automática.
const heroProducts=JSON.parse(document.getElementById('hero-products').textContent);
const heroSelect=document.getElementById('hero-select');
let heroIndex=0;
function showHero(index){
 heroIndex=(index+heroProducts.length)%heroProducts.length;
 const p=heroProducts[heroIndex];
 for(const key of ['label','line','accent','lead','price','unit','cta','terms'])document.getElementById('hero-'+key).textContent=p[key];
 document.getElementById('hero-order').href=p.href;
 document.getElementById('hero-details').href='#'+p.id;
 const img=document.getElementById('origin-image');img.src='assets/produtos/'+p.id+'-ice-900.webp';img.alt=p.title+' — composição de estúdio ilustrativa';
 heroSelect.value=p.id;document.getElementById('hero-status').textContent='Destaque '+(heroIndex+1)+' de '+heroProducts.length+' · '+p.title;
}
heroSelect.addEventListener('change',()=>showHero(heroProducts.findIndex(p=>p.id===heroSelect.value)));
document.querySelectorAll('[data-hero-step]').forEach(button=>button.addEventListener('click',()=>showHero(heroIndex+Number(button.dataset.heroStep))));
