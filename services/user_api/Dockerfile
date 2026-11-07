FROM python:3.12.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /bin/uv

RUN useradd --create-home --uid 10001 dubakwi
WORKDIR /app
ENV DUBAKWI_RECORDS_MODE=jira
COPY pyproject.toml uv.lock /app/
RUN uv sync --locked --no-dev --no-install-project --extra records
COPY --chown=dubakwi:dubakwi data/users.json data/records.json /app/data/
COPY --chown=dubakwi:dubakwi services/__init__.py /app/services/__init__.py
COPY --chown=dubakwi:dubakwi services/user_api/ /app/services/user_api/
USER dubakwi
EXPOSE 8801
CMD ["/app/.venv/bin/python", "-m", "services.user_api.server"]
