FROM python:3.11-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 3004

CMD ["gunicorn", "--bind", "0.0.0.0:3004", "--workers", "2", "--timeout", "30", "app:app"]
