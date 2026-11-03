import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: { "/*": ["./data/**/*"] },
  serverExternalPackages: ["sharp", "@huggingface/transformers", "onnxruntime-node"],
};
export default nextConfig;
