import {
  BUILD_WEEK_BEATS,
  buildWeekEpisode,
} from './app/fixtures/buildWeekEpisode'

export function App() {
  return (
    <main className="foundation-page">
      <header className="foundation-header">
        <p className="eyebrow">Build Week foundation</p>
        <h1>ScrollSplice</h1>
        <p className="foundation-summary">
          The application scaffold and original synthetic episode fixture are
          ready for the editor surfaces.
        </p>
      </header>

      <section className="fixture-card" aria-labelledby="fixture-heading">
        <div>
          <p className="fixture-status">Fixture ready</p>
          <h2 id="fixture-heading">{buildWeekEpisode.name}</h2>
          <p>
            {BUILD_WEEK_BEATS.length} story beats ·{' '}
            {buildWeekEpisode.elements.length} named layers ·{' '}
            {buildWeekEpisode.logicalWidth} ×{' '}
            {buildWeekEpisode.logicalHeight} logical units
          </p>
        </div>

        <ol className="beat-list" aria-label="Synthetic episode beats">
          {BUILD_WEEK_BEATS.map((beat) => (
            <li key={beat.id}>
              <span>{beat.title}</span>
              <small>{beat.caption}</small>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
