# Daily Horoscope v2 Pipeline

This is the checkpoint for option 1: make the sky-fact layer deterministic before wiring full automatic generation.

## Decision

Use a hybrid, two-layer daily horoscope:

- Layer 1: slower sign background from planets in the sign and the sign ruler.
- Layer 2: daily variation from Moon phase, Moon sign/relation, ingress, and the day-specific sky packet.

The final reading still keeps the existing app mood:

- wistful and warm
- not a hard prediction
- one breath of comfort
- `teaser` plus exactly 10 body sentences
- body lines fade in one by one on the ending card

## Commands

```text
node pipeline/sky.js 2026-06-24
node pipeline/prompt.js 2026-06-24 Cancer
node pipeline/prompt.js 2026-06-24
```

`sky.js` computes deterministic astronomy facts with `astronomy-engine`.

`prompt.js` converts those facts into the LLM generation packet. The output is not meant to be shown directly to users; it is the input contract for the prose-writing pass.

## Language Rule

Generate Korean first in the established tone, then produce native English from the Korean intent and the sky facts. English should use horoscope vocabulary such as `Daily Horoscope`, `reading`, and `zodiac sign`. Avoid UI/title phrases like `Daily Stars`, and avoid repeated literal phrasing such as `your star`.

## Anti-Duplication

The sky does not move dramatically every day, so the generator must vary the second layer. Use `antiRepeatSeed` plus the previous generated reading when available. At minimum, vary:

- teaser image
- first sentence
- closing sentence
- concrete advice
- Moon phase / Moon relation emphasis

When a planet stays in the same sign for many days, treat it as background, not the whole reading.
