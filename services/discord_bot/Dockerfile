FROM python:3.12.12-slim-bookworm

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv==0.9.5 && uv sync --frozen --no-dev
COPY services ./services

USER 65532:65532
CMD ["/app/.venv/bin/python", "-m", "services.discord_bot.bot"]
