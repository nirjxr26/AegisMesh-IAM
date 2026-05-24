require('dotenv').config();

async function main() {
    const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const response = await fetch(`${baseUrl}/api/health`);

    console.log(`GET ${baseUrl}/api/health -> ${response.status}`);

    if (!response.ok) {
        const body = await response.text();
        console.error(body.slice(0, 200));
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});