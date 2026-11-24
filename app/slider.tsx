"use client";

import Lenis from "lenis";
import { useEffect, useRef } from "react";

const slides = [
  { title: "GTA 1", image: "/slides/1.jpg", stroke: "#ffc400" },
  { title: "GTA 2", image: "/slides/2.jpg", stroke: "#ff2d2d" },
  { title: "GTA 3", image: "/slides/3.jpg", stroke: "#3d8bfd" },
  { title: "GTA Vice City", image: "/slides/4.jpg", stroke: "#ff4fa3" },
  { title: "GTA Liberty City", image: "/slides/5.jpg", stroke: "#9f1239" },
  { title: "GTA Vice City Stories", image: "/slides/6.jpg", stroke: "#2ad4c8" },
  { title: "GTA San Andreas", image: "/slides/7.jpg", stroke: "#ff8c32" },
  { title: "GTA IV", image: "/slides/8.jpg", stroke: "#8eb4e8" },
  { title: "GTA V", image: "/slides/9.jpg", stroke: "#7ed321" },
  { title: "GTA VI", image: "/slides/10.jpg", wide: true },
  {
    title: "",
    copy: ["Thanks Dan and Sam Houser", "for all these years"] as const,
  },
];

const PARKED = "translate3d(0px, 0px, -2000px) scale(0.4)";

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function px(value: number) {
  return Math.round(value);
}

export default function Slider() {
  const stageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const titleEl = titleRef.current;
    const track = trackRef.current;
    if (!stage || !titleEl || !track) return;

    const cards = [...stage.querySelectorAll<HTMLElement>(".slide")].map(
      (el) => {
        const media = el.querySelector<HTMLElement>(".slide-media");
        if (!media) throw new Error("Slide is missing its media element");
        return {
          el,
          media,
          parked: false,
          hidden: false,
          origin: "",
          transform: "",
          z: "",
          mediaTransform: "",
        };
      },
    );

    const count = cards.length;
    const lastIndex = count - 1;
    let activeSlide = 0;
    let loop = 0;
    let barOpacity = "";
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const paint = (
      card: (typeof cards)[number],
      next: {
        hidden: boolean;
        origin: string;
        transform: string;
        z: string;
        media: string;
      },
    ) => {
      if (card.hidden !== next.hidden) {
        card.el.style.visibility = next.hidden ? "hidden" : "visible";
        card.hidden = next.hidden;
      }
      if (next.hidden) {
        card.parked = true;
        return;
      }
      if (card.origin !== next.origin) {
        card.el.style.transformOrigin = next.origin;
        card.origin = next.origin;
      }
      if (card.transform !== next.transform) {
        card.el.style.transform = next.transform;
        card.transform = next.transform;
      }
      if (card.z !== next.z) {
        card.el.style.zIndex = next.z;
        card.z = next.z;
      }
      if (card.mediaTransform !== next.media) {
        card.media.style.transform = next.media;
        card.mediaTransform = next.media;
      }
      card.parked = false;
    };

    const resizeTrack = () => {
      track.style.height = `${(lastIndex + 1) * viewH}px`;
    };

    const updateSlider = (scroll: number) => {
      const gallery = Math.min(Math.max(scroll, 0), lastIndex);
      const active = Math.round(gallery);
      if (active !== activeSlide) {
        activeSlide = active;
        titleEl.textContent = slides[active].title;
      }

      const thanksEnter = Math.min(1, Math.max(0, gallery - (lastIndex - 1)));
      const nextOpacity = (1 - thanksEnter).toFixed(2);
      if (nextOpacity !== barOpacity) {
        titleEl.style.opacity = nextOpacity;
        barOpacity = nextOpacity;
      }

      cards.forEach((card, index) => {
        const offset = gallery - index;

        if (offset < -1 || offset >= 1) {
          if (card.parked) return;
          paint(card, {
            hidden: true,
            origin: "center center",
            transform: PARKED,
            z: "0",
            media: "scale(1.25)",
          });
          return;
        }

        let zIndex = Math.round((1 - Math.abs(offset)) * 10);
        if (offset > 0) zIndex += 10;

        if (offset <= 0) {
          const enter = offset + 1;
          paint(card, {
            hidden: false,
            origin: "center center",
            transform: `translate3d(0px, 0px, ${px(mix(-700, 0, enter))}px) scale(${mix(0.4, 1, enter).toFixed(3)})`,
            z: String(zIndex),
            media: `scale(${mix(1.25, 1, enter).toFixed(3)})`,
          });
          return;
        }

        const direction = index % 2 === 0 ? -1 : 1;
        paint(card, {
          hidden: false,
          origin: direction === -1 ? "left top" : "right top",
          transform: `translate3d(${px(direction * viewW * 0.3 * offset)}px, ${px(-viewH * 0.75 * offset)}px,
          ${px(300 * offset)}px) rotateX(${(40 * offset).toFixed(2)}deg) rotateY(${(50 * direction * offset).toFixed(2)}deg)
          rotateZ(${(20 * direction * offset).toFixed(2)}deg) scale(${mix(1, 1.5, offset).toFixed(3)})`,
          z: String(zIndex),
          media: "scale(1)",
        });
      });
    };

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1,
      autoRaf: false,
    });

    const frame = (time: number) => {
      lenis.raf(time);
      updateSlider(lenis.scroll / viewH);
      loop = lenis.isScrolling ? requestAnimationFrame(frame) : 0;
      if (!loop) stage.classList.remove("is-moving");
    };

    const start = () => {
      if (loop) return;
      stage.classList.add("is-moving");
      loop = requestAnimationFrame(frame);
    };

    const onResize = () => {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      resizeTrack();
      lenis.resize();
      cards.forEach((card) => {
        card.parked = false;
      });
      updateSlider(lenis.scroll / viewH);
    };

    resizeTrack();
    updateSlider(0);
    lenis.on("virtual-scroll", start);
    window.addEventListener("resize", onResize);

    return () => {
      if (loop) cancelAnimationFrame(loop);
      window.removeEventListener("resize", onResize);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <section className="slider" aria-label="Grand Theft Auto">
        <div className="stage" ref={stageRef}>
          {slides.map((slide, index) =>
            "copy" in slide ? (
              <div className="slide slide-thanks" key={slide.title}>
                <div className="slide-media">
                  <p>
                    {slide.copy?.[0]}
                    <span>{slide.copy?.[1]}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={slide.wide ? "slide slide-wide" : "slide"}
                key={slide.image}
              >
                <img
                  className="slide-media"
                  src={slide.image}
                  alt={slide.title}
                  width={slide.wide ? 1600 : 900}
                  height={slide.wide ? 900 : 1200}
                  decoding={index === 0 ? "sync" : "async"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  draggable={false}
                />
              </div>
            ),
          )}
        </div>
        <p className="slider-bar title" ref={titleRef} aria-live="polite">
          {slides[0].title}
        </p>
      </section>
      <div className="scroll-track" ref={trackRef} aria-hidden="true" />
    </>
  );
}
