#!/usr/bin/bash

# Define variables for configuration paths and domain
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/"
EXPRESS_APP_CONF="/var/www/tankhwapatra-backend/express-app-nginx.conf"
DOMAINS=("apitankhwapatra.tankhwapatra.co.in" "chat.tankhwapatra.co.in")
EMAIL="prince.veritastechnolabs@gmail.com"

# Function to copy NGINX configuration files only if they have changed
copy_nginx_conf_if_needed() {
  echo 'run copy_nginx_conf_if_needed ' >> /var/www/tankhwapatra-backend/deploy.log

  if ! cmp -s "$EXPRESS_APP_CONF" "$NGINX_SITES_ENABLED$EXPRESS_APP_CONF"; then
    echo 'run copy_nginx_conf_if_needed IF PART 2' >> /var/www/tankhwapatra-backend/deploy.log
    sudo cp "$EXPRESS_APP_CONF" "$NGINX_SITES_ENABLED"
    nginx_reload_needed=true
  fi
}

# Function to reload NGINX if configuration changes were made
reload_nginx_if_needed() {
  echo 'run reload_nginx_if_needed' >> /var/www/tankhwapatra-backend/deploy.log
  if [ "$nginx_reload_needed" = true ]; then
    echo 'run reload_nginx_if_needed IF PART' >> /var/www/tankhwapatra-backend/deploy.log
    nginx -t && nginx -s reload
  fi
}

# Function to obtain or renew SSL certificates for multiple domains
obtain_or_renew_ssl_certificates() {
  echo 'run obtain_or_renew_ssl_certificates' >> /var/www/tankhwapatra-backend/deploy.log
  for DOMAIN in "${DOMAINS[@]}"; do
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

    if [ ! -f "$CERT_PATH" ]; then
      sudo systemctl stop nginx
      echo "Generating SSL for \"$DOMAIN\"" >> /var/www/tankhwapatra-backend/deploy.log
      # SSL certificate doesn't exist, obtain a new one
      # certbot --nginx --non-interactive --agree-tos --redirect --email "$EMAIL" -d "$DOMAIN" 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log - DISABLING AS --nginx MODIFIES NGINX
      certbot certonly --standalone --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log
      sudo systemctl start nginx

    else
      echo "Renewing SSL for \"$DOMAIN\"" >> /var/www/tankhwapatra-backend/deploy.log
      # SSL certificate exists, renew if needed
      certbot renew --non-interactive --quiet --post-hook "nginx -s reload" 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log
    fi
  done
}

# Function to start or restart the Node.js application using PM2
start_or_restart_pm2_app() {
    LOG_FILE="/var/www/tankhwapatra-backend/deploy.log"
    
    echo "$(date) - run start_or_restart_pm2_app" >> "$LOG_FILE"
    
    if ! pm2 stop tankhwapatra-backend 2>&1 | tee -a "$LOG_FILE"; then
        echo "$(date) - Failed to stop PM2 API application" | tee -a "$LOG_FILE"
    fi
    
    if ! pm2 start /var/www/tankhwapatra-backend/config/api.ecosystem.config.js 2>&1 | tee -a "$LOG_FILE"; then
        echo "$(date) - Failed to start PM2 API application" | tee -a "$LOG_FILE"
        return 1
    fi


    echo "$(date) - PM2 application started successfully" >> "$LOG_FILE"
    return 0
}


load_env_from_secrets_manager() {
  echo 'run load_env_from_secrets_manager' >> /var/www/tankhwapatra-backend/deploy.log

  # clear .env file
  rm -rf /var/www/tankhwapatra-backend/.env

  # Define your Secret ID
  SECRET_ID="prod/tankhwapatra-backend"

  # Fetch the secret value
  SECRET_STRING=$(aws secretsmanager get-secret-value --secret-id $SECRET_ID --query SecretString --output text)
  
  # Convert JSON to key=value format and write to .env file
  echo "$SECRET_STRING" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' > /var/www/tankhwapatra-backend/.env
}

install_dependencies() {
  # Remove existing node_modules and package-lock.json
  rm -rf /var/www/tankhwapatra-backend/node_modules
  rm -rf /var/www/tankhwapatra-backend/package-lock.json

  # Use the specified Node version
  nvm use 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log

  # Install specific version of phantomjs
  npm install phantomjs-prebuilt@2.1.13 --ignore-scripts 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log

  # Install all other dependencies
  npm install 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log

  # Install Puppeteer dependencies
  cd /var/www/tankhwapatra-backend/node_modules/puppeteer || exit
  npm install 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log
  cd ../.. || exit

  # Install bcrypt dependencies
  cd /var/www/tankhwapatra-backend/node_modules/bcrypt || exit
  make 2>&1 | tee -a /var/www/tankhwapatra-backend/deploy.log
}



echo 'run after-install.sh: ' >> /var/www/tankhwapatra-backend/deploy.log

cd /var/www/tankhwapatra-backend

export NVM_DIR="/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"



# Main deployment steps
nginx_reload_needed=false

# 0. Install Dependencies
install_dependencies

# 1. Create .env file
load_env_from_secrets_manager

# 2. Copy NGINX configuration files if they have changed
copy_nginx_conf_if_needed

# 3. Reload NGINX if configuration changes were made
reload_nginx_if_needed

# 4. Obtain or renew SSL certificates for all domains
# obtain_or_renew_ssl_certificates TODO: Check if really needed

# 5. Start or restart the Node.js application using PM2
start_or_restart_pm2_app