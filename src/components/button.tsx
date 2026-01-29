type ButtonProps = {
  text: string;
  type?: "button" | "submit";
  onClick?: () => void;
};

export default function Button({ text, type = "button", onClick }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid black",
        background: "black",
        color: "white",
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );
}