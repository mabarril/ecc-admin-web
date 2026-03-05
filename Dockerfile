# Stage 1: Build Angular APP
FROM node:20-alpine AS build
WORKDIR /app

# Only copy web folder to build frontend
COPY web/package*.json ./
RUN npm install

COPY web/ ./
RUN npm run build -- --configuration production

# Stage 2: Serve via Nginx
FROM nginx:alpine

# Copia a configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build da aplicação Angular. No Angular 17+ app builder, 
# a saída padrão fica em dist/<project-name>/browser.
# Se a pasta browser não existir, ele vai falhar e o ideal seria copiar public ou outro, 
# mas esse path cobre o novo padrão.
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
