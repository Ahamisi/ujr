export default async function jobsTick() {
  const base = (process.env.URL || '').replace(/\/$/, '')
  const secret = process.env.JOB_SECRET
  if (!base || !secret) {
    console.error('jobs-tick: URL or JOB_SECRET is missing')
    return new Response('missing configuration', { status: 500 })
  }

  const response = await fetch(`${base}/api/v1/jobs/tick`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  })
  const body = await response.text()
  console.log(`jobs-tick ${response.status} ${body}`)
  return new Response(body, { status: response.status })
}
