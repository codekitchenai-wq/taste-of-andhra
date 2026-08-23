import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { Container } from '@/components/ui/Container'
import { SectionHeader } from '@/components/home/SectionHeader'

const REEL_SRC = '/videos/chopsticks/onam-reel-light.mp4'
const POSTER_SRC = '/videos/chopsticks/onam-reel-poster.jpg'

/**
 * Chopsticks-only Onam reel — click-to-play vertical player below the hero CTA.
 * Uses the light web encode; full-quality file stays at onam-reel.mp4 for archive.
 */
export function OnamReelSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  function handlePlay() {
    const video = videoRef.current
    if (!video) return
    void video.play().then(() => setPlaying(true)).catch(() => {
      setPlaying(false)
    })
  }

  return (
    <section className="bg-[#f3ead8] py-12 md:py-16">
      <Container as="div">
        <SectionHeader
          title="Celebrate Onam with us"
          subtitle="Watch a glimpse of Chopsticks Spice Malabar — then pre-book Sadhya on our new website."
        />

        <div className="mx-auto mt-10 flex max-w-[320px] justify-center motion-safe:animate-[onam-fade-up_0.7s_ease-out_both] sm:max-w-[360px]">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-sm bg-[#13261c] shadow-[0_12px_40px_rgba(40,28,12,0.18)]">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={REEL_SRC}
              poster={POSTER_SRC}
              preload="none"
              playsInline
              controls={playing}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            >
              Your browser does not support this video.
            </video>

            {!playing ? (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center bg-[#13261c]/25 transition-colors hover:bg-[#13261c]/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8d5a3]"
                aria-label="Play Onam reel"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#13261c] text-[#e8d5a3] shadow-lg">
                  <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  )
}
