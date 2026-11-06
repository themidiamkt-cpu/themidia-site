<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Método no permitido.']); exit; }
$raw = file_get_contents('php://input');
if (strlen($raw) > 12000) { http_response_code(413); echo json_encode(['error'=>'Envío demasiado grande.']); exit; }
$input = json_decode($raw, true);
if (!is_array($input) || trim((string)($input['website'] ?? '')) !== '') { http_response_code(400); echo json_encode(['error'=>'Datos inválidos.']); exit; }
$nombre = trim((string)($input['nombre'] ?? ''));
$negocio = trim((string)($input['negocio'] ?? ''));
$rubro = trim((string)($input['rubro'] ?? ''));
$instagram = ltrim(preg_replace('/\s+/', '', trim((string)($input['instagram'] ?? ''))), '@');
$phone = preg_replace('/\D+/', '', (string)($input['whatsapp'] ?? ''));
if (str_starts_with($phone, '591')) $phone = substr($phone, 3);
$okIg = $instagram === '' || preg_match('/^(?!\.)(?!.*\.\.)(?!.*\.$)[A-Za-z0-9_.]{1,30}$/', $instagram);
if (mb_strlen($nombre) < 2 || mb_strlen($nombre) > 100 || mb_strlen($negocio) < 2 || mb_strlen($negocio) > 120 || mb_strlen($rubro) < 2 || mb_strlen($rubro) > 120 || !$okIg || !preg_match('/^[67]\d{7}$/', $phone)) { http_response_code(400); echo json_encode(['error'=>'Revisa tus datos.']); exit; }
$allowed = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
$payload = ['event'=>'lead_bolivia_diagnostico','source'=>'lp_bolivia','country'=>'BO','language'=>'es','nombre'=>$nombre,'negocio'=>$negocio,'rubro'=>$rubro,'instagram'=>$instagram !== '' ? $instagram : null,'instagram_url'=>$instagram !== '' ? 'https://www.instagram.com/'.$instagram.'/' : null,'whatsapp'=>'+591'.$phone,'whatsapp_digits'=>'591'.$phone,'submitted_at'=>gmdate('c'),'page_url'=>substr((string)($input['page_url'] ?? ''),0,500)];
foreach ($allowed as $key) $payload[$key] = !empty($input[$key]) ? substr((string)$input[$key],0,500) : null;
// Webhook n8n a criar: workflow "bolivia" recebendo este payload (ver nota do projeto).
$ch = curl_init('https://automacao2.themidiamarketing.com.br/webhook/bolivia');
curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES), CURLOPT_HTTPHEADER=>['Content-Type: application/json'], CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8, CURLOPT_CONNECTTIMEOUT=>4]);
$response = curl_exec($ch); $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
if ($response === false || $status < 200 || $status >= 300) { http_response_code(503); echo json_encode(['error'=>'No pudimos registrar tu solicitud ahora.']); exit; }
echo json_encode(['ok'=>true]);
