export default function Sources({ sources }) {

  if(!sources || sources.length === 0) return null;

  return (

    <aside className="sources-panel">

      <div className="sources-panel__header">
        <span>Sources</span>
        <strong>{sources.length}</strong>
      </div>

      <ul className="sources-list">
        {sources.map((s,i)=>(
          <li key={i}>
            <a href={s} target="_blank" rel="noreferrer" title={s}>
              <span>{i + 1}</span>
              {getHostName(s)}
            </a>
          </li>
        ))}
      </ul>

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
