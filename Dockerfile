FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html manifest.json sw.js app.js styles.css widget.html widget.js widget.css icon.png /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
