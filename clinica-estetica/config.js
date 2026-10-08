// Configuração pública de prévia. npm run build lê as variáveis de ambiente.
window.CLINICA_CONFIG = {
  endpoint: '/api/clinica-estetica', pixelId: '',
  // Caminho público usado quando a hospedagem entrega somente os arquivos estáticos.
  // O workflow deve validar e deduplicar pelo event_id antes de seguir o lead.
  directWebhookUrl: 'https://automacao2.themidiamarketing.com.br/webhook/form-themidia',
  siteUrl: 'https://www.themidiamarketing.com.br',
  instagramUrl: 'https://www.instagram.com/agenciathemidia/',
  whatsappUrl: 'https://wa.me/5519999315179', bookingUrl: ''
};
