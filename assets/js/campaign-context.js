(function (root) {
  'use strict';
  const offers = new Set(['combo-tilapia-mais-camarao', 'file-de-pescada-mais-camarao', 'combo-pescada-amarela', 'camarao-ggg', 'camarao-tigre', 'paella', 'robalo', 'tambatinga-moido']);
  const campaigns = Object.freeze({
    'anr-ceilandia-tilapia': { region: 'Ceilândia', offer: 'combo-tilapia-mais-camarao', creatives: ['foto-combo', 'video-real'] },
    'anr-lago-sul-ggg': { region: 'Lago Sul', offer: 'camarao-ggg', creatives: ['foto-produto', 'video-real'] },
    'anr-lago-sul-robalo': { region: 'Lago Sul', offer: 'robalo', creatives: ['foto-produto', 'video-real'] },
    'anr-taguatinga-pescada': { region: 'Taguatinga', offer: 'file-de-pescada-mais-camarao', creatives: ['foto-combo', 'video-real'] }
  });
  function read(search) {
    const params = new URLSearchParams(search);
    const one = key => params.getAll(key).length === 1 ? params.get(key) : null;
    const requestedOffer = one('oferta');
    const offer = offers.has(requestedOffer) ? requestedOffer : null;
    const name = one('utm_campaign');
    const config = Object.hasOwn(campaigns, name) ? campaigns[name] : null;
    const creative = one('utm_content');
    const valid = config && one('utm_source') === 'meta' && one('utm_medium') === 'paid_social'
      && config.creatives.includes(creative)
      && (!params.has('oferta') || requestedOffer === config.offer);
    return Object.freeze({ offer: valid ? config.offer : offer, campaign: valid ? name : null,
      region: valid ? config.region : null, creative: valid ? creative : null });
  }
  function messageLines(context) {
    if (!context.campaign) return [];
    return ['', 'Referência do link de anúncio:', `Campanha: ${context.campaign}`,
      `Criativo: ${context.creative}`, `Região do anúncio: ${context.region}`,
      'A região do anúncio não confirma o endereço de entrega.'];
  }
  function whatsappUrl(href, context) {
    if (!context.campaign) return href;
    const url = new URL(href);
    if (url.origin !== 'https://wa.me' || url.pathname !== '/5561991498683') return href;
    const message = url.searchParams.get('text') || '';
    const marker = 'Referência do link de anúncio:';
    if (!message.includes(marker)) url.searchParams.set('text', message + '\n' + messageLines(context).join('\n'));
    return url.href;
  }
  root.AquiNaRedeCampaign = Object.freeze({ read, messageLines, whatsappUrl });
})(typeof window !== 'undefined' ? window : globalThis);
