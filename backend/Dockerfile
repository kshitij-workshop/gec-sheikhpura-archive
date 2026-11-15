# Build the Spring Boot application with the repository's Maven wrapper.
FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace
COPY . .

RUN chmod +x ./mvnw \
    && ./mvnw -B package -DskipTests

# Keep the runtime image smaller and free of Maven/build tools.
FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/target/gecs-archive-api-0.1.0-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
