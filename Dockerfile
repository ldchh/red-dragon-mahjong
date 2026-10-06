FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

ENV PORT=7860
EXPOSE 7860

ENV PYTHONUNBUFFERED=1
CMD ["sh", "-lc", "echo '[entry] container command started'; echo \"[entry] PORT=$PORT\"; python -u app.py 2>&1"]
