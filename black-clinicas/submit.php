<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Método não permitido.']); exit; }
$raw = file_get_contents('php://input');
if (strlen($raw) > 12000) { http_response_code(413); echo json_encode(['error'=>'Envio muito grande.']); exit; }
$input = json_decode($raw, true);
if (!is_array($input) || trim((string)($input['website'] ?? '')) !== '') { http_response_code(400); echo json_encode(['error'=>'Dados inválidos.']); exit; }
$nome = trim((string)($input['nome'] ?? ''));
$instagram = ltrim(preg_replace('/\s+/', '', trim((string)($input['instagram'] ?? ''))), '@');
$phone = preg_replace('/\D+/', '', (string)($input['whatsapp'] ?? ''));
if (str_starts_with($phone, '55')) $phone = substr($phone, 2);
if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100 || !preg_match('/^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9_.]{1,30}$/', $instagram) || !preg_match('/^(?:[1-9][1-9])9\d{8}$/', $phone)) { http_response_code(400); echo json_encode(['error'=>'Confira nome, Instagram e WhatsApp.']); exit; }
$allowed = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
$payload = ['event'=>'lead_guia_black_clinicas','source'=>'lp_black_clinicas','lead_magnet'=>'guia_black_friday_clinicas_2026','nome'=>$nome,'instagram'=>$instagram,'instagram_url'=>'https://www.instagram.com/'.$instagram.'/','whatsapp'=>'+55'.$phone,'whatsapp_digits'=>'55'.$phone,'submitted_at'=>gmdate('c'),'page_url'=>substr((string)($input['page_url'] ?? ''),0,500)];
foreach ($allowed as $key) $payload[$key] = !empty($input[$key]) ? substr((string)$input[$key],0,500) : null;
$ch = curl_init('https://automacao2.themidiamarketing.com.br/webhook/black-clinicas');
curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), CURLOPT_HTTPHEADER=>['Content-Type: application/json'], CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_CONNECTTIMEOUT=>4]);
$response = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
if ($response === false || $status < 200 || $status >= 300) { http_response_code(503); echo json_encode(['error'=>'Não conseguimos registrar sua solicitação agora. Tente novamente.']); exit; }
echo json_encode(['ok'=>true]);
?>
