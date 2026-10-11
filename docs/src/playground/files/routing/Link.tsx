export function Link(props: { href: string; children: string }) {
  return (
    <a href={props.href} style="color: #2563eb; text-decoration: underline; margin-right: 12px;">
      {props.children}
    </a>
  );
}
