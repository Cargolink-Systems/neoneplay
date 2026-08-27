import './globals.css'
import AutoConfig from '@/components/AutoConfig'

export const metadata = {
  title: 'Ne:One Play',
  description: 'Play around with your OneRecord Database',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ overflow: "hidden" }}><AutoConfig />{children}</body>
    </html >
  )
}
