ARG N8N_BASE=n8nio/n8n@sha256:526daa38b68e923cc00c5280d18b4da5d489f115a73bdbf3b8e452b184197a9a
FROM ${N8N_BASE}
USER root
COPY strip_webhook_auth.js /opt/dubakwi/strip_webhook_auth.js
RUN node /opt/dubakwi/strip_webhook_auth.js
USER node
LABEL org.opencontainers.image.title="dubakwi-n8n-auth-boundary"
LABEL dubakwi.n8n.version="2.42.6"
LABEL dubakwi.auth-boundary="v2"
