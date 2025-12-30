<?php
// frontend/change_lang.php
session_start();

$lang = isset($_GET['lang']) ? $_GET['lang'] : 'it';

if (in_array($lang, ['it', 'en'])) {
    $_SESSION['lang'] = $lang;
    setcookie('lang', $lang, time() + (86400 * 30), "/"); // 30 days
}

$redirect = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'index.php';
header("Location: $redirect");
exit;
?>
