#!/bin/sh
set -e

# Inject CF service token credentials from env vars into nginx config at container startup.
# Only ${CF_CLIENT_ID} and ${CF_CLIENT_SECRET} are substituted — all nginx $variables are left intact.
envsubst '${CF_CLIENT_ID} ${CF_CLIENT_SECRET}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec "$@"
