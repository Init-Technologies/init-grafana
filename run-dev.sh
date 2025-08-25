#!/usr/bin/env bash
set -e  # Exit on any command failure


# pid=$(lsof -ti :35729)
# if [ -n "$pid" ]; then
#   echo "Killing process $pid on port 35729..."
#   kill -9 $pid
# fi
echo "Step 1: Running 'mage -v build:linux'..."
mage -v build:linux
echo "Step 2: "

npm run build -- --mode development

echo "Step 3: Restarting Docker Compose services..."
docker compose restart

echo "All steps completed successfully!"