// Horizen brand wordmark. Uses the supplied artwork (navy wordmark on the brand
// yellow), served from /public. Intrinsic size 165×41; height-constrained here.
export function Logo({ height = 28 }: { height?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/horizen-logo.jpg"
      alt="Horizen"
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
