export default function Button({ children, variant="primary", className="", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium";
  const styles = {
    primary: "bg-gray-900 text-white hover:bg-black",
    secondary: "bg-white border hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant] || "";
  return <button className={`${base} ${styles} ${className}`} {...props}>{children}</button>;
}
