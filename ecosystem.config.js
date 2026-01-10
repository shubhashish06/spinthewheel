module.exports = {
  apps: [{
    name: 'spinthewheel-backend',
    script: './backend/server.js',
    cwd: '/home/ubuntu/spinthewheel',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
};
