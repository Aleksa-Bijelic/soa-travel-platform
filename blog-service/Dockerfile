FROM maven:3.9.5-eclipse-temurin-17 AS build
WORKDIR /workspace/app
COPY blog-service/pom.xml .
COPY blog-service/src ./src
COPY proto ./proto
RUN mvn -B package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /workspace/app/target/blog-service-0.0.1-SNAPSHOT.jar ./blog-service.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "blog-service.jar"]
