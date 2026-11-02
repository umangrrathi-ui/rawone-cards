import next from "eslint-config-next";
import security from "eslint-plugin-security";

const config = [
  ...next,
  security.configs.recommended,
  { ignores: [".next/**", "node_modules/**", "out-print/**"] },
  { rules: { "security/detect-object-injection": "off", "@next/next/no-img-element": "off" } },
];
export default config;
