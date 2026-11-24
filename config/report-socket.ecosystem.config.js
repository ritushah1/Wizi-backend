module.exports = {
  apps: [
    {
      name: "tankhwapatra-report-socket",
      script: "app.js",
      args: "report-socket",
      exec_mode: "fork",
      watch: false,
      autorestart: true,
    },
  ],
};
