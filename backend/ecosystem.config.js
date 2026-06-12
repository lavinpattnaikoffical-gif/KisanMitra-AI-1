// PM2 Ecosystem Config — AWS EC2 Deployment
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'kisanmitra-api',
      script: 'dist/server.js',
      instances: 'max',            // Cluster mode — one per CPU core
      exec_mode: 'cluster',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Log config
      out_file: '/var/log/kisanmitra/out.log',
      error_file: '/var/log/kisanmitra/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
