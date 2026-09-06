'use client'

import { FileDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintContractButton() {
  const downloadPdf = () => {
    const contractNumber = document.querySelector('article p.font-mono')?.textContent?.trim() || 'rental-contract'
    const previousTitle = document.title
    document.title = contractNumber
    window.print()
    window.setTimeout(() => { document.title = previousTitle }, 1000)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={downloadPdf}>
        <FileDown data-icon="inline-start" />
        Download PDF
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print
      </Button>
    </div>
  )
}
