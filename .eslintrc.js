module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended", // 使用推荐的规则
    "plugin:prettier/recommended", // 启用 Prettier
  ],
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error", // 将 Prettier 规则视为错误
    // 你可以在这里添加自定义规则
  },
};
