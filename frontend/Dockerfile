# Build stage
FROM node:20-slim as build

WORKDIR /app
COPY package*.json ./
# Clean install with legacy peer deps
RUN npm ci --legacy-peer-deps

COPY . .

# Pass API URL at build time if needed
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
