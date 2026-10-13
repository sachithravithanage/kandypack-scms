const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureAzureTunnel() {
  const localPort = parseInt(process.env.DB_PORT || '3307', 10);
  const vmHost = process.env.AZURE_VM_HOST || '20.2.211.30';
  const vmUser = process.env.AZURE_VM_USER || 'azureuser';

  const isOpen = await checkPort(localPort);
  if (isOpen) {
    return true;
  }

  const keyPath = path.join(os.homedir(), '.ssh', 'id_azure');
  if (!fs.existsSync(keyPath)) {
    console.warn(`[Azure Tunnel] SSH key not found at ${keyPath}. Tunnel may prompt for credentials.`);
  }

  console.log(`[Azure Tunnel] Establishing secure SSH tunnel to Azure MySQL (${vmHost}:3306) on port ${localPort}...`);

  try {
    const tunnel = spawn('ssh', [
      '-i', keyPath,
      '-N',
      '-L', `${localPort}:127.0.0.1:3306`,
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ServerAliveInterval=30',
      '-o', 'ServerAliveCountMax=3',
      `${vmUser}@${vmHost}`
    ], {
      detached: true,
      stdio: 'ignore'
    });

    tunnel.unref();

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await checkPort(localPort)) {
        console.log(`[Azure Tunnel] Connected! Port ${localPort} is forwarding to Azure MySQL.`);
        return true;
      }
    }
  } catch (err) {
    console.warn('[Azure Tunnel] Failed to start tunnel process automatically:', err.message);
  }

  return false;
}

module.exports = {
  checkPort,
  ensureAzureTunnel
};
