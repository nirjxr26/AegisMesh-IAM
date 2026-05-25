const DEFAULT_IP_POOL = [
    '203.45.112.88',
    '91.220.101.45',
    '172.16.254.1',
    '10.0.0.42',
    '185.220.101.7',
    '64.233.160.0',
    '34.77.102.18',
    '198.51.100.24',
    '203.0.113.9',
    '145.239.88.17',
];

// Allow overriding the seed IP pool via `SEED_IP_POOL` env var (comma-separated).
const poolFromEnv = process.env.SEED_IP_POOL
    ? process.env.SEED_IP_POOL.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

module.exports = {
    IP_POOL: poolFromEnv && poolFromEnv.length ? poolFromEnv : DEFAULT_IP_POOL,
};
