import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    rehypePlugins: ["rehype-highlight", "rehype-slug", "rehype-autolink-headings", "remark-gfm"],
  },
});

const nextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
};

export default withMDX(nextConfig);
