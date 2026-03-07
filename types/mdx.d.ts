declare module "*.mdx" {
    let MDXComponent: (props: React.ComponentProps<"div">) => React.ReactNode;
    let MDXComponent: (props: MDXProps) => JSX.Element;
    export default MDXComponent;
}