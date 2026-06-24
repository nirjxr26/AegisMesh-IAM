const { LOOPBACK_IP, LOOPBACK_V6, IPV4_MAPPED_PREFIX } = require('../../src/config/constants');

module.exports = {
    LOOPBACK_IP,
    LOOPBACK_V6,
    IPV4_MAPPED_PREFIX,

    // Common sample addresses used in tests
    SAMPLE_IPV4_A: '1.2.3.4', // nosonar
    SAMPLE_IPV4_B: '192.168.1.10', // nosonar
    SAMPLE_IPV4_C: '10.0.0.1', // nosonar
    SAMPLE_IPV4_D: '10.0.0.50', // nosonar
    SAMPLE_IPV4_CIDR_24: '10.0.0.0/24', // nosonar
    SAMPLE_IPV4_CIDR_8: '10.0.0.0/8', // nosonar
    SAMPLE_IPV4_ALL: '0.0.0.0', // nosonar
    SAMPLE_IPV4_BROADCAST: '255.255.255.255', // nosonar
    SAMPLE_IPV6: '2001:db8::1', // nosonar
    SAMPLE_IPV6_CIDR: '2001:db8::/32', // nosonar
    MALFORMED_IP: '999.999.999.999', // nosonar
    SAMPLE_IPV4_CIDR_24_192: '192.168.0.0/24', // nosonar
    SAMPLE_IPV4_CIDR_ALL: '0.0.0.0/0', // nosonar
    SAMPLE_IPV4_CIDR_INVALID_33: '10.0.0.0/33', // nosonar
    SAMPLE_IPV4_CIDR_NEG: '10.0.0.0/-1', // nosonar
    SAMPLE_CIDR_EXTRA: '10.0.0.0/24/extra', // nosonar
    SAMPLE_IPV4_OUTSIDE: '10.0.1.1', // nosonar
    SAMPLE_IPV4_CIDR_192_168_2: '192.168.2.0/24', // nosonar
    SAMPLE_IPV4_IN_RANGE_192_168_2_5: '192.168.2.5', // nosonar
    SAMPLE_IPV4_172_16_0_1: '172.16.0.1', // nosonar
};
