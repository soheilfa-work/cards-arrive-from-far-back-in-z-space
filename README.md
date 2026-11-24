# Infinite

A full-screen scroll gallery that walks through the Grand Theft Auto series, from GTA 1 to GTA VI, and ends on a thank-you card. Each game sits on a single card. Scrolling pulls the next cover out of the distance, then peels the current one off the stack.

## Live demo

**[http://localhost:3000](http://localhost:3000)**

```bash
npm install
npm run dev
```

Scroll with the wheel, trackpad, or touch. The title under the cards follows the active game and fades out on the last slide.

## The effect

The stage is fixed to the viewport. Every slide is stacked in the same spot, in a 3D space with a `1400px` perspective. An invisible track below the stage is one screen tall per slide, so normal page scrolling becomes a progress value from `0` to the last slide. [Lenis](https://github.com/darkroomengineering/lenis) smooths that scroll; the gallery only paints while the scroll is moving.

Three states drive the motion:

1. **Approach.** A card that is about to become active starts deep and small (`translateZ(-700px)`, scale `0.4`) with its image zoomed to `1.25`. As it reaches the center it settles to full size and the image eases back to `1`, so the cover feels like it is arriving toward the camera.
2. **Exit.** Once a card is behind the scroll position it lifts up, grows toward `1.5`, and tumbles off. Even slides leave toward the top left, odd slides toward the top right. The transform origin sits on that corner, and rotate X / Y / Z plus a forward `z` push sell the peel.
3. **Parked.** Anything more than one slide away is hidden and held far back at `translateZ(-2000px)`. Only the current card and its neighbors are transformed, so the stack stays cheap to update.

The active title is the rounded slide index. On the final slide the bar fades out and the Pricedown thank-you line (“Thanks Dan and Sam Houser”) takes the stage, set in gold with a dark stroke and a stacked magenta and orange shadow over the Vice City sunset background.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19
- Lenis for smooth scroll
- Tailwind CSS 4
- Pricedown for the display type, Figtree for the page

Slides live in `public/slides`. Titles, images, and the closing card are listed in `app/slider.tsx`.
