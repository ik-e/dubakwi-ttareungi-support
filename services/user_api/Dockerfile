FROM python:3.12.12-slim-bookworm

RUN useradd --create-home --uid 10001 dubakwi
WORKDIR /app
COPY --chown=dubakwi:dubakwi data/users.json data/records.json /app/data/
COPY --chown=dubakwi:dubakwi services/user_api/server.py /app/services/user_api/server.py
USER dubakwi
EXPOSE 8801
CMD ["python", "/app/services/user_api/server.py"]
