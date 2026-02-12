
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Runs on 8089. Peers with Beta(8090), Gamma(8091), and the Public Gateway
      args: '--port 8089 --name tekraze --db alpha --peers ws://localhost:8090,ws://localhost:8091,wss://wsgaming.blurt.one',
      node_args: '--experimental-modules',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      node_args: '--experimental-modules',

      // Runs on 8090. Peers with Alpha(8089), Gamma(8091), and the Public Gateway
      args: '--port 8090 --name kamranrkploy --db beta --peers ws://localhost:8089,ws://localhost:8091,wss://wsgaming.blurt.one',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      node_args: '--experimental-modules',

      // Runs on 8091. Peers with Alpha(8089), Beta(8090), and the Public Gateway
      args: '--port 8091 --name node_gamma --db gamma --peers ws://localhost:8089,ws://localhost:8090,wss://wsgaming.blurt.one',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
