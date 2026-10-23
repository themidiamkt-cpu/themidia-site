<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Método não permitido.']);
$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 90000) respond(413, ['error' => 'Envio muito grande.']);
$input = json_decode($raw, true);
if (!is_array($input)) respond(400, ['error' => 'Dados inválidos.']);

$questions = [
    ['nome', 'Qual o seu nome?'],
    ['tempo', 'Quanto tempo atua na sua área?'],
    ['historia', 'Qual a sua história? Por que você decidiu trabalhar nessa área?'],
    ['comosevê', 'Como você se vê?'],
    ['explica', 'Quando alguém lhe pergunta, como você explica quem é e o que você faz?'],
    ['concorrentes', 'Quem são os seus concorrentes diretos e indiretos?'],
    ['diferencial', 'Na sua opinião, qual o seu principal diferencial em relação aos seus concorrentes?'],
    ['objetivo', 'Conta pra gente o seu objetivo com o marketing digital e as suas expectativas com o serviço da agência.'],
    ['feliz', 'Se nós atingirmos tal objetivo você ficará feliz. Que objetivo é esse?'],
    ['instagram', 'Como você gostaria que fosse o seu Instagram?'],
    ['proibido', 'Há algo que não pode ser feito na sua comunicação? Algo que você não gostaria que estivesse dentro da nossa estratégia?'],
    ['bordao', 'Você tem algum bordão ou fala/palavra que já é conhecido pela sua audiência?'],
    ['inspira', 'Quais são as pessoas que mais te inspiram nas redes sociais? Cite abaixo os perfis de cada uma delas.'],
    ['palavras', 'Você concorda que pode ser definido em quais dessas palavras?'],
    ['publico', 'Como é o público que desejamos alcançar?']
];
$allowedWords = ['Divertido','Sério','Prestativo','Animado','Elegante','Conservador','Útil','Bondoso','Criativo','Abrangente','Sofisticado','Exclusivo','Sem tabus','Para poucos','Liberal','Confiável','Ecológico','Inovador'];
$answers = [];
foreach ($questions as [$id]) {
    if ($id === 'palavras') {
        $values = is_array($input[$id] ?? null) ? $input[$id] : [];
        $answers[$id] = array_values(array_unique(array_intersect($values, $allowedWords)));
    } else {
        $limit = $id === 'nome' ? 120 : 5000;
        $answers[$id] = mb_substr(trim((string)($input[$id] ?? '')), 0, $limit);
    }
}
if (mb_strlen($answers['nome']) < 2) respond(400, ['error' => 'Informe seu nome para continuar.']);
if (($input['consentimento'] ?? null) !== true) respond(400, ['error' => 'O consentimento é necessário para o envio.']);

$formattedQuestions = [];
$textParts = [];
foreach ($questions as $index => [$id, $question]) {
    $answer = $answers[$id];
    $formattedQuestions[] = ['numero' => $index + 1, 'id' => $id, 'pergunta' => $question, 'resposta' => $answer];
    $display = is_array($answer) ? implode(', ', $answer) : $answer;
    $textParts[] = ($index + 1).'. '.$question."\n".($display !== '' ? $display : 'Não respondido');
}
$payload = array_merge($answers, [
    'nomeRespondente' => $answers['nome'],
    'enviadoEm' => gmdate('c'),
    'perguntas' => $formattedQuestions,
    'textoCompleto' => implode("\n\n", $textParts),
    'origem' => 'site-themidia-briefing',
    'submissionId' => mb_substr(trim((string)($input['submissionId'] ?? '')), 0, 100)
]);

$webhook = getenv('BRIEFING_WEBHOOK_URL') ?: 'https://automacao.themidiamarketing.com.br/webhook/briefing';
if (!filter_var($webhook, FILTER_VALIDATE_URL) || parse_url($webhook, PHP_URL_SCHEME) !== 'https') respond(503, ['error' => 'A integração está configurada de forma inválida.']);
$headers = ['Content-Type: application/json'];
if ($payload['submissionId'] !== '') $headers[] = 'Idempotency-Key: '.$payload['submissionId'];
$ch = curl_init($webhook);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_CONNECTTIMEOUT => 5
]);
$response = curl_exec($ch);
$status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_errno($ch);
curl_close($ch);
if ($response === false || $curlError !== 0 || $status < 200 || $status >= 300) respond(503, ['error' => 'Não conseguimos confirmar o recebimento. Tente novamente.']);
respond(200, ['ok' => true]);
?>
