import Link from "next/link";
import { Icon } from "./illustrations";
import { formatDate, type Letter } from "@/lib/domain";
export function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
export function Empty({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="mail" size={32} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link className="button secondary" href={href}>
        {label}
        <Icon name="arrow" size={16} />
      </Link>
    </div>
  );
}
export function LetterCard({
  letter,
  catName,
  base,
}: {
  letter: Letter;
  catName: string;
  base: string;
}) {
  const received = letter.direction === "FROM_CAT";
  return (
    <Link
      className={`letter-card ${received ? "received" : "sent"}`}
      href={`${base}/letters/${letter.id}`}
    >
      <div className="letter-card-top">
        <span className="letter-direction">
          <Icon name={received ? "mail" : "pen"} size={15} />
          {received ? `${catName}에게서 온 편지` : `${catName}에게 보낸 편지`}
        </span>
        {received && !letter.read_at && <span className="new-label">NEW</span>}
      </div>
      <h3>{letter.title}</h3>
      <p>{letter.content}</p>
      <div className="letter-card-bottom">
        <time dateTime={letter.created_at}>
          {formatDate(letter.created_at)}
        </time>
        <Icon name="arrow" size={17} />
      </div>
      <span className="envelope-rule" />
    </Link>
  );
}
