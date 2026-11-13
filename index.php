<?php
// Respaldo para hosts que priorizan index.php sobre index.html.
// Debe quedar en la raíz del sitio (htdocs/).
header('Location: index.html', true, 302);
exit;
