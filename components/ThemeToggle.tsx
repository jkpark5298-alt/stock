"use client";

type Props = {
  darkMode: boolean;
  onToggle: () => void;
};

export default function ThemeToggle({ darkMode, onToggle }: Props) {
  return (
    <button className="button secondary" onClick={onToggle} type="button">
      {darkMode ? "라이트모드" : "다크모드"}
    </button>
  );
}
