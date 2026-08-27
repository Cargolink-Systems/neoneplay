import './globals.css'
import AutoConfig from '@/components/AutoConfig'
import DemoMode from '@/demo/DemoMode'

export const metadata = {
  title: 'Ne:One Play',
  description: 'Play around with your OneRecord Database',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ overflow: "hidden" }}><AutoConfig /><DemoMode />{children}</body>
    </html >
  )
}
