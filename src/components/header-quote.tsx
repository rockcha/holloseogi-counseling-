import { useEffect, useState } from 'react';

const quotes = [
  '🌱 작은 관심이 모여, 큰 성장을 만듭니다.',
  '✨ 학생의 가능성을 발견하고, 성장을 함께 기록합니다.',
  '🌿 기다려 주는 마음이, 스스로 서는 힘이 됩니다.',
  '🌟 오늘의 작은 용기가, 내일의 변화를 만듭니다.',
  '💛 한 사람의 응원이, 새로운 시작이 됩니다.',
];

export function HeaderQuote() {
  const [text, setText] = useState('');
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout>;
    let index = 0, length = 0, deleting = false;
    const tick = () => {
      const quote = Array.from(quotes[index]);
      length += deleting ? -1 : 1;
      setText(quote.slice(0, length).join(''));
      let delay = deleting ? 85 : 145;
      if (!deleting && length === quote.length) {
        deleting = true;
        delay = 5000;
      } else if (deleting && length === 0) {
        deleting = false;
        index = (index + 1) % quotes.length;
        delay = 900;
      }
      timer = setTimeout(tick, delay);
    };
    const start = () => {
      clearTimeout(timer);
      if (preference.matches) setText(quotes[0]);
      else {
        index = 0; length = 0; deleting = false;
        setText('');
        timer = setTimeout(tick, 500);
      }
    };
    start();
    preference.addEventListener('change', start);
    return () => { clearTimeout(timer); preference.removeEventListener('change', start); };
  }, []);
  return <p className="header-quote">
    <span className="sr-only">{quotes[0]}</span>
    <span aria-hidden="true">{text}<span className="auth-typewriter-caret" /></span>
  </p>;
}
