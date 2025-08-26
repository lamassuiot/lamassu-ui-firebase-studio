#!/bin/bash
set -e

rm -rf /var/www/html/config.js
cat /tmpl/config.js.tmpl | envsubst  > /var/www/html/config.js
nginx -g "daemon off;"