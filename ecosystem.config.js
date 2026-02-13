
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Valid 64-byte Ed25519 Secret Key Base64
      args: '--port 8089 --name tekraze --key dGVrcmF6ZV9hbHBoYV9rZXlfNjRfYnl0ZXNfX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXw== --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      // Valid 64-byte Ed25519 Secret Key Base64
      args: '--port 8096 --name kamranrkploy --key a2FtcmFuX2JldGFfa2V5XzY0X2J5dGVzX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19f --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      // Valid 64-byte Ed25519 Secret Key Base64
      args: '--port 8097 --name node_gamma --key Z2FtbWFfZ2FtbWFfa2V5XzY0X2J5dGVzX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19f --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
