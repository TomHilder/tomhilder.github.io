---
title: "Spectrospatial Models for LVM"
date: 2026-07-16
tags: ["conference", "gaussian processes", "LVM", "spectroscopy"]
author: "Tom Hilder"
description: "A probabilistic framework that forward-models SDSS-V LVM data across many pointings, using spatial information to reach lines below the noise floor."
summary: "Per-spaxel fitting leaves the spatial information in LVM data unused, and binning destroys it. I present progress on a framework that forward-models many pointings jointly, enabling weak-line science while also improving strong-line and kinematic measurements."
cover:
    image: "title_slide.png"
    alt: "Title slide"
    relative: true
note: "Invited Talk"
editPost:
    URL: "https://fys.kuleuven.be/ster/events/conferences/2026/sdss-v-collaboration-meeting-2026/sdss-v-collaboration-meeting-2026"
    Text: "SDSS-V Collaboration Meeting 2026"

---

#### Links

- [Slides (PDF)](slides.pdf)
- [Recording](https://youtu.be/3wdIX1v9yDU?si=-4g3LM1ZT98hno68)
- [Conference website](https://fys.kuleuven.be/ster/events/conferences/2026/sdss-v-collaboration-meeting-2026/sdss-v-collaboration-meeting-2026)

---

#### Abstract

The SDSS-V LVM survey is delivering an unprecedented spectroscopic view of the ISM, resolving the ionised gas of the Milky Way spatially across many contiguous pointings. However, this spatial information is left unexploited by per-spaxel fitting, and is destroyed by binning. Faint auroral and metal recombination lines, central to measurements of gas conditions, stellar feedback, and the abundance discrepancy, are also where per-spaxel signal-to-noise is lowest, and so stand to gain the most from a spatially informed approach. In this talk I will present progress on a general probabilistic framework that forward-models IFU data jointly across pointings to infer the underlying fields that generated it, as part of a unified "spectrospatial" approach. This not only helps to enable weak-line science, but it also sharpens strong-line measurements, allows for spatially coherent kinematic decompositions of partially blended line-of-sight components, and lets us infer and marginalise residual calibration and reduction errors.

---

#### Key Slide

![Line ratios slide](key_slide.png)
