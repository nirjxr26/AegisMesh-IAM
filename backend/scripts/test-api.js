require('dotenv').config();

async function main() {
    const baseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.text();

    console.log(`GET ${baseUrl}/api/health -> ${response.status}`);
    console.log(body);

    if (!response.ok) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});