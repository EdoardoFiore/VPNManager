<?php
// frontend/includes/i18n.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Default language
$default_lang = 'it';

// Check session or cookie
if (isset($_SESSION['lang'])) {
    $current_lang = $_SESSION['lang'];
} elseif (isset($_COOKIE['lang'])) {
    $current_lang = $_COOKIE['lang'];
    $_SESSION['lang'] = $current_lang;
} else {
    $current_lang = $default_lang;
    $_SESSION['lang'] = $current_lang;
}

// Ensure valid lang
if (!in_array($current_lang, ['it', 'en'])) {
    $current_lang = $default_lang;
}

// Load translations
$lang_file = __DIR__ . "/../lang/{$current_lang}.php";
if (file_exists($lang_file)) {
    $translations = require $lang_file;
} else {
    $translations = [];
}

/**
 * Get translated string
 */
function __($key) {
    global $translations;
    return isset($translations[$key]) ? $translations[$key] : $key;
}

/**
 * Output translations as JS object
 */
function export_translations_to_js() {
    global $translations;
    echo '<script>';
    echo 'window.translations = ' . json_encode($translations) . ';';
    echo '</script>';
}
?>
