interface ReportCardProps {
  title: string;
  country: string;
  date: string;
  excerpt: string;
}

export default function ReportCard({ title, country, date, excerpt }: ReportCardProps) {
  return (
    <article className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-block px-3 py-1 bg-accent text-accent-foreground rounded-md text-sm">
          {country}
        </span>
        <span className="text-sm text-muted-foreground">{date}</span>
      </div>

      <h3 className="text-lg mb-3 text-foreground leading-snug">
        {title}
      </h3>

      <p className="text-muted-foreground mb-4 leading-relaxed">
        {excerpt}
      </p>

      <button className="text-accent hover:text-opacity-80 transition-colors inline-flex items-center gap-1">
        Read report
        <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}
