'use client'

import * as React from 'react'
import { Info, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { diffPolicy, PLATFORM_DEFAULTS, type BlindingMode, type JournalPolicy } from '@/db/policy'
import { api } from '@/lib/api'
import { SettingGroup, SettingRow } from './setting-row'

const BLINDING_HELP: Record<BlindingMode, string> = {
  single_blind: 'Reviewers see the authors. Authors never see the reviewers.',
  double_blind: 'Neither side sees the other. Files are anonymised automatically on submission.',
  open: 'Both sides are disclosed during review.',
  transparent: 'Open review, and the reports are published alongside the article.',
}

export function SettingsForm() {
  const [saved, setSaved] = React.useState<JournalPolicy>(PLATFORM_DEFAULTS)
  const [draft, setDraft] = React.useState<JournalPolicy>(PLATFORM_DEFAULTS)
  const [inFlight, setInFlight] = React.useState(0)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let cancel = false
    api<{ policy: JournalPolicy; inFlight: number }>('/settings')
      .then((row) => {
        if (cancel) return
        setSaved(row.policy)
        setDraft(row.policy)
        setInFlight(row.inFlight)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [])

  async function save() {
    setSaving(true)
    try {
      const row = await api<{ policy: JournalPolicy; inFlight: number }>('/settings', {
        method: 'PUT',
        body: JSON.stringify(draft),
      })
      setSaved(row.policy)
      setDraft(row.policy)
      setInFlight(row.inFlight)
    } finally {
      setSaving(false)
    }
  }

  const changes = React.useMemo(() => diffPolicy(saved, draft), [saved, draft])
  const dirty = changes.length > 0

  function update(fn: (d: JournalPolicy) => JournalPolicy) {
    setDraft((d) => fn(structuredClone(d)))
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SettingGroup title="Review policy">
        <SettingRow
          label="Blinding"
          help={BLINDING_HELP[draft.review.blinding]}
          htmlFor="blinding"
        >
          <Select
            value={draft.review.blinding}
            onValueChange={(v) =>
              update((d) => {
                d.review.blinding = v as BlindingMode
                return d
              })
            }
          >
            <SelectTrigger id="blinding" className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single_blind">Single-blind</SelectItem>
              <SelectItem value="double_blind">Double-blind</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          label="Publish the reviews"
          help="Review text appears with the published article. The strongest available signal that the journal is not predatory."
        >
          <Switch
            checked={draft.review.publishReviews}
            onCheckedChange={(v) =>
              update((d) => {
                d.review.publishReviews = v
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow
          label="Publish reviewer names"
          help="Independent of blinding. Reviewers are asked to consent individually."
        >
          <Switch
            checked={draft.review.publishReviewerNames}
            onCheckedChange={(v) =>
              update((d) => {
                d.review.publishReviewerNames = v
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow
          label="Reviews required to decide"
          help="An editor cannot record a decision below this count without an override."
          htmlFor="reviews-required"
        >
          <Input
            id="reviews-required"
            type="number"
            min={1}
            max={12}
            className="tnum w-20"
            value={draft.review.reviewsRequiredToDecide}
            onChange={(e) =>
              update((d) => {
                d.review.reviewsRequiredToDecide = Number(e.target.value)
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow label="Reviewer deadline" help="Days from acceptance of the invitation." htmlFor="deadline">
          <div className="flex items-center gap-2">
            <Input
              id="deadline"
              type="number"
              min={1}
              max={180}
              className="tnum w-20"
              value={draft.review.reviewerDeadlineDays}
              onChange={(e) =>
                update((d) => {
                  d.review.reviewerDeadlineDays = Number(e.target.value)
                  return d
                })
              }
            />
            <span className="text-muted-foreground text-sm">days</span>
          </div>
        </SettingRow>

        <SettingRow
          label="Invitation expiry"
          help="An unanswered invitation expires and the editor is prompted to find a replacement."
          htmlFor="expiry"
        >
          <div className="flex items-center gap-2">
            <Input
              id="expiry"
              type="number"
              min={1}
              max={60}
              className="tnum w-20"
              value={draft.review.invitationExpiryDays}
              onChange={(e) =>
                update((d) => {
                  d.review.invitationExpiryDays = Number(e.target.value)
                  return d
                })
              }
            />
            <span className="text-muted-foreground text-sm">days</span>
          </div>
        </SettingRow>

        <SettingRow label="Allow appeals" help="Authors may contest a rejection. The appeal is logged and routed to the Editor-in-Chief.">
          <Switch
            checked={draft.review.allowAppeals}
            onCheckedChange={(v) =>
              update((d) => {
                d.review.allowAppeals = v
                return d
              })
            }
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Similarity checking">
        <SettingRow label="Run a similarity check on submission">
          <Switch
            checked={draft.similarity.enabled}
            onCheckedChange={(v) =>
              update((d) => {
                d.similarity.enabled = v
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow
          label="Flag threshold"
          help="At or above this score the manuscript is flagged for the managing editor. Nothing is rejected automatically."
          htmlFor="flag-threshold"
        >
          <div className="flex items-center gap-2">
            <Input
              id="flag-threshold"
              type="number"
              min={1}
              max={100}
              className="tnum w-20"
              value={draft.similarity.flagThresholdPercent}
              onChange={(e) =>
                update((d) => {
                  d.similarity.flagThresholdPercent = Number(e.target.value)
                  return d
                })
              }
            />
            <span className="text-muted-foreground text-sm">%</span>
          </div>
        </SettingRow>

        <SettingRow label="Exclude quotations and bibliography" help="Recommended. Without it, well-cited papers score high for no reason.">
          <Switch
            checked={draft.similarity.excludeQuotes && draft.similarity.excludeBibliography}
            onCheckedChange={(v) =>
              update((d) => {
                d.similarity.excludeQuotes = v
                d.similarity.excludeBibliography = v
                return d
              })
            }
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Submission requirements">
        <SettingRow label="Require ORCID" help="Prefills affiliation and publication history, and makes author identity unambiguous at deposit.">
          <Switch
            checked={draft.submission.requireOrcid}
            onCheckedChange={(v) =>
              update((d) => {
                d.submission.requireOrcid = v
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow label="Abstract word limit" htmlFor="abstract-limit">
          <Input
            id="abstract-limit"
            type="number"
            min={50}
            max={2000}
            className="tnum w-24"
            value={draft.submission.abstractWordLimit}
            onChange={(e) =>
              update((d) => {
                d.submission.abstractWordLimit = Number(e.target.value)
                return d
              })
            }
          />
        </SettingRow>

        <SettingRow label="Maximum file size" htmlFor="file-size">
          <div className="flex items-center gap-2">
            <Input
              id="file-size"
              type="number"
              min={1}
              max={500}
              className="tnum w-20"
              value={draft.submission.maxFileSizeMb}
              onChange={(e) =>
                update((d) => {
                  d.submission.maxFileSizeMb = Number(e.target.value)
                  return d
                })
              }
            />
            <span className="text-muted-foreground text-sm">MB</span>
          </div>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Publishing">
        <SettingRow label="Licence" htmlFor="licence">
          <Select
            value={draft.publishing.licence}
            onValueChange={(v) =>
              update((d) => {
                d.publishing.licence = v
                return d
              })
            }
          >
            <SelectTrigger id="licence" className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC-BY-4.0">CC BY 4.0</SelectItem>
              <SelectItem value="CC-BY-SA-4.0">CC BY-SA 4.0</SelectItem>
              <SelectItem value="CC-BY-NC-4.0">CC BY-NC 4.0</SelectItem>
              <SelectItem value="all-rights-reserved">All rights reserved</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Publication model" help="Continuous publishes each article as it is ready. Issue-based holds them until an issue closes." htmlFor="model">
          <Select
            value={draft.publishing.model}
            onValueChange={(v) =>
              update((d) => {
                d.publishing.model = v as 'issue' | 'continuous'
                return d
              })
            }
          >
            <SelectTrigger id="model" className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="issue">Issue-based</SelectItem>
              <SelectItem value="continuous">Continuous</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title="Charges">
        <SettingRow label="Charge authors" help="Charging before acceptance reads as predatory. Leave this on acceptance unless you have a reason." htmlFor="trigger">
          <Select
            value={draft.fees.trigger}
            onValueChange={(v) =>
              update((d) => {
                d.fees.trigger = v as JournalPolicy['fees']['trigger']
                return d
              })
            }
          >
            <SelectTrigger id="trigger" className="min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No charge</SelectItem>
              <SelectItem value="on_acceptance">On acceptance</SelectItem>
              <SelectItem value="on_publication">On publication</SelectItem>
              <SelectItem value="on_submission">On submission</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        {draft.fees.trigger !== 'none' && (
          <SettingRow label="Amount" help="In naira. Waivers are configured separately and applied automatically." htmlFor="amount">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">₦</span>
              <Input
                id="amount"
                type="number"
                min={0}
                step={1000}
                className="tnum w-32"
                value={draft.fees.amountMinor / 100}
                onChange={(e) =>
                  update((d) => {
                    d.fees.amountMinor = Number(e.target.value) * 100
                    return d
                  })
                }
              />
            </div>
          </SettingRow>
        )}
      </SettingGroup>

      {/* The blast radius. Shown before saving, not after. */}
      {dirty && (
        <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:left-56">
          <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
            <Info className="text-primary size-4 shrink-0" />
            <p className="min-w-[240px] flex-1 text-sm">
              <span className="font-medium">
                {changes.length} change{changes.length === 1 ? '' : 's'}
              </span>{' '}
              <span className="text-muted-foreground">
                — applies to new submissions only. The {inFlight} manuscripts currently under review keep the policy
                frozen at their submission.
              </span>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDraft(saved)}>
                <RotateCcw />
                Discard
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void save()}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
