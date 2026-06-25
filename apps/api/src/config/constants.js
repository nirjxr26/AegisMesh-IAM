// Central place for small runtime constants
// Allows overriding via environment for tests or deployments
const LOOPBACK_IP = process.env.LOOPBACK_IP || '127.0.0.1';
const LOOPBACK_V6 = process.env.LOOPBACK_V6 || '::1';
const IPV4_MAPPED_PREFIX = '::ffff:';
const BIND_ADDR = process.env.BIND_ADDR || '0.0.0.0';

module.exports = {
    LOOPBACK_IP,
    LOOPBACK_V6,
    IPV4_MAPPED_PREFIX,
    BIND_ADDR,
};
