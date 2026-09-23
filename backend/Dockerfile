# AlcancIA API — production image.
#   docker build -t alcancia-api ./backend
#   docker run -p 8080:8080 --env-file api.env alcancia-api
# All secrets come from the environment (see docs/DEPLOY.md); none are baked in.

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY AlcancIA.sln ./
COPY AlcancIA.Domain/AlcancIA.Domain.csproj AlcancIA.Domain/
COPY AlcancIA.Application/AlcancIA.Application.csproj AlcancIA.Application/
COPY AlcancIA.Infrastructure/AlcancIA.Infrastructure.csproj AlcancIA.Infrastructure/
COPY AlcancIA.Api/AlcancIA.Api.csproj AlcancIA.Api/
RUN dotnet restore AlcancIA.Api/AlcancIA.Api.csproj
COPY AlcancIA.Domain/ AlcancIA.Domain/
COPY AlcancIA.Application/ AlcancIA.Application/
COPY AlcancIA.Infrastructure/ AlcancIA.Infrastructure/
COPY AlcancIA.Api/ AlcancIA.Api/
RUN dotnet publish AlcancIA.Api/AlcancIA.Api.csproj -c Release -o /app --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_HTTPS_PORT=443 \
    Database__MigrateOnStartup=true \
    Hosting__BehindProxy=true \
    DOTNET_gcServer=0
EXPOSE 8080
# The aspnet image ships a non-root "app" user.
USER app
# Health probes: configure the platform to call GET /health (liveness) and
# GET /health/ready (readiness, includes the database).
ENTRYPOINT ["dotnet", "AlcancIA.Api.dll"]
