<?php
// Простой почтовый скрипт: Node-API шлёт сюда POST {secret,to,subject,link},
// PHP отправляет письмо через mail(). Разместить в PHP-доступном каталоге сайта
// (FastPanel → сайт с поддержкой PHP), доступным по MAILER_URL из .env API.
//
// БЕЗОПАСНОСТЬ: задайте общий секрет в MAILER_SECRET (env) — тот же, что в .env API.

header('Content-Type: application/json; charset=utf-8');

// секрет: из окружения или впишите строку прямо здесь
$SECRET = getenv('MAILER_SECRET') ?: 'ЗАМЕНИТЕ_НА_ОБЩИЙ_СЕКРЕТ';
$FROM   = getenv('MAILER_FROM')   ?: 'no-reply@formulaedi.ru';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad json']);
    exit;
}

if (!hash_equals($SECRET, (string)($data['secret'] ?? ''))) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

$to      = filter_var($data['to'] ?? '', FILTER_VALIDATE_EMAIL);
$subject = trim((string)($data['subject'] ?? 'Формула Еды'));
$link    = (string)($data['link'] ?? '');
if (!$to || $link === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'to/link']);
    exit;
}

$safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
$body = "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#2c3118\">"
      . "<p>Здравствуйте!</p>"
      . "<p>Подтвердите вашу почту в «Формула Еды», перейдя по ссылке:</p>"
      . "<p><a href=\"$safeLink\" style=\"display:inline-block;background:#8f9f3f;color:#fff;"
      . "padding:10px 20px;border-radius:999px;text-decoration:none\">Подтвердить почту</a></p>"
      . "<p>Или скопируйте ссылку: <br>$safeLink</p>"
      . "<p style=\"color:#6c7159;font-size:12px\">Если вы не запрашивали подтверждение — просто игнорируйте письмо.</p>"
      . "</body></html>";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: Формула Еды <' . $FROM . '>',
];

$ok = mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

echo json_encode(['ok' => (bool)$ok] + ($ok ? [] : ['error' => 'mail() failed']));
