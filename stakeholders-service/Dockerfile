FROM golang:alpine

WORKDIR /app

COPY proto ./proto
COPY saga ./saga
COPY stakeholders-service/ ./stakeholders-service/

WORKDIR /app/stakeholders-service

RUN go mod tidy

EXPOSE 8080
ENTRYPOINT ["go", "run", "main.go"]