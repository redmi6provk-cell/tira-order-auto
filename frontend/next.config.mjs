/** @type {import('next').NextConfig} */
const nextConfig = {
    // Explicitly disable Turbopack if it was somehow implied, though command flag is better.
    // React strict mode is good
    reactStrictMode: true,
};

export default nextConfig;
