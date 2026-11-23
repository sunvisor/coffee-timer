import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{children}</ReactMarkdown>
    </div>
  )
}
