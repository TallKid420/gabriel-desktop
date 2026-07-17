'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/common/page-header'
import { StatusDot } from '@/components/common/status-dot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PIPELINE, WORKFLOWS } from './data'
import { Plus, Play, Pause, GitBranch, ArrowRight } from 'lucide-react'

export function WorkflowsView() {
  const [selected, setSelected] = useState(WORKFLOWS[0].id)
  const active = WORKFLOWS.find((w) => w.id === selected) ?? WORKFLOWS[0]

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Workflows"
        description="Multi-step automations that chain agents, data, and approvals. Build once and let Gabriel run them on triggers or schedules."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-2">
          {WORKFLOWS.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w.id)}
              className={cn(
                'rounded-xl border bg-card p-3 text-left transition-colors',
                selected === w.id
                  ? 'border-primary/50 ring-1 ring-primary/30'
                  : 'border-border hover:border-primary/30',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                </span>
                <StatusDot status={w.status} />
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">
                {w.name}
              </p>
              <p className="text-xs text-muted-foreground">{w.trigger}</p>
            </button>
          ))}
        </div>

        <Card className="flex flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {active.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {active.trigger} · {active.steps} steps
              </p>
            </div>
            <Button variant="outline" size="sm">
              {active.status === 'running' ? (
                <>
                  <Pause className="h-3.5 w-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Run
                </>
              )}
            </Button>
          </div>

          <div className="my-5 flex flex-wrap items-center gap-2">
            {PIPELINE.slice(0, active.steps).map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}</span>
                  {step}
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-background/50 p-3 text-center">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {active.runsToday}
              </p>
              <p className="text-[11px] text-muted-foreground">runs today</p>
            </div>
            <div className="border-x border-border">
              <p className="text-lg font-semibold text-foreground">99.2%</p>
              <p className="text-[11px] text-muted-foreground">success</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">1.8s</p>
              <p className="text-[11px] text-muted-foreground">avg latency</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
