import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': [
      './Yemen_drug_company.db',
      './sql-wasm.wasm'
    ],
  },
};

export default nextConfig;
