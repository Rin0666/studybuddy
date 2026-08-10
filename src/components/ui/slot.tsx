import * as React from "react";

export function Slot({
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactElement }) {
  if (React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
      className: [props.className, children.props.className].filter(Boolean).join(" "),
      style: { ...props.style, ...children.props.style },
      onClick: (e: React.MouseEvent) => {
        props.onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
        children.props.onClick?.(e);
      },
    });
  }
  return null;
}
