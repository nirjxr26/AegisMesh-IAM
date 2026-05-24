require('dotenv').config();

async function main() {
    const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const response = await fetch(`${baseUrl}/api/health`);

    console.log(`GET /api/health -> ${response.status}`);

    if (!response.ok) {
        console.error(`Request failed with status ${response.status}`);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('API health check failed');
    process.exitCode = 1;
});