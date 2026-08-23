export function ArrowIcon({ direction = "north-east" }: { direction?: "north-east" | "south-east" }) {
  return (
    <svg
      aria-hidden="true"
      className="arrow-icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {direction === "north-east" ? (
        <path d="M4.5 15.5 15.5 4.5M7 4.5h8.5V13" />
      ) : (
        <path d="M4.5 4.5 15.5 15.5M15.5 7v8.5H7" />
      )}
    </svg>
  );
}
