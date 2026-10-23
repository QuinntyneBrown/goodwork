# Builds the Angular app, publishes the API with the app inside wwwroot, and runs it.
FROM node:24-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY docs/design-system/tokens/tokens.css /src/docs/design-system/tokens/tokens.css
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src/backend
COPY backend/ ./
COPY --from=frontend /src/frontend/dist/goodwork/browser ./src/Goodwork.Api/wwwroot
RUN dotnet publish src/Goodwork.Api -c Release -o /out/api \
 && dotnet publish src/Goodwork.Cli -c Release -o /out/cli

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /out/api ./api
COPY --from=backend /out/cli ./cli
ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Goodwork="Data Source=/data/goodwork.db"
VOLUME /data
EXPOSE 8080
# Run `dotnet cli/Goodwork.Cli.dll migrate` before the first start and after each release.
ENTRYPOINT ["dotnet", "api/Goodwork.Api.dll"]
