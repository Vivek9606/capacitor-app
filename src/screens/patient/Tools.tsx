import { Page } from '../../components/Shell'
import { PageHeader, SectionTitle } from '../../components/ui'
import { TOOL_GROUPS, TOOLS } from '../../lib/explore'
import { ToolCard } from './care'

// Patient · Tools, grouped by what you want to do.
export default function Tools() {
  return (
    <Page wide>
      <PageHeader back={false} title="Tools" subtitle="Everything betterhood offers, by what you need" />
      {TOOL_GROUPS.map((g) => {
        const list = TOOLS.filter((t) => t.group === g.key)
        if (!list.length) return null
        return (
          <section key={g.key}>
            <SectionTitle right={<span className="text-[12px] text-muted">{g.sub}</span>}>{g.title}</SectionTitle>
            <div className="grid gap-2.5 lg:grid-cols-2">
              {list.map((t) => (
                <ToolCard key={t.key} t={t} />
              ))}
            </div>
          </section>
        )
      })}
      <div className="h-8" />
    </Page>
  )
}
