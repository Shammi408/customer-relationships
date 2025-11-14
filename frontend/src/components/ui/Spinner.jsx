export default function Spinner({ className = "" }) {
  return (
    <div className={"inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 " + className} />
  );
}
