import type { MDXComponents } from "mdx/types";
import { Children, isValidElement } from "react";
import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactNode,
} from "react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function headingText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string") return child;
      if (typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return headingText(child.props.children);
      }
      return "";
    })
    .join(" ")
    .trim();
}

function H2(props: ComponentPropsWithoutRef<"h2">) {
  const derivedId = slugify(headingText(props.children));
  const id = props.id || derivedId;
  const className = ["group scroll-mt-24 border-t pt-8", props.className]
    .filter(Boolean)
    .join(" ");

  return (
    <h2 {...props} id={id} className={className}>
      {props.children}
    </h2>
  );
}

function H3(props: ComponentPropsWithoutRef<"h3">) {
  const derivedId = slugify(headingText(props.children));
  const id = props.id || derivedId;
  const className = ["group scroll-mt-24", props.className]
    .filter(Boolean)
    .join(" ");

  return (
    <h3 {...props} id={id} className={className}>
      {props.children}
    </h3>
  );
}

function A(props: ComponentPropsWithoutRef<"a">) {
  const isExternal =
    typeof props.href === "string" && props.href.startsWith("http");
  const className = [
    "font-medium text-primary underline underline-offset-4 hover:text-primary/80",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <a
      {...props}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={className}
    />
  );
}

function Pre(props: ComponentPropsWithoutRef<"pre">) {
  const className = [
    "overflow-x-auto rounded-xl border border-border/70 bg-slate-950 p-4 text-[13px] text-slate-100",
    props.className,
  ]
    .filter(Boolean)
    .join(" ");

  return <pre {...props} className={className} />;
}

function Code(props: ComponentPropsWithoutRef<"code">) {
  const isBlockCode = props.className?.includes("language-");
  const className = isBlockCode
    ? ["!bg-transparent !text-slate-100", props.className]
        .filter(Boolean)
        .join(" ")
    : ["rounded px-1.5 py-0.5 text-[0.9em] font-medium", props.className]
        .filter(Boolean)
        .join(" ");

  return <code {...props} className={className} />;
}

function Hr(props: HTMLAttributes<HTMLHRElement>) {
  const className = ["my-8 border-border/60", props.className]
    .filter(Boolean)
    .join(" ");

  return <hr {...props} className={className} />;
}

const components: MDXComponents = {
  h2: H2,
  h3: H3,
  a: A,
  pre: Pre,
  code: Code,
  hr: Hr,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
