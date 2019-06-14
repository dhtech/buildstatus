FROM nginx:1.17-alpine

LABEL maintainer="Sebastian Svensson <ventris@tech.dreamhack.se>"

LABEL org.label-schema.url="https://github.com/dhtech/buildstatus"
LABEL org.label-schema.docker="docker run -p 8080:80 quay.io/dhtech/buildstatus"

COPY buildstatus /usr/share/nginx/html
