import React, { useEffect, useMemo, useState } from "react";

// =====================
// Tipos
// =====================
export interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number; // em BRL
  date: string;   // ISO yyyy-mm-dd
}

type MonthKey = string; // ex.: "2025-08"

// =====================
// Utilidades tipadas
// =====================
const currency: Intl.NumberFormat = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const pad = (n: number): string => String(n).padStart(2, "0");

const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const currentMonthKey = (): MonthKey => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; // YYYY-MM
};

const getMonthKey = (isoDate?: string): MonthKey => isoDate?.slice(0, 7) ?? ""; // YYYY-MM

// =====================
// Hook: useLocalStorage<T>
// =====================
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch (e) {
      console.warn("Falha ao ler localStorage:", e);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Falha ao salvar no localStorage:", e);
    }
  }, [key, value]);

  return [value, setValue];
}

// =====================
// Componentes
// =====================
interface ExpenseFormProps {
  onAdd: (expense: Expense) => void;
}

function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const parsed = parseFloat(String(amount).replace(",", "."));

    if (!description.trim()) return setError("Descrição é obrigatória.");
    if (!date) return setError("Data é obrigatória.");
    if (Number.isNaN(parsed) || parsed <= 0) return setError("Valor deve ser maior que zero.");

    const id = typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : String(Date.now());

    onAdd({
      id,
      description: description.trim(),
      category: category.trim() || "Geral",
      amount: parsed,
      date,
    });

    // limpa formulário
    setDescription("");
    setCategory("");
    setAmount("");
    setDate(todayISO());
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Adicionar Despesa</h2>
      <div className="grid">
        <label>
          <span>Descrição *</span>
          <input
            type="text"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            placeholder="ex.: Mercado do mês"
            required
          />
        </label>
        <label>
          <span>Categoria</span>
          <input
            type="text"
            value={category}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
            placeholder="ex.: Alimentação"
          />
        </label>
        <label>
          <span>Valor (R$) *</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
            placeholder="0,00"
            required
          />
        </label>
        <label>
          <span>Data *</span>
          <input
            type="date"
            value={date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
            required
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit">Adicionar</button>
    </form>
  );
}

interface MonthFilterProps {
  month: MonthKey;
  onChange: (month: MonthKey) => void;
}

function MonthFilter({ month, onChange }: MonthFilterProps) {
  return (
    <div className="card">
      <label className="month-filter">
        <span>Mês:</span>
        <input
          type="month"
          value={month}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

interface MonthlySummaryProps {
  expenses: Expense[];
  month: MonthKey;
}

function MonthlySummary({ expenses, month }: MonthlySummaryProps) {
  const total = useMemo<number>(() => {
    return expenses
      .filter((e) => getMonthKey(e.date) === month)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, month]);

  return (
    <div className="card summary">
      <div>
        <small>Total no mês</small>
        <strong>{currency.format(total)}</strong>
      </div>
    </div>
  );
}

interface ExpenseListProps {
  expenses: Expense[];
  month: MonthKey;
  onDelete: (id: string) => void;
}

function ExpenseList({ expenses, month, onDelete }: ExpenseListProps) {
  const filtered = useMemo<Expense[]>(() => {
    return expenses
      .filter((e) => getMonthKey(e.date) === month)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, month]);

  if (!filtered.length) return <p className="muted">Nenhuma despesa para este mês.</p>;

  return (
    <ul className="list">
      {filtered.map((e) => (
        <li key={e.id} className="list-item">
          <div className="left">
            <div className="desc">{e.description}</div>
            <div className="sub">
              <span className="chip">{e.category || "Geral"}</span>
              <span>•</span>
              <span>{new Date(e.date).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <div className="right">
            <span className="amount">{currency.format(e.amount)}</span>
            <button className="icon" title="Remover" onClick={() => onDelete(e.id)}>
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// =====================
// App principal
// =====================
export default function App() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [month, setMonth] = useState<MonthKey>(currentMonthKey());

  const handleAdd = (expense: Expense): void => setExpenses((prev) => [expense, ...prev]);
  const handleDelete = (id: string): void => setExpenses((prev) => prev.filter((e) => e.id !== id));

  // Estilos mínimos (CSS-in-JS) apenas para este exemplo
  const styles = `
    :root {
      --bg: #0f172a; /* slate-900 */
      --card: #111827; /* gray-900 */
      --muted: #94a3b8; /* slate-400 */
      --text: #e2e8f0; /* slate-200 */
      --accent: #22c55e; /* green-500 */
      --danger: #ef4444; /* red-500 */
      --border: #1f2937; /* gray-800 */
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background: var(--bg); color: var(--text); }
    .container { max-width: 840px; margin: 40px auto; padding: 0 16px; }
    header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    h1 { font-size: 1.75rem; margin: 0; }
    .muted { color: var(--muted); }
    .card { background: var(--card); border: 1px solid var(--border); padding: 16px; border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 0.95rem; }
    input { background: #0b1220; color: var(--text); border: 1px solid var(--border); padding: 10px 12px; border-radius: 10px; }
    input:focus { outline: none; border-color: #334155; box-shadow: 0 0 0 3px rgba(51,65,85,0.35); }
    .btn { margin-top: 12px; background: var(--accent); color: #052e16; font-weight: 700; padding: 10px 14px; border: 0; border-radius: 12px; cursor: pointer; }
    .btn:hover { filter: brightness(1.05); }
    .error { color: var(--danger); margin-top: 8px; }
    .month-filter { display: flex; align-items: center; gap: 12px; }
    .summary { display: flex; align-items: center; justify-content: space-between; font-size: 1.15rem; }
    .summary strong { font-size: 1.4rem; }
    .list { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 10px; }
    .list-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--card); border: 1px solid var(--border); padding: 12px 14px; border-radius: 12px; }
    .left { display: flex; flex-direction: column; gap: 6px; }
    .desc { font-weight: 600; }
    .sub { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.9rem; }
    .chip { background: #0b1220; border: 1px solid var(--border); padding: 2px 8px; border-radius: 999px; }
    .right { display: flex; align-items: center; gap: 12px; }
    .amount { font-weight: 700; }
    .icon { background: transparent; color: var(--muted); border: 1px solid var(--border); width: 34px; height: 34px; border-radius: 10px; cursor: pointer; }
    .icon:hover { color: var(--danger); border-color: var(--danger); }
    .stack { display: grid; gap: 16px; }
  `;

  return (
    <div className="container">
      {/* Estilos inline para manter o exemplo auto-contido */}
      <style>{styles}</style>

      <header>
        <h1>Controle de Despesas</h1>
        <span className="muted">Primeiro projeto em React · TypeScript · ES6+ · HTML5 · CSS3</span>
      </header>

      <div className="stack">
        <ExpenseForm onAdd={handleAdd} />
        <MonthFilter month={month} onChange={setMonth} />
        <MonthlySummary expenses={expenses} month={month} />
        <div className="card">
          <h2>Despesas do mês</h2>
          <ExpenseList expenses={expenses} month={month} onDelete={handleDelete} />
        </div>
      </div>
    </div>
  );
}
