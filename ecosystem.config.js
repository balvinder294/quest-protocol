
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Private Key Base64 format for alpha node
      args: '--port 8089 --name tekraze --key S3VndW5kYnN6ZzZnd2NodmFqc2RmdXNkcGZvamFzZGZqc2RmaGpzZGZqc2Rm --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      // Private Key Base64 format for beta node
      args: '--port 8096 --name kamranrkploy --key d2hhdGV2ZXJzaWduYXR1cmVrZXljb21lc2hlcmVmb3JiZXRhcHJvdG9jb2w= --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      // Private Key Base64 format for gamma node
      args: '--port 8097 --name node_gamma --key Z2FtbWFfcHJpdmF0ZV9rZXlfZW5jb2RlZF9iYXNlNjRfaGVyZV9mb3JfcHJvdG8= --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
