module.exports = {
  apps: [{
    name: 'autocard-server',
    script: 'server/dist/index.js',
    cwd: '/data/AutoCard',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3010
    }
  }]
};
