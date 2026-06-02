import ReportCard from "./ReportCard";

export default function RecentReports() {
  const reports = [
    {
      title: "Democratic Republic of the Congo: Humanitarian Snapshot",
      country: "DRC",
      date: "May 28, 2026",
      excerpt: "Over 6.9 million people internally displaced across North Kivu, South Kivu, and Ituri provinces. Emergency food assistance reaching 2.3 million people in Q1 2026."
    },
    {
      title: "Sudan Situation Report: Protection Concerns",
      country: "Sudan",
      date: "May 25, 2026",
      excerpt: "Conflict-affected populations in Darfur face severe protection risks. UNHCR reports 1.2 million newly displaced since April, with urgent need for shelter and medical supplies."
    },
    {
      title: "Yemen Crisis: Health System Collapse Update",
      country: "Yemen",
      date: "May 22, 2026",
      excerpt: "Only 51% of health facilities remain functional. WHO leads vaccination campaign reaching 340,000 children under five. Acute malnutrition rates exceed emergency thresholds."
    }
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl mb-12 text-center text-foreground">
          Recent Reports
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report, index) => (
            <ReportCard key={index} {...report} />
          ))}
        </div>
      </div>
    </section>
  );
}
