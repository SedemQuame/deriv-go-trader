#!/bin/bash
set -e

echo "Starting Sales Site Deployment Setup..."

# Check Heroku CLI
if ! command -v heroku &> /dev/null; then
    echo "Error: Heroku CLI not found. Please install it first."
    exit 1
fi

# Login
echo "Please log in to Heroku (browser will open):"
heroku login

# Create App
echo "Creating Heroku App..."
OUTPUT=$(heroku create)
echo "$OUTPUT"

# Extract App Name
APP_URL=$(echo "$OUTPUT" | grep -o 'https://.*.herokuapp.com/')
APP_NAME=$(echo "$APP_URL" | sed 's/https:\/\///;s/.herokuapp.com\///')

if [ -z "$APP_NAME" ]; then
    echo "Could not auto-detect App Name. Please enter the App Name created above:"
    read APP_NAME
fi

echo "Detected App Name: $APP_NAME"

# Set Config Vars
echo "Setting up environment variables from sales-site/.env.local..."
if [ -f sales-site/.env.local ]; then
    # Read .env.local and set config vars
    # We use a loop to handle lines with spaces correctly
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        if [[ "$line" =~ ^#.* ]] || [[ -z "$line" ]]; then
            continue
        fi
        echo "Setting $line..."
        heroku config:set "$line" -a "$APP_NAME"
    done < sales-site/.env.local
else
    echo "Warning: sales-site/.env.local not found. Skipping environment variables setup."
fi

echo ""
echo "---------------------------------------------------"
echo "Deployment App Created Successfully!"
echo "App Name: $APP_NAME"
echo "URL: $APP_URL"
echo "---------------------------------------------------"
echo "NEXT STEPS for Auto-Updates:"
echo "1. Go to your Bitbucket Repository -> Repository Settings -> Pipelines -> Repository variables."
echo "2. Add the following variables (make sure to secure/mask the API Key):"
echo "   - HEROKU_API_KEY"
echo "     (Get this by running: heroku auth:token)"
echo "   - HEROKU_APP_NAME"
echo "     (Value: $APP_NAME)"
echo "---------------------------------------------------"
