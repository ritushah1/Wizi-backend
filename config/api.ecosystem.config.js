module.exports = {
  apps: [
    {
      name: 'tankhwapatra-backend',
      script: 'app.js',
      args: 'api',
      exec_mode: 'cluster',
      instances: 3, // 3 Node.js worker processes
      watch: false,
      autorestart: true,
      node_args: '--max-old-space-size=3400', // Set the maximum memory limit to 3.4 GB
    },
  ],
};