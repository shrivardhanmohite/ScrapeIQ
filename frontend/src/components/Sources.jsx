export default function Sources({ sources }) {

  if(!sources || sources.length === 0) return null;

  const domains = sources.reduce((items, source) => {
    const href = typeof source === "string" ? source : source?.url || source?.href || "";
    if (!href) return items;

    const label = getHostName(href);
    const existing = items.find((item) => item.label === label);

    if (existing) {
      existing.count += 1;
      existing.links.push(href);
      return items;
    }

    items.push({
      href,
      label,
      links: [href],
      count: 1,
      score: getReliabilityScore(label, source)
    });
    return items;
  }, []).sort((a, b) => b.count - a.count || b.score - a.score);

  if (domains.length === 0) return null;

  return (

    <aside className="sources-panel result-section">

      <div className="result-section-header sources-panel__header">
        <div>
          <span className="result-section-kicker">Sources</span>
          <h3>Source Domains</h3>
        </div>
        <strong>{domains.length}</strong>
      </div>

      <div className="sources-grid">
        {domains.map((source, i)=>(
          <article className="source-card" key={`${source.label}-${i}`}>
            <a href={source.href} target="_blank" rel="noreferrer" title={source.href}>
              <span className="source-favicon">
                <img src={`https://www.google.com/s2/favicons?domain=${source.label}&sz=64`} alt="" loading="lazy" />
              </span>
              <strong>{source.label}</strong>
              <em>{source.count} {source.count === 1 ? "link" : "links"}</em>
              <small>{source.score}% reliability</small>
            </a>
          </article>
        ))}
      </div>

    </aside>

  );

}

function getHostName(source) {
  try {
    return new URL(source).hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

function getReliabilityScore(label, source) {
  const declared = typeof source === "object" ? Number(source.reliabilityScore || source.score) : NaN;
  if (!Number.isNaN(declared)) return Math.max(0, Math.min(100, Math.round(declared)));

  const trustedTlds = [".gov", ".edu", ".org"];
  const isKnownStable = trustedTlds.some((tld) => label.endsWith(tld));
  const hasSubdomainDepth = label.split(".").length > 3;

  if (isKnownStable) return 94;
  if (hasSubdomainDepth) return 78;
  return 86;
}
