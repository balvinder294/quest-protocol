
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes (88 chars Base64)
      args: '--port 8089 --name tekraze --key QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQQ== --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes (88 chars Base64)
      args: '--port 8096 --name kamranrkploy --key QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI== --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      // Decodes to exactly 64 bytes (88 chars Base64)
      args: '--port 8097 --name node_gamma --key Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0M== --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
