# Discord Gateway adapter preparation

This adapter implements the agreed Discord boundary without changing the n8n support workflow.

## Implemented boundary

- Registers `/문의 내용:<question> case_ref:<optional>` only in the configured guild.
- Restricts execution to the configured channel when a channel ID is supplied.
- Sends an ephemeral defer before calling `POST /webhook/dubakwi-support`.
- Converts the Discord interaction to `request_id=dc-<interaction_id>`, `user=<registered user
  ID from the server-side user map>`, `question`, `channel=discord`, and optional `case_ref`.
- Uses `X-Team-Key`, returns only the answer, up to five source references (document and section),
  the case reference, and the confirmed Jira key, and does not log message contents or
  credentials. Timeouts, network errors, unknown errors, and `case_busy` never invite a
  resubmission: the notice asks the citizen to confirm with staff to avoid duplicate intake.
- Does not collect ordinary channel messages, attachments, display names, or role claims.

The bot maps the Discord user ID to a registered user ID before calling support, using the private
`DUBAKWI_DISCORD_USER_MAP` (`<discord id>:<registered user id>`, comma separated). Accounts not in
the map get a private refusal and support is not called. The downstream user API still decides the
role and access levels. Discord membership alone grants no access.

## Private VM inputs

Keep all real values outside Git. Required settings are:

- `DUBAKWI_DISCORD_BOT_TOKEN_FILE`: readable secret file containing the bot token.
- `DUBAKWI_DISCORD_USER_MAP`: private Discord-to-registered-user table; never commit or log it.
- `DUBAKWI_DISCORD_GUILD_ID` and `DUBAKWI_DISCORD_CHANNEL_ID`: allowed test scope.
- `DUBAKWI_SUPPORT_WEBHOOK_URL`: internal n8n URL, normally on the existing Docker network.
- `DUBAKWI_TEAM_KEY_FILE`: readable secret file matching n8n `dubakwi-team-key`.
- `DUBAKWI_N8N_NETWORK`: existing external Docker network name.

The bot needs permission to use application commands and send messages in the test channel. It
does not request Message Content intent because ordinary messages are outside the agreed scope.

## Validation and activation order

1. R01 confirms the existing network and mounts the two private secret files.
2. Validate without starting: `docker compose --env-file <private-env> -f
   infra/discord-bot-compose.yaml config`.
3. Build the adapter image and record its immutable image ID or digest.
4. Start only `discord-bot`; do not restart n8n or change the public P19 workflow.
5. Confirm `/문의` appears in the allowed test server/channel.
6. Run one registered-user request and one unregistered-user request. Confirm both replies are
   ephemeral and that only the registered request reaches the normal support path.
7. Repeat the same interaction delivery and confirm the same `dc-<interaction_id>` is used and no
   duplicate Jira effect occurs.

Stopping or removing only the `discord-bot` service is the rollback. It does not remove Jira,
PostgreSQL, n8n workflows, credentials, or volumes.
