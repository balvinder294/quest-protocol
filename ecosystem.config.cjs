
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes
      args: '--port 8089 --name tekraze --key YWxwaGFfbm9kZV9zaWduZXJfc2VjcmV0X2tleV9leGFjdGx5XzY0X2J5dGVzX2xvbmdfX19fX19fX19fX19fXw== --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes
      args: '--port 8096 --name kamranrkploy --key YmV0YV9fbm9kZV9zaWduZXJfc2VjcmV0X2tleV9leGFjdGx5XzY0X2J5dGVzX2xvbmdfX19fX19fX19fX19fXw== --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes
      args: '--port 8097 --name node_gamma --key Z2FtbWFfbm9kZV9zaWduZXJfc2VjcmV0X2tleV9leGFjdGx5XzY0X2J5dGVzX2xvbmdfX19fX19fX19fX19fXw== --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
