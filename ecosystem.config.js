
module.exports = {
  apps: [
    {
      name: 'quest-node-alpha',
      script: 'witness-node.js',
      // Private Key 1
      args: '--port 8089 --name tekraze --key OqajXNQQG9GIAk4Yr2hWTdWckC9ULJ+A/2hrbRKdiJlm5Q/Kqx/4u8Ud1dvjNlfLLq6eYV4MpJ5iC9HIvy2edA== --db alpha --peers ws://localhost:8096,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-beta',
      script: 'witness-node.js',
      // Private Key 2
      args: '--port 8096 --name kamranrkploy --key N6jhE01pjosB1lQ7QI9n2Np2DK8+tNq+ukw1AuMmcUxFU6c+Q0gyFpLDSDVGOX//Rt/5kGtFx4pKzBGkOgACVw== --db beta --peers ws://localhost:8089,ws://localhost:8097,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'quest-node-gamma',
      script: 'witness-node.js',
      // Private Key 3
      args: '--port 8097 --name node_gamma --key 8xXyUWy9cSbsvYuKatlXxvERBB9MEaeo4CLVPrWtbX1aI23aVlc8j1xi57AS+zSDMrqyY45S/XdBLR7jo4oWow== --db gamma --peers ws://localhost:8089,ws://localhost:8096,wss://wsgaming.blurt.one',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
