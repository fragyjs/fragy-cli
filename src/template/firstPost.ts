const zhCNTemplate = `
---
title: 你好，世界
date: {date}
---
当你看到这篇文章的时候，说明你已经成功初始化了你的Fragy站点。

这篇文章只是一个示例，你可以在 \`.fragy/posts\` 文件夹中删除它。
`;

const enTemplate = `
---
title: Hello world
date: {date}
---
Congratulations, you've created your site successfully with Fragy.

This post is just for demo, you can delete it in \`.fragy/posts\`.
`;

export default {
  'zh-CN': zhCNTemplate,
  en: enTemplate,
};
