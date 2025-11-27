<?php
session_start();
$_SESSION = array();
session_destroy();
setcookie("user_data", "", time() - 3600, "/");
setcookie("auth_token", "", time() - 3600, "/");
header("Location: /src/components/reg/index.html");
exit();
