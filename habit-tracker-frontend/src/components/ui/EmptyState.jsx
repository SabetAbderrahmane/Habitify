import Button from "./Button";
import Card from "./Card";

export default function EmptyState({ title, description, actionLabel, onAction, actionTo }) {
  const action = actionLabel ? (
    <Button
      as={actionTo ? "a" : "button"}
      href={actionTo}
      onClick={onAction}
      className="mt-5"
    >
      {actionLabel}
    </Button>
  ) : null;

  return (
    <Card className="p-10 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100" />
      <h2 className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p> : null}
      {action}
    </Card>
  );
}
