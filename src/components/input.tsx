type InputProps = {
  placeholder: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
};

export default function Input({
  placeholder,
  value,
  type = "text",
  onChange,
}: InputProps) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      type={type}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #ccc",
        width: "100%",
      }}
    />
  );
}