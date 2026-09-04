---
title: "An Unbroken View of the Milky Way"
date: 2025-07-16
tags: ["conference", "gaussian processes", "LVM", "spectroscopy"]
author: "Tom Hilder"
description: "A spatially coherent model that fits hundreds of thousands of LVM spectra at once, recovering the faint recombination lines that constrain abundances."
summary: "LVM is mapping the ionised gas of the Milky Way in unprecedented detail. However, the recombination lines that would settle the abundance discrepancy are faint, and there are 55 million spectra. I present a model that fits hundreds of thousands of them at once."
cover:
    image: "title_slide.png"
    alt: "Title slide"
    relative: true
note: "Talk"
editPost:
    URL: "https://asa.astronomy.org.au/events/asa-asm/"
    Text: "Astronomical Society of Australia Meeting 2025"

---

#### Links

- [Slides (PDF)](slides.pdf)
- [Recording](https://youtu.be/KjDQWlm4FiM?si=vhQvRl7uwqW2SMqd)
- [Conference website](https://asa.astronomy.org.au/events/asa-asm/)

---

#### Abstract

The SDSS-V Local Volume Mapper (LVM) survey is delivering unprecedented spectroscopic information about our galaxy, enabling detailed studies of star formation and galaxy evolution across a wide range of spatial scales. LVM is uniquely positioned to map energy and momentum transport, chemical abundances, and the thermal structure of the interstellar medium, down to 0.05 parsecs. Weak emission lines, particularly recombination lines, are essential for robust measurements and for resolving the longstanding "abundance discrepancy problem": the systematic disagreement between methods. But the low signal-to-noise of recombination lines, combined with the sheer scale of LVM's ~55 million spectra, makes reliable measurements challenging. To tackle this, we developed a spatially coherent model that infers emission line properties continuously across the sky, fitting hundreds of thousands of spectra at once. It exploits the fact that nearby spectra tend to be similar, making it especially effective for recovering weak recombination lines. We demonstrate the power of this approach through its first application to the LVM Rosette Nebula dataset, recovering spatially resolved maps of faint line emission. This work also led to the development of a state-of-the-art Gaussian Process framework for scalable inference in multi-dimensional problems.

---

#### Key Slide

![Line ratios slide](key_slide.png)
