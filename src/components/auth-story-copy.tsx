import { useEffect, useState } from 'react'

const lines = ['학생의 가능성을 발견하고,', '성장을 함께 기록합니다.']
const fullText = lines.join('\n')

export function AuthStoryCopy() {
  const [length, setLength] = useState(0)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout>
    let position = 0
    let deleting = false
    const type = () => {
      position += deleting ? -1 : 1
      setLength(position)
      let delay = deleting ? 85 : fullText[position - 1] === '\n' ? 600 : 145
      if (!deleting && position === fullText.length) {
        deleting = true
        delay = 5000
      } else if (deleting && position === 0) {
        deleting = false
        delay = 900
      }
      timer = setTimeout(type, delay)
    }
    const start = () => {
      clearTimeout(timer)
      if (preference.matches) setLength(fullText.length)
      else {
        position = 0
        deleting = false
        setLength(0)
        timer = setTimeout(type, 350)
      }
    }
    start()
    preference.addEventListener('change', start)
    return () => {
      clearTimeout(timer)
      preference.removeEventListener('change', start)
    }
  }, [])

  return <p className="auth-story-copy auth-typewriter">
    <span className="sr-only">{fullText}</span>
    <span aria-hidden="true" className="auth-typewriter-space">{fullText}</span>
    <span aria-hidden="true" className="auth-typewriter-text">
      {fullText.slice(0, length)}
      <span className={`auth-typewriter-caret ${length === fullText.length ? 'is-complete' : ''}`} />
    </span>
  </p>
}
