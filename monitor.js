#!/usr/bin/env node

/**
 * MyTokenCost Production Monitoring
 * Checks API health, database connectivity, and response times
 */

import https from 'https';

const BACKEND_URL = 'https://mytokencost-production.up.railway.app';
const ALERTS = {
  response_time_warning: 2000, // 2s
  response_time_error: 5000,   // 5s
  error_rate_warning: 0.05,    // 5%
  error_rate_error: 0.10       // 10%
};

const tests = {
  health: async () => {
    return await checkEndpoint('/api/health', 'Health Check');
  },

  register: async () => {
    const data = JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: 'test123',
      organizationName: 'Monitor'
    });
    return await checkEndpoint('/api/auth/register', 'Register', 'POST', data);
  },

  login: async () => {
    const data = JSON.stringify({
      email: 'final-test@example.com',
      password: 'senha123'
    });
    return await checkEndpoint('/api/auth/login', 'Login', 'POST', data);
  }
};

async function checkEndpoint(path, name, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const options = {
      hostname: 'mytokencost-production.up.railway.app',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const status = res.statusCode;
        const success = status >= 200 && status < 300;

        let statusEmoji = '✅';
        let statusMsg = 'OK';

        if (responseTime > ALERTS.response_time_error) {
          statusEmoji = '🔴';
          statusMsg = 'SLOW';
        } else if (responseTime > ALERTS.response_time_warning) {
          statusEmoji = '🟡';
          statusMsg = 'WARN';
        }

        if (!success) {
          statusEmoji = '❌';
          statusMsg = `HTTP ${status}`;
        }

        resolve({
          name,
          status: success ? 'PASS' : 'FAIL',
          statusCode: status,
          responseTime,
          emoji: statusEmoji,
          message: `${statusEmoji} ${name}: ${statusMsg} (${responseTime}ms)`
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        status: 'FAIL',
        statusCode: 0,
        responseTime: Date.now() - startTime,
        emoji: '❌',
        message: `❌ ${name}: ${err.message}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        status: 'FAIL',
        statusCode: 0,
        responseTime: Date.now() - startTime,
        emoji: '⏱️',
        message: `⏱️ ${name}: Timeout`
      });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function runMonitoring() {
  console.log('\n📊 MyTokenCost Production Monitor');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`🎯 Backend: ${BACKEND_URL}\n`);

  const results = [];

  for (const [testName, testFn] of Object.entries(tests)) {
    const result = await testFn();
    results.push(result);
    console.log(result.message);
  }

  const passCount = results.filter(r => r.status === 'PASS').length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log(`\n📈 Summary:`);
  console.log(`   Pass Rate: ${passCount}/${results.length} (${Math.round(passCount/results.length*100)}%)`);
  console.log(`   Avg Response: ${avgResponseTime}ms`);

  if (passCount === results.length) {
    console.log(`\n✅ All systems operational!\n`);
    process.exit(0);
  } else {
    console.log(`\n⚠️ Some systems down or degraded\n`);
    process.exit(1);
  }
}

runMonitoring().catch(err => {
  console.error('Monitor error:', err);
  process.exit(1);
});
