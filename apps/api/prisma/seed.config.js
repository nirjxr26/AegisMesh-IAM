const DEFAULT_IP_POOL = [
    '203.45.112.88', // nosonar
    '91.220.101.45', // nosonar
    '172.16.254.1',  // nosonar
    '10.0.0.42',     // nosonar
    '185.220.101.7', // nosonar
    '64.233.160.0',  // nosonar
    '34.77.102.18',  // nosonar
    '198.51.100.24', // nosonar
    '203.0.113.9',   // nosonar
    '145.239.88.17', // nosonar
];

// Allow overriding the seed IP pool via `SEED_IP_POOL` env var (comma-separated).
const poolFromEnv = process.env.SEED_IP_POOL
    ? process.env.SEED_IP_POOL.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

module.exports = {
    IP_POOL: poolFromEnv?.length ? poolFromEnv : DEFAULT_IP_POOL,
};
