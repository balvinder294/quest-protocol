
require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      args: '--port 8089 --name tekraze --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        QUEST_PRIVATE_KEY: process.env.QUEST_KEY_ALPHA
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      args: '--port 8096 --name kamranrkploy --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        QUEST_PRIVATE_KEY: process.env.QUEST_KEY_BETA
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      args: '--port 8097 --name node_gamma --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        QUEST_PRIVATE_KEY: process.env.QUEST_KEY_GAMMA
      }
    }
  ]
};
