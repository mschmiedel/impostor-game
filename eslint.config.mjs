import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["playwright-report/**", "test-results/**", ".next/**"] },
  ...nextConfig,
];

export default config;
