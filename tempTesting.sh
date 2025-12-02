# To Move inside the backend-directory
cd /home/ubuntu/StorageApp-Backend

# Pull latest code
git pull

# Run tests (optional)
npm run test

# Remove all previous logs
pm2 flush api.safemystuff.store

# Restart the backend using PM2
pm2 restart api.safemystuff.store

# To View the latest logs
pm2 logs api.safemystuff.store
