<?php
// Локальный почтовый скрипт. Запускается API через `php mailer.php`,
// данные приходят JSON-ом на stdin: {"to","subject","link"}. Отправляет письмо через mail().
// Никаких URL/секретов не нужно — это локальный запуск процесса на сервере.
// Требуется настроенный php mail() (в FastPanel обычно работает).

$raw = stream_get_contents(STDIN);
$data = json_decode($raw, true);
if (!is_array($data)) {
    fwrite(STDERR, "bad json\n");
    exit(1);
}

$to      = filter_var($data['to'] ?? '', FILTER_VALIDATE_EMAIL);
$subject = trim((string)($data['subject'] ?? 'Формула Еды'));
$link    = (string)($data['link'] ?? '');
if (!$to || $link === '') {
    fwrite(STDERR, "to/link required\n");
    exit(1);
}

$from = 'no-reply@formulaedi.ru';
$safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
$body = "<!doctype html><html><body style=\"font-family:Arial,sans-serif;color:#2c3118\">"
      . "<p>Здравствуйте!</p>"
      . "<p>Подтвердите вашу почту в «Формула Еды», перейдя по ссылке:</p>"
      . "<p><a href=\"$safeLink\" style=\"display:inline-block;background:#8f9f3f;color:#fff;"
      . "padding:10px 20px;border-radius:999px;text-decoration:none\">Подтвердить почту</a></p>"
      . "<p>Или скопируйте ссылку:<br>$safeLink</p>"
      . "<p style=\"color:#6c7159;font-size:12px\">Если вы не запрашивали подтверждение — игнорируйте письмо.</p>"
      . "</body></html>";

$headers = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: Формула Еды <' . $from . '>',
]);

$ok = mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
if (!$ok) {
    fwrite(STDERR, "mail() failed\n");
    exit(1);
}
echo "ok\n";
