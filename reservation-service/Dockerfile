FROM golang:alpine

WORKDIR /app

COPY proto ./proto
COPY saga ./saga
COPY reservation-service/ ./reservation-service/

WORKDIR /app/reservation-service

RUN go mod tidy

EXPOSE 8085
ENTRYPOINT ["go", "run", "main.go"]
