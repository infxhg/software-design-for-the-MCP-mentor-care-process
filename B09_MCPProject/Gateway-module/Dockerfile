FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace

COPY . .
RUN set -eux; \
    retry() { n=0; until [ "$n" -ge 3 ]; do "$@" && break; n=$((n+1)); echo "retry $n: $*"; sleep 5; done; [ "$n" -lt 3 ]; }; \
    retry mvn -B -ntp -Dmaven.wagon.http.retryHandler.count=5 -Dhttps.protocols=TLSv1.2 -f Gateway-module/pom.xml -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /workspace/Gateway-module/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
