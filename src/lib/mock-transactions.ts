export type ChargeStatus = 'paid' | 'pending' | 'waived' | 'failed' | 'refunded'

export interface Transaction {
  id: string
  reference: string
  manuscriptTitle: string
  payer: string
  payerEmail: string
  /** Kobo. Money is never stored as a float. */
  amountMinor: number
  currency: 'NGN'
  status: ChargeStatus
  /** Paystack transaction reference, once the gateway has one. */
  gatewayRef: string | null
  channel: 'card' | 'bank_transfer' | 'ussd' | null
  raisedAt: string
  settledAt: string | null
  waiverReason?: string
}

export const TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    reference: 'UJER-2026-0118',
    manuscriptTitle: 'Thermal Performance of Phase-Change Material Walls in Humid Tropical Climates',
    payer: 'S. Aluko',
    payerEmail: 's.aluko@unilag.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'paid',
    gatewayRef: 'PSK_8f24c1a07b',
    channel: 'card',
    raisedAt: '2026-09-07',
    settledAt: '2026-09-07',
  },
  {
    id: 't2',
    reference: 'UJER-2026-0104',
    manuscriptTitle: 'Shear Behaviour of Recycled Aggregate Concrete Beams Without Stirrups',
    payer: 'B. Nwosu',
    payerEmail: 'b.nwosu@unilag.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'pending',
    gatewayRef: 'PSK_1c90de4432',
    channel: 'bank_transfer',
    raisedAt: '2026-09-02',
    settledAt: null,
  },
  {
    id: 't3',
    reference: 'UJER-2026-0097',
    manuscriptTitle: 'Groundwater Quality Indexing Across the Lagos Lagoon Catchment',
    payer: 'A. Okafor',
    payerEmail: 'a.okafor@unilag.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'waived',
    gatewayRef: null,
    channel: null,
    raisedAt: '2026-08-24',
    settledAt: '2026-08-25',
    waiverReason: 'Postgraduate student, no grant funding',
  },
  {
    id: 't4',
    reference: 'UJER-2026-0089',
    manuscriptTitle: 'Reliability Assessment of Distribution Transformers Under Nigerian Load Profiles',
    payer: 'S. Umar',
    payerEmail: 's.umar@abu.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'failed',
    gatewayRef: 'PSK_44b7a2e199',
    channel: 'card',
    raisedAt: '2026-08-19',
    settledAt: null,
  },
  {
    id: 't5',
    reference: 'UJER-2026-0082',
    manuscriptTitle: 'A Low-Cost Sensor Array for Particulate Monitoring in Urban Lagos',
    payer: 'T. Nwankwo',
    payerEmail: 't.nwankwo@unilag.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'paid',
    gatewayRef: 'PSK_77de10cc03',
    channel: 'ussd',
    raisedAt: '2026-08-11',
    settledAt: '2026-08-12',
  },
  {
    id: 't6',
    reference: 'UJER-2026-0071',
    manuscriptTitle: 'Seismic Vulnerability of Unreinforced Masonry in Southwest Nigeria',
    payer: 'O. Ajayi',
    payerEmail: 'o.ajayi@oauife.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'refunded',
    gatewayRef: 'PSK_2a51fb8d60',
    channel: 'card',
    raisedAt: '2026-07-30',
    settledAt: '2026-08-04',
    waiverReason: 'Charged in error — manuscript was withdrawn before acceptance',
  },
  {
    id: 't7',
    reference: 'UJER-2026-0064',
    manuscriptTitle: 'Rainfall-Runoff Modelling for the Ogun River Basin Under Changing Land Use',
    payer: 'G. Eboh',
    payerEmail: 'g.eboh@unilag.edu.ng',
    amountMinor: 4500000,
    currency: 'NGN',
    status: 'waived',
    gatewayRef: null,
    channel: null,
    raisedAt: '2026-07-18',
    settledAt: '2026-07-18',
    waiverReason: 'Corresponding author based in a Research4Life Group A country',
  },
]

export const naira = (minor: number) =>
  `₦${(minor / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
