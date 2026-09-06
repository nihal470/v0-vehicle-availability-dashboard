'use client'

import { FileDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintContractButton() {
  const downloadDocument = () => {
    const documentElement = document.querySelector('article')
    if (!documentElement) return

    const contractNumber = documentElement.querySelector('p')?.textContent?.trim() || 'contract'
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${contractNumber}</title><style>body{font-family:Arial,sans-serif;color:#172033;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.6}article{border:1px solid #d9dee8;border-radius:16px;padding:40px}h1{margin:4px 0 8px}h2{border-top:1px solid #d9dee8;padding-top:20px;margin-top:28px;font-size:18px}p{white-space:pre-wrap}@media print{body{margin:0}article{border:0}}</style></head><body>${documentElement.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${contractNumber.replace(/[^a-z0-9-_]/gi, '-')}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={downloadDocument}>
        <FileDown data-icon="inline-start" />
        Download Document
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print
      </Button>
    </div>
  )
}
