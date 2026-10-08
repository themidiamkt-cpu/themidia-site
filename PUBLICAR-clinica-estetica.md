# Publicar o formulário de qualificação de clínicas de estética

A nova página fica em `/clinica-estetica/` e abre diretamente o formulário de qualificação em um popup. A publicação precisa incluir os arquivos estáticos e a API; enviar apenas a pasta HTML por FTP não ativa o recebimento de leads.

## 1. Preparar as integrações

- **Supabase:** use o projeto **themidia**, referência `wkjnxohfggqwhemalelf`. O projeto usado pelo blog antigo é outro. Confira a referência no painel antes de aplicar a migração incluída nesta entrega. Ela acrescenta os campos do funil à tabela `public.leads_crm`.
- **n8n:** o destino configurado é `https://automacao2.themidiamarketing.com.br/webhook/form-themidia`. O fluxo recebe o lead completo, com respostas, qualificação, pontuação, UTMs, `fbclid`, `event_id` e data/hora, verifica o identificador de envio para evitar mensagens duplicadas e envia a confirmação pela Evolution API. Credenciais da Evolution ficam no n8n. Use mensagens fixas, sem agente de IA conversando com o paciente.
- **Meta:** use o mesmo Pixel ID no navegador e na API de Conversões. O pixel usado no site atual é `595890515304194`; confirme que é o conjunto de dados desta campanha. Crie o token CAPI no Gerenciador de Eventos.
- **Agenda:** configure uma URL de agendamento de 20 minutos. A conversa da The Mídia é online. Instagram e WhatsApp usam os contatos públicos já presentes no site.

Os nomes exatos das variáveis estão em `.env.example`. Configure os valores privados nas variáveis de ambiente da hospedagem, nunca no HTML. A chave privilegiada do Supabase, o token CAPI e o segredo do webhook ficam exclusivamente no servidor. O endpoint n8n já vem configurado para o webhook da The Mídia e pode ser substituído por `N8N_WEBHOOK_URL`; a API responde 503 enquanto Supabase, Pixel ID ou token CAPI não estiverem configurados, para não confirmar um lead com integrações incompletas.

## 2. Publicar

1. Importe esta pasta como projeto na Vercel, com o preset **Other**, e mantenha a configuração de publicação fornecida em `vercel.json`.
2. Adicione as variáveis de `.env.example` em **Settings → Environment Variables**. Preencha também a URL pública final do site e a agenda.
3. Aplique a migração SQL no projeto Supabase correto e publique primeiro uma versão de prévia.
4. Depois de testar o formulário, associe o domínio desejado. O caminho final será `https://SEU-DOMINIO/clinica-estetica/`.

Não é necessário reconstruir o site antigo em Next.js. Esta entrega preserva a exportação existente e acrescenta a rota e a API do funil.

## 3. Testar um lead

Para conferir o visual localmente, prefira `http://localhost:4173/clinica-estetica/` ou a prévia da hospedagem. O arquivo aberto como `file://` renderiza o formulário, mas não consegue enviar o lead para a API sem um servidor.

Use um número de WhatsApp seu ou da equipe e um workflow de teste para não contactar pacientes. No ambiente de prévia, configure o código de teste CAPI fornecido pelo Gerenciador de Eventos; retire-o antes da campanha.

Abra `/clinica-estetica/?utm_source=meta&utm_medium=paid_social&utm_campaign=teste-estetica&utm_content=reels-teste&utm_term=teste&fbclid=teste-local`, aceite a medição quando quiser verificar o Pixel e complete o formulário que já aparece aberto.

| Caso | Profissionais | Ticket | Verba em anúncios | Atendimento | Resultado esperado |
| --- | --- | --- | --- | --- | --- |
| Prioridade alta | 2 a 4 | R$ 400 a R$ 800 | R$ 1.500 a R$ 3.000 | Recepcionista | Obrigado com diagnóstico, agenda e WhatsApp |
| Qualificado | 2 a 4 | R$ 250 a R$ 400 | R$ 1.500 a R$ 3.000 | Sou eu mesma | Obrigado com diagnóstico, agenda e WhatsApp |
| Nutrição | Só eu | Qualquer | Qualquer | Qualquer | Obrigado com conteúdos e Instagram |
| Nutrição por verba | 2 a 4 | R$ 400 a R$ 800 | Até R$ 1.500 | Recepcionista | Obrigado com conteúdos e Instagram |

Confira uma gravação em `leads_crm`, com origem `landing-estetica`, respostas, status, pontuação, consentimento, UTMs, `fbclid` e data/hora. O status é calculado no servidor e não aparece na página. A opção inferior de cada faixa sobreposta prevalece: **Até R$ 1.500** e **Até R$ 250** entram em nutrição.

No n8n, confirme uma execução e uma mensagem no WhatsApp de teste. No Gerenciador de Eventos, confira `PageView`, `Lead` e, nos dois primeiros casos, `LeadQualificado`. O `Lead` do navegador e o do servidor compartilham `event_id` para deduplicação. Ausência de consentimento de medição ou bloqueadores pode impedir os eventos do navegador.

Teste também DDD inválido, avanço sem resposta, envio sem consentimento obrigatório, botão Voltar e envio com conexão interrompida. Falha de gravação não deve exibir a mensagem de sucesso.

## Referências técnicas

- [Funções Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Configuração de projeto Vercel](https://vercel.com/docs/project-configuration)
- [Chaves e acesso ao Supabase](https://supabase.com/docs/guides/getting-started/api-keys)

Esta entrega prepara o código e o roteiro de implantação. Migração remota, publicação, credenciais, ativação do workflow e recebimento real de mensagens precisam ser verificados no ambiente configurado.
